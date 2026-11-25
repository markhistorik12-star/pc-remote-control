using System.Diagnostics;
using System.Runtime.InteropServices;

namespace PCControl.Api.Services;

public interface IBrowserService
{
    (bool Success, string Message) OpenUrlOrSearch(string query);
    (bool Success, string Message) SendAction(string action);
}

public class BrowserService : IBrowserService
{
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const int SW_RESTORE = 9;

    private const byte VK_TAB = 0x09;
    private const byte VK_SHIFT = 0x10;
    private const byte VK_CONTROL = 0x11;
    private const byte VK_MENU = 0x12; // Alt
    private const byte VK_LEFT = 0x25;
    private const byte VK_RIGHT = 0x27;
    private const byte VK_0 = 0x30;
    private const byte VK_T = 0x54;
    private const byte VK_W = 0x57;
    private const byte VK_ADD = 0x6B;
    private const byte VK_SUBTRACT = 0x6D;
    private const byte VK_F5 = 0x74;

    private static readonly string[] BrowserProcessNames = ["brave"];

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public (bool Success, string Message) OpenUrlOrSearch(string query)
    {
        var trimmed = query.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return (false, "Ingresa una URL o búsqueda");
        }

        string url;
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            url = trimmed;
        }
        else if (!trimmed.Contains(' ') && trimmed.Contains('.'))
        {
            url = "https://" + trimmed;
        }
        else
        {
            url = "https://www.google.com/search?q=" + Uri.EscapeDataString(trimmed);
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "brave.exe",
                Arguments = $"\"{url}\"",
                UseShellExecute = true
            });
            return (true, $"Abriendo en Brave: {trimmed}");
        }
        catch (Exception ex)
        {
            return (false, $"No se pudo abrir Brave: {ex.Message}");
        }
    }

    public (bool Success, string Message) SendAction(string action)
    {
        if (!FocusBrowserWindow())
        {
            return (false, "Brave no está abierto");
        }

        var normalized = action.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "reload":
                SendKeyChord(VK_F5);
                return (true, "Página recargada");
            case "next-tab":
                SendKeyChord(VK_CONTROL, VK_TAB);
                return (true, "Siguiente pestaña");
            case "prev-tab":
                SendKeyChord(VK_CONTROL, VK_SHIFT, VK_TAB);
                return (true, "Pestaña anterior");
            case "close-tab":
                SendKeyChord(VK_CONTROL, VK_W);
                return (true, "Pestaña cerrada");
            case "reopen-tab":
                SendKeyChord(VK_CONTROL, VK_SHIFT, VK_T);
                return (true, "Pestaña reabierta");
            case "zoom-in":
                SendKeyChord(VK_CONTROL, VK_ADD);
                return (true, "Zoom aumentado");
            case "zoom-out":
                SendKeyChord(VK_CONTROL, VK_SUBTRACT);
                return (true, "Zoom reducido");
            case "zoom-reset":
                SendKeyChord(VK_CONTROL, VK_0);
                return (true, "Zoom restablecido (100%)");
            case "back":
                SendKeyChord(VK_MENU, VK_LEFT);
                return (true, "Página anterior");
            case "forward":
                SendKeyChord(VK_MENU, VK_RIGHT);
                return (true, "Página siguiente");
            default:
                return (false, $"Acción desconocida: {action}");
        }
    }

    private static bool FocusBrowserWindow()
    {
        foreach (var name in BrowserProcessNames)
        {
            var processes = Process.GetProcessesByName(name);
            try
            {
                foreach (var proc in processes)
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
                foreach (var proc in processes) proc.Dispose();
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
