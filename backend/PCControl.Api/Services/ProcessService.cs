using System.Diagnostics;
using System.Runtime.InteropServices;

namespace PCControl.Api.Services;

public interface IProcessService
{
    void Shutdown();
    void Restart();
    void LockWorkstation();
    void Suspend();
    bool StartApp(string appName);
    bool CloseApp(string appName);
}

public class ProcessService : IProcessService
{
    [DllImport("powrprof.dll", SetLastError = true)]
    private static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);
    public void Shutdown()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "shutdown.exe",
            Arguments = "/s /f /t 0",
            UseShellExecute = false,
            CreateNoWindow = true
        });
    }

    public void Restart()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "shutdown.exe",
            Arguments = "/r /f /t 0",
            UseShellExecute = false,
            CreateNoWindow = true
        });
    }

    public void LockWorkstation()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "rundll32.exe",
            Arguments = "user32.dll,LockWorkStation",
            UseShellExecute = false,
            CreateNoWindow = true
        });
    }

    public void Suspend()
    {
        _ = Task.Delay(300).ContinueWith(_ => SetSuspendState(false, false, false));
    }

    public bool StartApp(string appName)
    {
        try
        {
            var target = appName.ToLowerInvariant() switch
            {
                "steam" => "steam://open/main",
                "brave" => "brave.exe",
                "spotify" => ResolveSpotifyPath(),
                _ => appName
            };

            Process.Start(new ProcessStartInfo
            {
                FileName = target,
                UseShellExecute = true
            });
            return true;
        }
        catch
        {
            return false;
        }
    }

    public bool CloseApp(string appName)
    {
        try
        {
            var normalized = Path.GetFileNameWithoutExtension(appName).Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(normalized))
            {
                return false;
            }

            if (normalized is "explorer" or "control")
            {
                return CloseExplorerWindows();
            }

            var processNames = normalized switch
            {
                "calc" => new[] { "CalculatorApp", "Calculator", "calc" },
                _ => new[] { Path.GetFileNameWithoutExtension(appName).Trim() }
            };

            var forceKill = normalized is "steam" or "spotify" or "cmd" or "powershell";
            var matched = processNames
                .SelectMany(Process.GetProcessesByName)
                .ToList();

            if (matched.Count == 0)
            {
                return false;
            }

            var anyClosed = false;

            if (!forceKill)
            {
                foreach (var process in matched)
                {
                    try
                    {
                        if (process.MainWindowHandle != IntPtr.Zero && process.CloseMainWindow())
                        {
                            anyClosed = true;
                        }
                    }
                    catch
                    {
                        // Ignore individual process access/exit errors
                    }
                }
            }

            if (!anyClosed)
            {
                foreach (var process in matched)
                {
                    try
                    {
                        if (!process.HasExited)
                        {
                            process.Kill(entireProcessTree: true);
                            anyClosed = true;
                        }
                    }
                    catch
                    {
                        // Ignore individual process access/exit errors
                    }
                }
            }

            foreach (var process in matched)
            {
                process.Dispose();
            }

            return anyClosed;
        }
        catch
        {
            return false;
        }
    }

    private static string ResolveSpotifyPath()
    {
        var storeAlias = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Microsoft", "WindowsApps", "Spotify.exe");
        if (File.Exists(storeAlias)) return storeAlias;

        var win32Path = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "Spotify", "Spotify.exe");
        if (File.Exists(win32Path)) return win32Path;

        return "Spotify.exe";
    }

    private static bool CloseExplorerWindows()
    {
        try
        {
            using var proc = Process.Start(new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -Command \"$w = (New-Object -ComObject Shell.Application).Windows(); $c = $w.Count; foreach ($win in @($w)) { $win.Quit() }; if ($c -gt 0) { exit 0 } else { exit 1 }\"",
                UseShellExecute = false,
                CreateNoWindow = true
            });
            proc?.WaitForExit(5000);
            return proc?.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }
}