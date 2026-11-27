using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PCRemote.Agent.Endpoints;
using PCRemote.Agent.Middleware;
using PCRemote.Agent.Services;
using PCRemote.Agent.Tray;

namespace PCRemote.Agent;

public static class Program
{
    private const string MutexName = @"Local\PCRemoteHub_SingleInstance_Mutex";
    private const string ShowEventName = @"Local\PCRemoteHub_ShowPairing_Event";

    [DllImport("psapi.dll")]
    private static extern int EmptyWorkingSet(IntPtr hwProc);

    [DllImport("user32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    public static void TrimMemory()
    {
        try
        {
            GC.Collect(2, GCCollectionMode.Forced, true, true);
            GC.WaitForPendingFinalizers();
            GC.Collect(2, GCCollectionMode.Forced, true, true);
            EmptyWorkingSet(Process.GetCurrentProcess().Handle);
        }
        catch
        {
            // Ignore
        }
    }

    [STAThread]
    public static void Main(string[] args)
    {
        using var showEvent = new EventWaitHandle(false, EventResetMode.AutoReset, ShowEventName);
        using var mutex = new Mutex(true, MutexName, out var createdNew);

        if (!createdNew)
        {
            // Another instance is already running: signal it to open the QR pairing window and exit
            showEvent.Set();
            return;
        }

        var headless = args.Any(a => a.Equals("--headless", StringComparison.OrdinalIgnoreCase));
        var firstRunFlagPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PCRemoteHub", "qr_shown.flag");
        var isFirstGuiRun = !headless && !File.Exists(firstRunFlagPath);
        if (isFirstGuiRun)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(firstRunFlagPath)!);
            File.WriteAllText(firstRunFlagPath, "1");
        }
        var showQrOnStart = isFirstGuiRun || args.Any(a => a.Equals("--show-qr", StringComparison.OrdinalIgnoreCase));

        try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { }

        var configService = new AgentConfigService();
        var appsService = new InstalledAppsService(configService);
        var processService = new ProcessControlService(appsService);
        var browserService = new UniversalBrowserService(appsService);
        var notepadService = new NotepadService();
        var steamService = new SteamService();
        var desktopService = new RemoteDesktopService();

        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ContentRootPath = AppContext.BaseDirectory
        });
        builder.Logging.ClearProviders();

        builder.Services.AddSingleton(configService);
        builder.Services.AddSingleton(appsService);
        builder.Services.AddSingleton(processService);
        builder.Services.AddSingleton(browserService);
        builder.Services.AddSingleton(notepadService);
        builder.Services.AddSingleton(steamService);
        builder.Services.AddSingleton(desktopService);

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
                policy
                    .SetIsOriginAllowed(IsTrustedClientOrigin)
                    .AllowAnyMethod()
                    .AllowAnyHeader());
        });

        var webApp = builder.Build();
        webApp.UseCors();
        webApp.UseWebSockets(new WebSocketOptions
        {
            KeepAliveInterval = TimeSpan.FromSeconds(20)
        });
        webApp.UseMiddleware<TokenAuthMiddleware>();
        webApp.MapAgentEndpoints();
        webApp.Urls.Add($"http://0.0.0.0:{configService.GetPort()}");

        using var cts = new CancellationTokenSource();

        // Start Kestrel HTTP server in background
        var serverTask = webApp.StartAsync(cts.Token);

        // Background memory optimizer (runs 3s after start and every 5 minutes)
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(3000, cts.Token);
                TrimMemory();
                using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
                while (await timer.WaitForNextTickAsync(cts.Token))
                {
                    appsService.TrimIconCache();
                    TrimMemory();
                }
            }
            catch (OperationCanceledException)
            {
            }
        });

        if (headless)
        {
            serverTask.GetAwaiter().GetResult();
            webApp.WaitForShutdownAsync(cts.Token).GetAwaiter().GetResult();
            return;
        }

        System.Windows.Forms.Application.SetHighDpiMode(System.Windows.Forms.HighDpiMode.PerMonitorV2);
        System.Windows.Forms.Application.EnableVisualStyles();
        System.Windows.Forms.Application.SetCompatibleTextRenderingDefault(false);

        using var trayContext = new TrayApplicationContext(
            configService,
            showEvent,
            cts.Token,
            showQrOnStart,
            () => cts.Cancel());

        System.Windows.Forms.Application.Run(trayContext);

        try
        {
            webApp.StopAsync(TimeSpan.FromSeconds(2)).GetAwaiter().GetResult();
        }
        catch
        {
            // Ignore shutdown timeout
        }
    }

    public static bool IsTrustedClientOrigin(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin)) return false;
        if (origin.Equals("capacitor://localhost", StringComparison.OrdinalIgnoreCase) ||
            origin.Equals("ionic://localhost", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                   uri.Host.Equals("127.0.0.1", StringComparison.Ordinal);
        }

        return false;
    }
}
