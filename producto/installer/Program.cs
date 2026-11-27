using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

namespace PCRemote.Installer;

internal static class Program
{
    private const string FirewallRuleName = "PC Remote Hub (TCP 5050)";
    private const string RunRegistryValueName = "PCRemoteHub";

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    public static void ApplyDarkTitleBar(IntPtr handle)
    {
        if (handle == IntPtr.Zero) return;
        try
        {
            int dark = 1;
            _ = DwmSetWindowAttribute(handle, 20, ref dark, sizeof(int));
            int roundCorners = 2;
            _ = DwmSetWindowAttribute(handle, 33, ref roundCorners, sizeof(int));
            int captionColor = 0x00170E0A;
            _ = DwmSetWindowAttribute(handle, 35, ref captionColor, sizeof(int));
        }
        catch { }
    }

    public static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        int d = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(bounds.X, bounds.Y, d, d, 180, 90);
        path.AddArc(bounds.Right - d, bounds.Y, d, d, 270, 90);
        path.AddArc(bounds.Right - d, bounds.Bottom - d, d, d, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static string GetInstallDir() =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "PCRemoteHub");

    [STAThread]
    private static void Main(string[] args)
    {
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        if (args.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase)))
        {
            RunUninstall();
            return;
        }

        if (args.Any(a => a.Equals("--silent", StringComparison.OrdinalIgnoreCase)))
        {
            PerformInstall(enableFirewall: true, enableAutoStart: true, launchAfter: false, null);
            return;
        }

        Application.Run(new InstallerForm());
    }

    public static void PerformInstall(bool enableFirewall, bool enableAutoStart, bool launchAfter, Action<int, string>? onProgress)
    {
        var installDir = GetInstallDir();
        Directory.CreateDirectory(installDir);

        onProgress?.Invoke(15, "Cerrando instancias previas...");
        foreach (var proc in Process.GetProcessesByName("PCRemote.Agent"))
        {
            try
            {
                proc.Kill(entireProcessTree: true);
                proc.WaitForExit(3000);
            }
            catch { }
            finally { proc.Dispose(); }
        }

        onProgress?.Invoke(45, "Extrayendo PC Remote Hub...");
        var targetExe = Path.Combine(installDir, "PCRemote.Agent.exe");
        using (var resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("PCRemote.Agent.exe.gz"))
        {
            if (resStream is null)
                throw new InvalidOperationException("No se encontró el paquete embebido de PCRemote.Agent.exe.");

            using var gz = new GZipStream(resStream, CompressionMode.Decompress);
            using var outFile = File.Create(targetExe);
            gz.CopyTo(outFile);
        }

        var currentExe = Environment.ProcessPath;
        var uninstallerExe = Path.Combine(installDir, "Uninstall-PCRemoteHub.exe");
        if (!string.IsNullOrWhiteSpace(currentExe) && File.Exists(currentExe) &&
            !string.Equals(currentExe, uninstallerExe, StringComparison.OrdinalIgnoreCase))
        {
            File.Copy(currentExe, uninstallerExe, overwrite: true);
        }

        if (enableFirewall)
        {
            onProgress?.Invoke(72, "Configurando regla en Firewall de Windows...");
            RunNetsh($"advfirewall firewall delete rule name=\"{FirewallRuleName}\"");
            RunNetsh($"advfirewall firewall add rule name=\"{FirewallRuleName}\" dir=in action=allow protocol=TCP localport=5050 profile=private,public");
        }

        onProgress?.Invoke(88, "Configurando accesos directos e inicio...");
        using (var runKey = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
        {
            if (enableAutoStart)
                runKey.SetValue(RunRegistryValueName, $"\"{targetExe}\"");
            else
                runKey.DeleteValue(RunRegistryValueName, false);
        }

        CreateStartMenuShortcuts(targetExe, uninstallerExe);

        var flagPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PCRemoteHub", "qr_shown.flag");
        if (File.Exists(flagPath)) File.Delete(flagPath);

        onProgress?.Invoke(100, "¡Instalación completada! Abriendo ventana QR...");
        if (launchAfter)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"\"{targetExe}\"",
                UseShellExecute = true
            });
        }
    }

    private static void RunUninstall()
    {
        var confirm = MessageBox.Show(
            "¿Deseas desinstalar PC Remote Hub de este equipo?",
            "Desinstalar PC Remote Hub",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);

        if (confirm != DialogResult.Yes) return;

        foreach (var proc in Process.GetProcessesByName("PCRemote.Agent"))
        {
            try
            {
                proc.Kill(entireProcessTree: true);
                proc.WaitForExit(3000);
            }
            catch { }
            finally { proc.Dispose(); }
        }

        RunNetsh($"advfirewall firewall delete rule name=\"{FirewallRuleName}\"");

        using (var runKey = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
        {
            runKey.DeleteValue(RunRegistryValueName, false);
        }

        var startFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.Programs),
            "PC Remote Hub");
        if (Directory.Exists(startFolder))
        {
            try { Directory.Delete(startFolder, recursive: true); } catch { }
        }

        var installDir = GetInstallDir();
        Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c ping 127.0.0.1 -n 3 > nul & rmdir /s /q \"{installDir}\"",
            UseShellExecute = false,
            CreateNoWindow = true
        });

        MessageBox.Show(
            "PC Remote Hub fue desinstalado correctamente.",
            "Desinstalación completada",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private static void CreateStartMenuShortcuts(string targetExe, string uninstallerExe)
    {
        try
        {
            var folder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                "PC Remote Hub");
            Directory.CreateDirectory(folder);

            var psScript =
                $"$s=(New-Object -ComObject WScript.Shell).CreateShortcut('{Path.Combine(folder, "PC Remote Hub.lnk")}');" +
                $"$s.TargetPath='{targetExe}';$s.Arguments='--show-qr';$s.WorkingDirectory='{Path.GetDirectoryName(targetExe)}';$s.Save();" +
                $"$u=(New-Object -ComObject WScript.Shell).CreateShortcut('{Path.Combine(folder, "Desinstalar PC Remote Hub.lnk")}');" +
                $"$u.TargetPath='{uninstallerExe}';$u.Arguments='--uninstall';$u.Save();";

            using var proc = Process.Start(new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"",
                UseShellExecute = false,
                CreateNoWindow = true
            });
            proc?.WaitForExit(5000);
        }
        catch { }
    }

    private static void RunNetsh(string arguments)
    {
        try
        {
            using var proc = Process.Start(new ProcessStartInfo
            {
                FileName = "netsh.exe",
                Arguments = arguments,
                UseShellExecute = false,
                CreateNoWindow = true
            });
            proc?.WaitForExit(5000);
        }
        catch { }
    }
}

