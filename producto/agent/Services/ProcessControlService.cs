using System.Diagnostics;
using System.Runtime.InteropServices;

namespace PCRemote.Agent.Services;

public class ProcessControlService
{
    private readonly InstalledAppsService _appsService;

    private static readonly HashSet<string> ForceKillProcessNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "steam", "spotify", "discord", "cmd", "powershell", "pwsh", "riotclientservices", "battle.net"
    };

    [DllImport("powrprof.dll", SetLastError = true)]
    private static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);

    public ProcessControlService(InstalledAppsService appsService)
    {
        _appsService = appsService;
    }

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

    public (bool Success, string Message) OpenApp(string idOrName)
    {
        var app = _appsService.FindAppById(idOrName);
        var displayName = app?.Name ?? idOrName;

        try
        {
            if (app?.Kind == "steam")
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "steam://open/main",
                    UseShellExecute = true
                });
                return (true, $"Abriendo {displayName}");
            }

            if (app != null)
            {
                // Prefer direct ExePath when present, otherwise shell:AppsFolder / URI protocol
                if (!string.IsNullOrWhiteSpace(app.ExePath) && File.Exists(app.ExePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = app.ExePath,
                        Arguments = app.Arguments ?? "",
                        UseShellExecute = true
                    });
                    return (true, $"Abriendo {displayName}");
                }

                if (app.LaunchTarget.StartsWith("shell:AppsFolder\\", StringComparison.OrdinalIgnoreCase))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{app.LaunchTarget}\"",
                        UseShellExecute = true
                    });
                    return (true, $"Abriendo {displayName}");
                }

                Process.Start(new ProcessStartInfo
                {
                    FileName = app.LaunchTarget,
                    UseShellExecute = true
                });
                return (true, $"Abriendo {displayName}");
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = idOrName,
                UseShellExecute = true
            });
            return (true, $"Abriendo {displayName}");
        }
        catch (Exception ex)
        {
            return (false, $"No se pudo abrir '{displayName}': {ex.Message}");
        }
    }

    public (bool Success, string Message) CloseApp(string idOrName)
    {
        var app = _appsService.FindAppById(idOrName);
        var displayName = app?.Name ?? idOrName;

        var candidateNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (app != null)
        {
            if (!string.IsNullOrWhiteSpace(app.ExePath))
            {
                if (Path.GetFileName(app.ExePath).Equals("Update.exe", StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(app.Arguments))
                {
                    var procArg = app.Arguments.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .LastOrDefault(p => p.EndsWith(".exe", StringComparison.OrdinalIgnoreCase));
                    if (procArg != null) candidateNames.Add(Path.GetFileNameWithoutExtension(procArg));
                }
                else
                {
                    candidateNames.Add(Path.GetFileNameWithoutExtension(app.ExePath));
                }
            }

            // Well-known UWP / launcher process aliases
            var lowerTitle = app.Name.Trim().ToLowerInvariant();
            switch (lowerTitle)
            {
                case "calculadora" or "calculator":
                    candidateNames.Add("CalculatorApp");
                    candidateNames.Add("Calculator");
                    break;
                case "bloc de notas" or "notepad":
                    candidateNames.Add("Notepad");
                    break;
                case "spotify":
                    candidateNames.Add("Spotify");
                    break;
                case "steam":
                    candidateNames.Add("steam");
                    break;
                case "brave":
                    candidateNames.Add("brave");
                    break;
                case "google chrome":
                    candidateNames.Add("chrome");
                    break;
                case "microsoft edge":
                    candidateNames.Add("msedge");
                    break;
                case "mozilla firefox":
                    candidateNames.Add("firefox");
                    break;
                case "discord":
                    candidateNames.Add("Discord");
                    break;
                case "explorador de archivos":
                    candidateNames.Add("explorer");
                    break;
            }
        }
        else
        {
            candidateNames.Add(Path.GetFileNameWithoutExtension(idOrName));
        }

        if (candidateNames.Contains("explorer") || candidateNames.Contains("control"))
        {
            var closedExplorer = CloseExplorerWindows();
            return closedExplorer
                ? (true, $"Ventanas de {displayName} cerradas")
                : (false, $"No hay ventanas abiertas de {displayName}");
        }

        var matched = candidateNames
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .SelectMany(Process.GetProcessesByName)
            .ToList();

        // Fallback for UWP / Store / Games without ExePath: match by visible MainWindowTitle or ProcessName!
        if (matched.Count == 0 && app != null)
        {
            var searchTitle = app.Name.Trim();
            foreach (var proc in Process.GetProcesses())
            {
                try
                {
                    if (proc.Id == Environment.ProcessId) { proc.Dispose(); continue; }
                    if (proc.ProcessName.Equals("explorer", StringComparison.OrdinalIgnoreCase)) { proc.Dispose(); continue; }

                    bool nameMatch = proc.ProcessName.Equals(searchTitle.Replace(" ", ""), StringComparison.OrdinalIgnoreCase);
                    bool titleMatch = !string.IsNullOrWhiteSpace(proc.MainWindowTitle) &&
                                      proc.MainWindowTitle.Contains(searchTitle, StringComparison.OrdinalIgnoreCase);

                    if (nameMatch || titleMatch)
                    {
                        matched.Add(proc);
                        continue;
                    }
                }
                catch { }
                proc.Dispose();
            }
        }

        if (matched.Count == 0)
        {
            return (false, $"{displayName} no está abierto");
        }

        var forceKill = candidateNames.Any(ForceKillProcessNames.Contains);
        var anyClosed = false;

        if (!forceKill)
        {
            foreach (var proc in matched)
            {
                try
                {
                    if (proc.MainWindowHandle != IntPtr.Zero && proc.CloseMainWindow())
                    {
                        anyClosed = true;
                    }
                }
                catch { }
            }
        }

        if (!anyClosed)
        {
            foreach (var proc in matched)
            {
                try
                {
                    if (!proc.HasExited)
                    {
                        proc.Kill(entireProcessTree: true);
                        anyClosed = true;
                    }
                }
                catch { }
            }
        }

        foreach (var proc in matched) proc.Dispose();

        return anyClosed
            ? (true, $"{displayName} cerrado")
            : (false, $"No se pudo cerrar {displayName}");
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
