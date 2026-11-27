using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace PCRemote.Agent.Services;

public class UniversalBrowserService
{
    private readonly InstalledAppsService _appsService;

    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const int SW_RESTORE = 9;

    private const byte VK_TAB = 0x09;
    private const byte VK_SHIFT = 0x10;
    private const byte VK_CONTROL = 0x11;
    private const byte VK_MENU = 0x12;
    private const byte VK_LEFT = 0x25;
    private const byte VK_RIGHT = 0x27;
    private const byte VK_0 = 0x30;
    private const byte VK_T = 0x54;
    private const byte VK_W = 0x57;
    private const byte VK_ADD = 0x6B;
    private const byte VK_SUBTRACT = 0x6D;
    private const byte VK_F5 = 0x74;

    private static readonly string[] FallbackBrowsers = ["chrome", "msedge", "brave", "firefox", "opera", "vivaldi"];

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public UniversalBrowserService(InstalledAppsService appsService)
    {
        _appsService = appsService;
    }

    private static string? InferBrowserProcessName(Models.SavedAppEntry? browserApp)
    {
        if (browserApp is null) return null;
        if (!string.IsNullOrWhiteSpace(browserApp.ExePath))
            return Path.GetFileNameWithoutExtension(browserApp.ExePath);

        return browserApp.Name.Trim().ToLowerInvariant() switch
        {
            "brave" => "brave",
            "google chrome" or "chrome" => "chrome",
            "microsoft edge" or "edge" => "msedge",
            "mozilla firefox" or "firefox" => "firefox",
            "opera" or "opera gx" => "opera",
            "vivaldi" => "vivaldi",
            _ => null
        };
    }

    public static string? BuildSafeTargetUrl(string? query)
    {
        var trimmed = (query ?? "").Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.Length > 2048)
        {
            return null;
        }

        // Reject embedded quotes or control chars that could tamper with browser CLI arguments
        if (trimmed.Any(c => c is '"' or '\'' or '\r' or '\n' or '\0'))
        {
            // Treat as a Google search query instead of a raw URL if it contains quotes
            if (!trimmed.Any(c => c is '\r' or '\n' or '\0'))
            {
                return "https://www.google.com/search?q=" + Uri.EscapeDataString(trimmed);
            }
            return null;
        }