internal sealed class InstallerForm : Form
{
    private readonly Icon? _exeIcon;
    private readonly Bitmap? _brandBitmap;
    private readonly ToggleOptionRow _firewallToggle;
    private readonly ToggleOptionRow _autoStartToggle;
    private readonly PrimaryActionButton _installBtn;
    private int _progress = 0;
    private string _statusText = "Instalación rápida en 1 clic • No requiere .NET adicional";
    private bool _installing;

    public InstallerForm()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.UserPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);

        try
        {
            var exePath = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(exePath) && File.Exists(exePath))
            {
                _exeIcon = Icon.ExtractAssociatedIcon(exePath);
                if (_exeIcon != null)
                {
                    Icon = _exeIcon;
                    _brandBitmap = _exeIcon.ToBitmap();
                }
            }
        }
        catch { }

        Text = "Instalador — PC Remote Hub";
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(460, 445);
        BackColor = Color.FromArgb(10, 14, 23);
        ForeColor = Color.FromArgb(241, 245, 249);
        Font = new Font("Segoe UI", 9.5f);

        _firewallToggle = new ToggleOptionRow(
            "Configurar Firewall automáticamente",
            "Habilita la conexión local segura en el puerto TCP 5050",
            defaultChecked: true)
        {
            Bounds = new Rectangle(28, 212, 404, 56)
        };

        _autoStartToggle = new ToggleOptionRow(
            "Iniciar junto con Windows",
            "Se ejecuta en segundo plano junto al reloj al encender el PC",
            defaultChecked: true)
        {
            Bounds = new Rectangle(28, 276, 404, 56)
        };

        _installBtn = new PrimaryActionButton
        {
            Text = "Instalar y Mostrar Código QR",
            Bounds = new Rectangle(28, 376, 404, 48)
        };
        _installBtn.Click += OnInstallClick;

        Controls.AddRange([_firewallToggle, _autoStartToggle, _installBtn]);
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        Program.ApplyDarkTitleBar(Handle);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

        // Top ambient gradient
        using (var topGlow = new LinearGradientBrush(
            new Rectangle(0, 0, Width, 140),
            Color.FromArgb(45, 37, 99, 235),
            Color.FromArgb(0, 10, 14, 23),
            90f))
        {
            g.FillRectangle(topGlow, 0, 0, Width, 140);
        }

        if (_brandBitmap != null)
        {
            g.DrawImage(_brandBitmap, new Rectangle(28, 22, 50, 50));
        }

        using (var titleFont = new Font("Segoe UI Semibold", 16f, FontStyle.Bold))
        using (var whiteBrush = new SolidBrush(Color.White))
        {
            g.DrawString("PC Remote Hub", titleFont, whiteBrush, 90, 20);
        }

        // Version badge
        var verRect = new Rectangle(256, 25, 48, 22);
        using (var verPath = Program.RoundedRect(verRect, 11))
        using (var verFill = new SolidBrush(Color.FromArgb(35, 56, 189, 248)))
        using (var verBorder = new Pen(Color.FromArgb(80, 56, 189, 248), 1f))
        using (var verFont = new Font("Segoe UI Semibold", 8f, FontStyle.Bold))
        using (var verText = new SolidBrush(Color.FromArgb(125, 211, 252)))
        {
            g.FillPath(verFill, verPath);
            g.DrawPath(verBorder, verPath);
            g.DrawString("v1.0", verFont, verText, verRect.X + 11, verRect.Y + 3);
        }

        using (var subFont = new Font("Segoe UI", 9f))
        using (var subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
        {
            g.DrawString("Controla tus programas, energía y navegador desde Android", subFont, subBrush, 91, 50);
        }

        // Feature highlights card
        var featCard = new Rectangle(28, 90, 404, 108);
        using (var cardPath = Program.RoundedRect(featCard, 14))
        using (var cardFill = new SolidBrush(Color.FromArgb(17, 24, 39)))
        using (var cardBorder = new Pen(Color.FromArgb(35, 48, 74), 1f))
        {
            g.FillPath(cardFill, cardPath);
            g.DrawPath(cardBorder, cardPath);
        }

        var features = new[]
        {
            "Detecta automáticamente tus programas e iconos reales",
            "Control universal de Chrome, Edge, Brave, Firefox y Steam",
            "Vinculación rápida por Wi-Fi o escaneando código QR"
        };
        using (var checkFont = new Font("Segoe UI Semibold", 9f, FontStyle.Bold))
        using (var featFont = new Font("Segoe UI", 8.8f))
        using (var checkBrush = new SolidBrush(Color.FromArgb(52, 211, 153)))
        using (var featBrush = new SolidBrush(Color.FromArgb(203, 213, 225)))
        {
            for (int i = 0; i < features.Length; i++)
            {
                int y = featCard.Y + 14 + (i * 28);
                g.DrawString("✓", checkFont, checkBrush, featCard.X + 16, y);
                g.DrawString(features[i], featFont, featBrush, featCard.X + 38, y);
            }
        }

        // Status text & progress bar
        using (var statusFont = new Font("Segoe UI", 8.5f))
        using (var statusBrush = new SolidBrush(_installing ? Color.FromArgb(56, 189, 248) : Color.FromArgb(100, 116, 139)))
        {
            g.DrawString(_statusText, statusFont, statusBrush, 30, 344);
        }

        if (_installing)
        {
            var barBg = new Rectangle(28, 364, 404, 5);
            using var bgBrush = new SolidBrush(Color.FromArgb(30, 41, 59));
            g.FillRectangle(bgBrush, barBg);

            int fillW = (int)(404 * (_progress / 100.0));
            if (fillW > 4)
            {
                var barFg = new Rectangle(28, 364, fillW, 5);
                using var fgBrush = new LinearGradientBrush(barFg, Color.FromArgb(37, 99, 235), Color.FromArgb(52, 211, 153), 0f);
                g.FillRectangle(fgBrush, barFg);
            }
        }
    }

    private async void OnInstallClick(object? sender, EventArgs e)
    {
        if (_installing) return;
        _installing = true;
        _installBtn.Enabled = false;
        _firewallToggle.Enabled = false;
        _autoStartToggle.Enabled = false;
        _installBtn.Text = "Instalando PC Remote Hub...";

        var fw = _firewallToggle.Checked;
        var auto = _autoStartToggle.Checked;

        try
        {
            await Task.Run(() =>
            {
                Program.PerformInstall(fw, auto, launchAfter: true, (pct, msg) =>
                {
                    BeginInvoke(() =>
                    {
                        _progress = pct;
                        _statusText = msg;
                        Invalidate();
                    });
                });
            });

            _installBtn.UseSuccess = true;
            _installBtn.Text = "✓ ¡Instalado con éxito!";
            _installBtn.Invalidate();
            await Task.Delay(750);
            Close();
        }
        catch (Exception ex)
        {
            _installing = false;
            _installBtn.Enabled = true;
            _firewallToggle.Enabled = true;
            _autoStartToggle.Enabled = true;
            _installBtn.Text = "Reintentar instalación";
            _statusText = "Error: " + ex.Message;
            Invalidate();
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _brandBitmap?.Dispose();
            _exeIcon?.Dispose();
        }
        base.Dispose(disposing);
    }
}

