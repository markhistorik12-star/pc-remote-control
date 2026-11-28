using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

namespace PCControl.Api.Services;

public record MonitorInfoDto(
    int Index,
    string Name,
    int X,
    int Y,
    int Width,
    int Height,
    bool IsPrimary
);

public record DesktopInputCommand(
    string Type,
    int MonitorIndex = 0,
    double? X = null,
    double? Y = null,
    int DeltaX = 0,
    int DeltaY = 0,
    bool Relative = false,
    string? Button = null,
    string? Key = null,
    string? Text = null,
    int? Quality = null,
    int? MaxWidth = null,
    int? Fps = null
);

public sealed class RemoteDesktopService
{
    private const int MaxConcurrentStreams = 2;
    private readonly SemaphoreSlim _streamGate = new(MaxConcurrentStreams, MaxConcurrentStreams);
    private static readonly ImageCodecInfo? JpegEncoder = ImageCodecInfo
        .GetImageEncoders()
        .FirstOrDefault(c => c.FormatID == ImageFormat.Jpeg.Guid);

    private static readonly JsonSerializerOptions WsJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    #region Win32 Display, Cursor & Input Interop

    private const int ENUM_CURRENT_SETTINGS = -1;
    private const int MONITORINFOF_PRIMARY = 0x00000001;
    private const int CURSOR_SHOWING = 0x00000001;

    private const uint INPUT_MOUSE = 0;
    private const uint INPUT_KEYBOARD = 1;

    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    private const uint MOUSEEVENTF_LEFTUP = 0x0004;
    private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    private const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    private const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    private const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    private const uint MOUSEEVENTF_WHEEL = 0x0800;

    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const uint KEYEVENTF_UNICODE = 0x0004;

    private delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct MONITORINFOEXW
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string szDevice;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DEVMODEW
    {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string dmDeviceName;
        public ushort dmSpecVersion;
        public ushort dmDriverVersion;
        public ushort dmSize;
        public ushort dmDriverExtra;
        public uint dmFields;
        public int dmPositionX;
        public int dmPositionY;
        public uint dmDisplayOrientation;
        public uint dmDisplayFixedOutput;
        public short dmColor;
        public short dmDuplex;
        public short dmYResolution;
        public short dmTTOption;
        public short dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string dmFormName;
        public ushort dmLogPixels;
        public uint dmBitsPerPel;
        public uint dmPelsWidth;
        public uint dmPelsHeight;
        public uint dmDisplayFlags;
        public uint dmDisplayFrequency;
        public uint dmICMMethod;
        public uint dmICMIntent;
        public uint dmMediaType;
        public uint dmDitherType;
        public uint dmReserved1;
        public uint dmReserved2;
        public uint dmPanningWidth;
        public uint dmPanningHeight;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct CURSORINFO
    {
        public int cbSize;
        public int flags;
        public IntPtr hCursor;
        public POINT ptScreenPos;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct INPUT
    {
        public uint type;
        public InputUnion U;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct InputUnion
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public int mouseData;
        public uint dwFlags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }

    [DllImport("user32.dll")]
    private static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumProc lpfnEnum, IntPtr dwData);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfoW(IntPtr hMonitor, ref MONITORINFOEXW lpmi);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplaySettingsW(string lpszDeviceName, int iModeNum, ref DEVMODEW lpDevMode);

    [DllImport("user32.dll")]
    private static extern bool GetCursorInfo(ref CURSORINFO pci);

    [DllImport("user32.dll")]
    private static extern bool DrawIcon(IntPtr hDC, int X, int Y, IntPtr hIcon);

    [DllImport("user32.dll")]
    private static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    #endregion

    public IReadOnlyList<MonitorInfoDto> GetMonitors()
    {
        var rawMonitors = new List<(string Device, int X, int Y, int W, int H, bool Primary)>();

        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, (IntPtr hMon, IntPtr _, ref RECT _, IntPtr _) =>
        {
            var mi = new MONITORINFOEXW { cbSize = Marshal.SizeOf<MONITORINFOEXW>() };
            if (GetMonitorInfoW(hMon, ref mi))
            {
                bool primary = (mi.dwFlags & MONITORINFOF_PRIMARY) != 0;
                var dm = new DEVMODEW { dmSize = (ushort)Marshal.SizeOf<DEVMODEW>() };
                if (!string.IsNullOrWhiteSpace(mi.szDevice) &&
                    EnumDisplaySettingsW(mi.szDevice, ENUM_CURRENT_SETTINGS, ref dm) &&
                    dm.dmPelsWidth > 0 && dm.dmPelsHeight > 0)
                {
                    rawMonitors.Add((mi.szDevice, dm.dmPositionX, dm.dmPositionY, (int)dm.dmPelsWidth, (int)dm.dmPelsHeight, primary));
                }
                else
                {
                    int w = Math.Max(1, mi.rcMonitor.Right - mi.rcMonitor.Left);
                    int h = Math.Max(1, mi.rcMonitor.Bottom - mi.rcMonitor.Top);
                    rawMonitors.Add((mi.szDevice, mi.rcMonitor.Left, mi.rcMonitor.Top, w, h, primary));
                }
            }
            return true;
        }, IntPtr.Zero);

        if (rawMonitors.Count == 0)
        {
            var bounds = System.Windows.Forms.Screen.PrimaryScreen?.Bounds ?? new Rectangle(0, 0, 1920, 1080);
            return [new MonitorInfoDto(0, "Pantalla 1", bounds.X, bounds.Y, Math.Max(1, bounds.Width), Math.Max(1, bounds.Height), true)];
        }

        return rawMonitors
            .OrderByDescending(m => m.Primary)
            .ThenBy(m => m.X)
            .Select((m, idx) => new MonitorInfoDto(
                idx,
                m.Primary ? $"Pantalla {idx + 1} (Principal)" : $"Pantalla {idx + 1}",
                m.X,
                m.Y,
                m.W,
                m.H,
                m.Primary))
            .ToList();
    }