        string candidate;
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            candidate = trimmed;
        }
        else if (Regex.IsMatch(trimmed, @"^[a-zA-Z][a-zA-Z0-9+.-]*:(?!\d+($|/))"))
        {
            // Block any non-HTTP/HTTPS URI scheme (file:, javascript:, ms-msdt:, data:, etc.)
            return null;
        }
        else if (!trimmed.Contains(' ') && (trimmed.Contains('.') || Regex.IsMatch(trimmed, @"^localhost:\d+(/.*)?$", RegexOptions.IgnoreCase)) && !trimmed.StartsWith('-'))
        {
            candidate = "https://" + trimmed;
        }
        else
        {
            return "https://www.google.com/search?q=" + Uri.EscapeDataString(trimmed);
        }

        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var parsed) ||
            (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps) ||
            string.IsNullOrWhiteSpace(parsed.Host))
        {
            return null;
        }

        return parsed.AbsoluteUri;
    }

    public (bool Success, string Message) Navigate(string? browserId, string query)
    {
        var trimmed = (query ?? "").Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return (false, "Ingresa una URL o búsqueda");
        }

        var safeUrl = BuildSafeTargetUrl(trimmed);
        if (safeUrl is null)
        {
            return (false, "La dirección ingresada no es una URL HTTP/HTTPS válida");
        }

        var browserApp = !string.IsNullOrWhiteSpace(browserId)
            ? _appsService.FindAppById(browserId)
            : null;

        try
        {
            if (browserApp != null && !string.IsNullOrWhiteSpace(browserApp.ExePath) && File.Exists(browserApp.ExePath))
            {
                var psi = new ProcessStartInfo
                {
                    FileName = browserApp.ExePath,
                    UseShellExecute = false
                };
                psi.ArgumentList.Add(safeUrl);
                Process.Start(psi);
                return (true, $"Abriendo en {browserApp.Name}: {trimmed}");
            }

            if (browserApp != null && InferBrowserProcessName(browserApp) is string procName)
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = $"{procName}.exe",
                    Arguments = $"\"{safeUrl.Replace("\"", "%22")}\"",
                    UseShellExecute = true
                });
                return (true, $"Abriendo en {browserApp.Name}: {trimmed}");
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = safeUrl,
                UseShellExecute = true
            });
            return (true, $"Abriendo {trimmed}");
        }
        catch (Exception ex)
        {
            return (false, $"Error al abrir el navegador: {ex.Message}");
        }
    }

    public (bool Success, string Message) SendAction(string? browserId, string action)
    {
        var browserApp = !string.IsNullOrWhiteSpace(browserId)
            ? _appsService.FindAppById(browserId)
            : null;

        var preferredProcName = InferBrowserProcessName(browserApp);

        if (!FocusBrowserWindow(preferredProcName))
        {
            var label = browserApp?.Name ?? "El navegador";
            return (false, $"{label} no está abierto");
        }

        return action.Trim().ToLowerInvariant() switch
        {
            "reload" => Execute(VK_F5, "Página recargada"),
            "next-tab" => Execute([VK_CONTROL, VK_TAB], "Siguiente pestaña"),
            "prev-tab" => Execute([VK_CONTROL, VK_SHIFT, VK_TAB], "Pestaña anterior"),
            "close-tab" => Execute([VK_CONTROL, VK_W], "Pestaña cerrada"),
            "reopen-tab" => Execute([VK_CONTROL, VK_SHIFT, VK_T], "Pestaña reabierta"),
            "zoom-in" => Execute([VK_CONTROL, VK_ADD], "Zoom aumentado"),
            "zoom-out" => Execute([VK_CONTROL, VK_SUBTRACT], "Zoom reducido"),
            "zoom-reset" => Execute([VK_CONTROL, VK_0], "Zoom 100%"),
            "back" => Execute([VK_MENU, VK_LEFT], "Atrás"),
            "forward" => Execute([VK_MENU, VK_RIGHT], "Adelante"),
            _ => (false, $"Acción no reconocida: {action}")
        };
    }

    private static (bool, string) Execute(byte singleKey, string msg)
    {
        SendKeyChord(singleKey);
        return (true, msg);
    }

    private static (bool, string) Execute(byte[] keys, string msg)
    {
        SendKeyChord(keys);
        return (true, msg);
    }

    private static bool FocusBrowserWindow(string? preferredProcess)
    {
        var candidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(preferredProcess))
        {
            candidates.Add(preferredProcess);
        }
        foreach (var fb in FallbackBrowsers)
        {
            if (!candidates.Contains(fb, StringComparer.OrdinalIgnoreCase))
                candidates.Add(fb);
        }

        foreach (var name in candidates)
        {
            var procs = Process.GetProcessesByName(name);
            try
            {
                foreach (var proc in procs)
                {
                    if (proc.MainWindowHandle != IntPtr.Zero)
                    {
                        if (IsIconic(proc.MainWindowHandle))
                        {
                            ShowWindow(proc.MainWindowHandle, SW_RESTORE);
                        }
                        SetForegroundWindow(proc.MainWindowHandle);
                        Thread.Sleep(60);
                        return true;
                    }
                }
            }
            finally
            {
                foreach (var proc in procs) proc.Dispose();
            }
        }
        return false;
    }

    private static void SendKeyChord(params byte[] keys)
    {
        foreach (var key in keys)
        {
            keybd_event(key, 0, 0, UIntPtr.Zero);
        }
        Thread.Sleep(25);
        for (int i = keys.Length - 1; i >= 0; i--)
        {
            keybd_event(keys[i], 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }
    }
}