internal sealed class ToggleOptionRow : Control
{
    public bool Checked { get; private set; }
    private readonly string _title;
    private readonly string _subtitle;
    private bool _hovered;

    public ToggleOptionRow(string title, string subtitle, bool defaultChecked)
    {
        _title = title;
        _subtitle = subtitle;
        Checked = defaultChecked;

        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.UserPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
    }

    protected override void OnMouseEnter(EventArgs e) { _hovered = true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { _hovered = false; Invalidate(); base.OnMouseLeave(e); }
    protected override void OnClick(EventArgs e)
    {
        if (!Enabled) return;
        Checked = !Checked;
        Invalidate();
        base.OnClick(e);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

        var rect = new Rectangle(0, 0, Width - 1, Height - 1);
        using var path = Program.RoundedRect(rect, 12);
        var bg = _hovered && Enabled ? Color.FromArgb(24, 34, 56) : Color.FromArgb(17, 24, 39);
        var borderCol = Checked ? Color.FromArgb(70, 56, 189, 248) : Color.FromArgb(35, 48, 74);

        using (var fill = new SolidBrush(bg))
        using (var pen = new Pen(borderCol, 1f))
        {
            g.FillPath(fill, path);
            g.DrawPath(pen, path);
        }

        using (var titleFont = new Font("Segoe UI Semibold", 9.3f, FontStyle.Bold))
        using (var subFont = new Font("Segoe UI", 8f))
        using (var titleBrush = new SolidBrush(Color.White))
        using (var subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
        {
            g.DrawString(_title, titleFont, titleBrush, 16, 9);
            g.DrawString(_subtitle, subFont, subBrush, 16, 30);
        }

        // Pill toggle switch on right
        var pillRect = new Rectangle(Width - 58, (Height - 24) / 2, 42, 24);
        using var pillPath = Program.RoundedRect(pillRect, 12);
        using (var pillBrush = new SolidBrush(Checked ? Color.FromArgb(14, 165, 233) : Color.FromArgb(51, 65, 85)))
        {
            g.FillPath(pillBrush, pillPath);
        }

        int knobX = Checked ? pillRect.Right - 21 : pillRect.X + 3;
        using var knobBrush = new SolidBrush(Color.White);
        g.FillEllipse(knobBrush, knobX, pillRect.Y + 3, 18, 18);
    }
}

internal sealed class PrimaryActionButton : Control
{
    public bool UseSuccess { get; set; }
    private bool _hovered;
    private bool _pressed;

    public PrimaryActionButton()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.UserPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
        Font = new Font("Segoe UI Semibold", 10.5f, FontStyle.Bold);
    }

    protected override void OnMouseEnter(EventArgs e) { _hovered = true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { _hovered = false; _pressed = false; Invalidate(); base.OnMouseLeave(e); }
    protected override void OnMouseDown(MouseEventArgs e) { _pressed = true; Invalidate(); base.OnMouseDown(e); }
    protected override void OnMouseUp(MouseEventArgs e) { _pressed = false; Invalidate(); base.OnMouseUp(e); }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

        var rect = new Rectangle(0, 0, Width - 1, Height - 1);
        using var path = Program.RoundedRect(rect, 13);

        if (UseSuccess)
        {
            using var brush = new LinearGradientBrush(rect, Color.FromArgb(16, 185, 129), Color.FromArgb(5, 150, 105), 0f);
            g.FillPath(brush, path);
        }
        else
        {
            var c1 = !Enabled ? Color.FromArgb(30, 58, 138) : _pressed ? Color.FromArgb(29, 78, 216) : _hovered ? Color.FromArgb(59, 130, 246) : Color.FromArgb(37, 99, 235);
            var c2 = !Enabled ? Color.FromArgb(12, 74, 110) : _pressed ? Color.FromArgb(2, 132, 199) : _hovered ? Color.FromArgb(56, 189, 248) : Color.FromArgb(14, 165, 233);
            using var brush = new LinearGradientBrush(rect, c1, c2, 0f);
            g.FillPath(brush, path);
        }

        var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
        using var textBrush = new SolidBrush(Color.White);
        g.DrawString(Text, Font, textBrush, new RectangleF(0, 0, Width, Height), sf);
    }
}
