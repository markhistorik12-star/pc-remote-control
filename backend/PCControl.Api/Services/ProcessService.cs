using System.Diagnostics;

namespace PCControl.Api.Services;

public interface IProcessService
{
    void Shutdown();
    void Restart();
    void LockWorkstation();
    bool StartApp(string appName);
    bool CloseApp(string appName);
}

public class ProcessService : IProcessService
{
    public void Shutdown()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "shutdown",
            Arguments = "/s /t 0",
            UseShellExecute = true,
            Verb = "runas"
        })?.WaitForExit();
    }

    public void Restart()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "shutdown",
            Arguments = "/r /t 0",
            UseShellExecute = true,
            Verb = "runas"
        })?.WaitForExit();
    }

    public void LockWorkstation()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "rundll32.exe",
            Arguments = "user32.dll,LockWorkStation",
            UseShellExecute = true
        })?.WaitForExit();
    }

    public bool StartApp(string appName)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = appName,
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