    public static (int TargetX, int TargetY) MapNormalizedCoordinates(MonitorInfoDto monitor, double normX, double normY)
    {
        var clampedX = Math.Clamp(normX, 0.0, 1.0);
        var clampedY = Math.Clamp(normY, 0.0, 1.0);
        int targetX = monitor.X + (int)Math.Round(clampedX * Math.Max(0, monitor.Width - 1));
        int targetY = monitor.Y + (int)Math.Round(clampedY * Math.Max(0, monitor.Height - 1));
        return (targetX, targetY);
    }

    public static bool IsAllowedSpecialKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key)) return false;
        return ResolveKeyChord(key) != null;
    }

    public (bool Success, string Message) ExecuteInput(DesktopInputCommand? cmd)
    {
        if (cmd is null || string.IsNullOrWhiteSpace(cmd.Type))
        {
            return (false, "Comando de entrada vacío");
        }

        var type = cmd.Type.Trim().ToLowerInvariant();
        var monitors = GetMonitors();
        var monIdx = Math.Clamp(cmd.MonitorIndex, 0, Math.Max(0, monitors.Count - 1));
        var monitor = monitors[monIdx];

        try
        {
            switch (type)
            {
                case "move":
                    MovePointer(monitor, cmd);
                    return (true, "OK");

                case "click":
                    if (cmd.X.HasValue && cmd.Y.HasValue) MovePointer(monitor, cmd);
                    SendMouseClick(cmd.Button);
                    return (true, "Clic enviado");

                case "double-click":
                    if (cmd.X.HasValue && cmd.Y.HasValue) MovePointer(monitor, cmd);
                    SendMouseClick("left");
                    Thread.Sleep(25);
                    SendMouseClick("left");
                    return (true, "Doble clic enviado");

                case "down":
                    if (cmd.X.HasValue && cmd.Y.HasValue) MovePointer(monitor, cmd);
                    SendMouseButtonState(cmd.Button, isDown: true);
                    return (true, "Botón presionado");

                case "up":
                    if (cmd.X.HasValue && cmd.Y.HasValue) MovePointer(monitor, cmd);
                    SendMouseButtonState(cmd.Button, isDown: false);
                    return (true, "Botón liberado");

                case "scroll":
                    if (cmd.X.HasValue && cmd.Y.HasValue) MovePointer(monitor, cmd);
                    SendMouseWheel(Math.Clamp(cmd.DeltaY, -2400, 2400));
                    return (true, "Scroll enviado");

                case "text":
                    if (string.IsNullOrEmpty(cmd.Text))
                        return (false, "Texto vacío");
                    SendUnicodeText(cmd.Text);
                    return (true, "Texto enviado");

                case "key":
                    var chord = ResolveKeyChord(cmd.Key);
                    if (chord is null)
                        return (false, $"Tecla no permitida: {cmd.Key}");
                    SendVirtualKeyChord(chord);
                    return (true, "Atajo enviado");

                default:
                    return (false, $"Tipo de entrada no soportado: {cmd.Type}");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Error al procesar entrada: {ex.Message}");
        }
    }

    public async Task HandleWebSocketSessionAsync(
        WebSocket ws,
        int initialMonitor,
        int initialQuality,
        int initialMaxWidth,
        int initialFps,
        CancellationToken appStoppingToken)
    {
        if (!await _streamGate.WaitAsync(0, appStoppingToken))
        {
            await ws.CloseAsync(
                WebSocketCloseStatus.PolicyViolation,
                "Límite de sesiones simultáneas alcanzado",
                CancellationToken.None);
            return;
        }

        int monitorIdx = Math.Max(0, initialMonitor);
        int quality = Math.Clamp(initialQuality, 25, 90);
        int maxWidth = Math.Clamp(initialMaxWidth, 480, 1920);
        int fps = Math.Clamp(initialFps, 4, 24);

        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(appStoppingToken);
        var ct = linkedCts.Token;

        try
        {
            // Background task to receive interactive touch/mouse/keyboard/config messages over the same WebSocket
            var receiveTask = Task.Run(async () =>
            {
                var buffer = new byte[4096];
                using var msgStream = new MemoryStream();
                try
                {
                    while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                    {
                        msgStream.SetLength(0);
                        WebSocketReceiveResult result;
                        do
                        {
                            result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                            if (result.MessageType == WebSocketMessageType.Close)
                            {
                                linkedCts.Cancel();
                                return;
                            }
                            msgStream.Write(buffer, 0, result.Count);
                            if (msgStream.Length > 16384) break;
                        } while (!result.EndOfMessage);

                        if (result.MessageType == WebSocketMessageType.Text && msgStream.Length > 0)
                        {
                            var json = Encoding.UTF8.GetString(msgStream.GetBuffer(), 0, (int)msgStream.Length);
                            var cmd = JsonSerializer.Deserialize<DesktopInputCommand>(json, WsJsonOptions);
                            if (cmd != null)
                            {
                                if (string.Equals(cmd.Type, "config", StringComparison.OrdinalIgnoreCase))
                                {
                                    Volatile.Write(ref monitorIdx, Math.Max(0, cmd.MonitorIndex));
                                    if (cmd.Quality.HasValue) Volatile.Write(ref quality, Math.Clamp(cmd.Quality.Value, 25, 90));
                                    if (cmd.MaxWidth.HasValue) Volatile.Write(ref maxWidth, Math.Clamp(cmd.MaxWidth.Value, 480, 1920));
                                    if (cmd.Fps.HasValue) Volatile.Write(ref fps, Math.Clamp(cmd.Fps.Value, 4, 24));
                                }
                                else
                                {
                                    var effectiveCmd = cmd with { MonitorIndex = Volatile.Read(ref monitorIdx) };
                                    ExecuteInput(effectiveCmd);
                                }
                            }
                        }
                    }
                }
                catch
                {
                    linkedCts.Cancel();
                }
            }, ct);

            using var session = new DesktopCaptureSession();
            var sw = new System.Diagnostics.Stopwatch();

            while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                sw.Restart();

                var monitors = GetMonitors();
                var currentMon = monitors[Math.Clamp(Volatile.Read(ref monitorIdx), 0, monitors.Count - 1)];
                var currentQuality = Volatile.Read(ref quality);
                var currentMaxW = Volatile.Read(ref maxWidth);

                if (session.TryCaptureJpeg(currentMon, currentMaxW, currentQuality, out var jpegSegment))
                {
                    await ws.SendAsync(jpegSegment, WebSocketMessageType.Binary, endOfMessage: true, ct);
                }

                var targetIntervalMs = 1000 / Math.Max(4, Volatile.Read(ref fps));
                var remainingMs = targetIntervalMs - (int)sw.ElapsedMilliseconds;
                if (remainingMs > 5)
                {
                    await Task.Delay(remainingMs, ct);
                }
            }

            await receiveTask;
        }
        catch (OperationCanceledException)
        {
            // Normal disconnect
        }
        catch (WebSocketException)
        {
            // Client disconnected abruptly
        }
        finally
        {
            _streamGate.Release();
            if (ws.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                try
                {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Cerrado", CancellationToken.None);
                }
                catch { }
            }
            // Immediately release frame memory back to OS so idle footprint returns to minimal
            Program.TrimMemory();
        }
    }

    private static void MovePointer(MonitorInfoDto monitor, DesktopInputCommand cmd)
    {
        if (cmd.Relative)
        {
            if (GetCursorPos(out var cur))
            {
                SetCursorPos(cur.X + Math.Clamp(cmd.DeltaX, -2000, 2000), cur.Y + Math.Clamp(cmd.DeltaY, -2000, 2000));
            }
            return;
        }

        if (cmd.X.HasValue && cmd.Y.HasValue)
        {
            var (tx, ty) = MapNormalizedCoordinates(monitor, cmd.X.Value, cmd.Y.Value);
            SetCursorPos(tx, ty);
        }
    }

    private static void SendMouseClick(string? button)
    {
        SendMouseButtonState(button, isDown: true);
        SendMouseButtonState(button, isDown: false);
    }

    private static void SendMouseButtonState(string? button, bool isDown)
    {
        var btn = (button ?? "left").Trim().ToLowerInvariant();
        uint flag = (btn, isDown) switch
        {
            ("right", true) => MOUSEEVENTF_RIGHTDOWN,
            ("right", false) => MOUSEEVENTF_RIGHTUP,
            ("middle", true) => MOUSEEVENTF_MIDDLEDOWN,
            ("middle", false) => MOUSEEVENTF_MIDDLEUP,
            (_, true) => MOUSEEVENTF_LEFTDOWN,
            (_, false) => MOUSEEVENTF_LEFTUP
        };

        var input = new INPUT
        {
            type = INPUT_MOUSE,
            U = new InputUnion { mi = new MOUSEINPUT { dwFlags = flag } }
        };
        SendInput(1, [input], Marshal.SizeOf<INPUT>());
    }

    private static void SendMouseWheel(int deltaY)
    {
        if (deltaY == 0) return;
        var input = new INPUT
        {
            type = INPUT_MOUSE,
            U = new InputUnion
            {
                mi = new MOUSEINPUT
                {
                    dwFlags = MOUSEEVENTF_WHEEL,
                    mouseData = deltaY
                }
            }
        };
        SendInput(1, [input], Marshal.SizeOf<INPUT>());
    }

    private static void SendUnicodeText(string text)
    {
        var safe = text.Length > 512 ? text[..512] : text;
        var inputs = new List<INPUT>(safe.Length * 2);

        foreach (char ch in safe)
        {
            if (ch == '\r') continue;
            if (ch == '\n')
            {
                inputs.Add(CreateVkInput(0x0D, false));
                inputs.Add(CreateVkInput(0x0D, true));
                continue;
            }

            inputs.Add(new INPUT
            {
                type = INPUT_KEYBOARD,
                U = new InputUnion
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = ch,
                        dwFlags = KEYEVENTF_UNICODE
                    }
                }
            });
            inputs.Add(new INPUT
            {
                type = INPUT_KEYBOARD,
                U = new InputUnion
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = ch,
                        dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
                    }
                }
            });
        }

        if (inputs.Count > 0)
        {
            var arr = inputs.ToArray();
            SendInput((uint)arr.Length, arr, Marshal.SizeOf<INPUT>());
        }
    }

    private static ushort[]? ResolveKeyChord(string? key)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;
        return key.Trim().ToLowerInvariant() switch
        {
            "enter" => [0x0D],
            "backspace" => [0x08],
            "tab" => [0x09],
            "escape" or "esc" => [0x1B],
            "space" => [0x20],
            "delete" or "del" => [0x2E],
            "left" => [0x25],
            "up" => [0x26],
            "right" => [0x27],
            "down" => [0x28],
            "home" => [0x24],
            "end" => [0x23],
            "pageup" => [0x21],
            "pagedown" => [0x22],
            "win" => [0x5B],
            "show-desktop" => [0x5B, 0x44],   // Win + D
            "alt-tab" => [0x12, 0x09],        // Alt + Tab
            "close-window" => [0x12, 0x73],   // Alt + F4
            "copy" => [0x11, 0x43],           // Ctrl + C
            "paste" => [0x11, 0x56],          // Ctrl + V
            "cut" => [0x11, 0x58],            // Ctrl + X
            "select-all" => [0x11, 0x41],     // Ctrl + A
            "undo" => [0x11, 0x5A],           // Ctrl + Z
            _ => null
        };
    }

    private static void SendVirtualKeyChord(ushort[] keys)
    {
        var inputs = new INPUT[keys.Length * 2];
        int idx = 0;
        for (int i = 0; i < keys.Length; i++)
        {
            inputs[idx++] = CreateVkInput(keys[i], isUp: false);
        }
        for (int i = keys.Length - 1; i >= 0; i--)
        {
            inputs[idx++] = CreateVkInput(keys[i], isUp: true);
        }
        SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<INPUT>());
    }

    private static INPUT CreateVkInput(ushort vk, bool isUp) => new()
    {
        type = INPUT_KEYBOARD,
        U = new InputUnion
        {
            ki = new KEYBDINPUT
            {
                wVk = vk,
                dwFlags = isUp ? KEYEVENTF_KEYUP : 0
            }
        }
    };

    private sealed class DesktopCaptureSession : IDisposable
    {
        private Bitmap? _sourceBmp;
        private Bitmap? _scaledBmp;
        private EncoderParameters? _encoderParams;
        private long _lastQuality = -1;
        private readonly MemoryStream _jpegBuffer = new(131072);

        public bool TryCaptureJpeg(MonitorInfoDto mon, int maxWidth, int quality, out ArraySegment<byte> jpegSegment)
        {
            jpegSegment = default;
            try
            {
                int srcW = Math.Max(1, mon.Width);
                int srcH = Math.Max(1, mon.Height);

                if (_sourceBmp == null || _sourceBmp.Width != srcW || _sourceBmp.Height != srcH)
                {
                    _sourceBmp?.Dispose();
                    _sourceBmp = new Bitmap(srcW, srcH, PixelFormat.Format24bppRgb);
                }

                using (var g = Graphics.FromImage(_sourceBmp))
                {
                    g.CopyFromScreen(mon.X, mon.Y, 0, 0, new Size(srcW, srcH), CopyPixelOperation.SourceCopy);
                    DrawLiveCursor(g, mon);
                }

                Bitmap bmpToEncode = _sourceBmp;
                if (srcW > maxWidth)
                {
                    int outW = maxWidth;
                    int outH = Math.Max(1, (int)Math.Round((double)srcH * maxWidth / srcW));
                    if (_scaledBmp == null || _scaledBmp.Width != outW || _scaledBmp.Height != outH)
                    {
                        _scaledBmp?.Dispose();
                        _scaledBmp = new Bitmap(outW, outH, PixelFormat.Format24bppRgb);
                    }

                    using (var sg = Graphics.FromImage(_scaledBmp))
                    {
                        sg.CompositingMode = CompositingMode.SourceCopy;
                        sg.InterpolationMode = InterpolationMode.Bilinear;
                        sg.PixelOffsetMode = PixelOffsetMode.HighSpeed;
                        sg.DrawImage(_sourceBmp, 0, 0, outW, outH);
                    }
                    bmpToEncode = _scaledBmp;
                }

                _jpegBuffer.Position = 0;
                _jpegBuffer.SetLength(0);

                if (JpegEncoder != null)
                {
                    if (_encoderParams == null || _lastQuality != quality)
                    {
                        _encoderParams?.Dispose();
                        _encoderParams = new EncoderParameters(1);
                        _encoderParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, (long)quality);
                        _lastQuality = quality;
                    }
                    bmpToEncode.Save(_jpegBuffer, JpegEncoder, _encoderParams);
                }
                else
                {
                    bmpToEncode.Save(_jpegBuffer, ImageFormat.Jpeg);
                }

                return _jpegBuffer.TryGetBuffer(out jpegSegment) && jpegSegment.Count > 0;
            }
            catch
            {
                return false;
            }
        }

        private static void DrawLiveCursor(Graphics g, MonitorInfoDto mon)
        {
            var ci = new CURSORINFO { cbSize = Marshal.SizeOf<CURSORINFO>() };
            if (!GetCursorInfo(ref ci) || (ci.flags & CURSOR_SHOWING) == 0 || ci.hCursor == IntPtr.Zero)
                return;

            int relX = ci.ptScreenPos.X - mon.X;
            int relY = ci.ptScreenPos.Y - mon.Y;
            if (relX < -32 || relY < -32 || relX > mon.Width + 32 || relY > mon.Height + 32)
                return;

            IntPtr hdc = g.GetHdc();
            try
            {
                DrawIcon(hdc, relX, relY, ci.hCursor);
            }
            finally
            {
                g.ReleaseHdc(hdc);
            }
        }

        public void Dispose()
        {
            _sourceBmp?.Dispose();
            _scaledBmp?.Dispose();
            _encoderParams?.Dispose();
            _jpegBuffer.Dispose();
        }
    }
}
