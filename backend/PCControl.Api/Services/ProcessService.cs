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
            var processes = Process.GetProcessesByName(Path.GetFileNameWithoutExtension(appName));
            var anyClosed = false;
            foreach (var process in processes)
            {
                if (process.CloseMainWindow())
                {
                    anyClosed = true;
                }
                process.Dispose();
            }
            return anyClosed;
        }
        catch
        {
            return false;
        }
    }
}