using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using PCRemote.Agent.Models;
using PCRemote.Agent.Services;

namespace PCRemote.Agent.Endpoints;

public static class AgentEndpoints
{
    public record AppActionRequest(string Id);
    public record SaveSelectedAppsRequest(List<string> SelectedIds);
    public record AddCustomAppRequest(string Name, string ExePath);
    public record BrowserNavigateRequest(string? BrowserId, string Query);
    public record BrowserActionRequest(string? BrowserId, string Action);
    public record NotepadSaveRequest(string? FileName, string? Content, string? Location, bool? OpenInNotepad);
    public record NotepadPreviewRequest(string? Content);
    public record SteamLaunchRequest(string AccountName);

    public static void MapAgentEndpoints(this WebApplication app)
    {
        app.MapGet("/", () => Results.Ok(new ApiResponse(true, "PC Remote Hub Agent activo")));

        app.MapMethods("/health", ["GET", "HEAD", "POST"], (AgentConfigService cfg) =>
            Results.Ok(new
            {
                success = true,
                message = "Conectado",
                hostname = Environment.MachineName,
                port = cfg.GetPort(),
                steamInstalled = SteamService.GetSteamDir() != null
            }));

        app.MapGet("/api/discover", (AgentConfigService cfg) =>
            Results.Ok(new
            {
                product = "PCRemoteHub",
                version = "1.5.0",
                hostname = Environment.MachineName,
                ip = AgentConfigService.GetPrimaryLanIp(),
                port = cfg.GetPort()
            }));

        app.MapPost("/api/pair/verify", () =>
            Results.Ok(new
            {
                success = true,
                message = $"Vinculado con {Environment.MachineName}",
                hostname = Environment.MachineName
            }));

        // Power endpoints
        app.MapPost("/api/shutdown", (ProcessControlService svc) =>
        {
            svc.Shutdown();
            return Results.Ok(new ApiResponse(true, "Apagando el equipo"));
        });

        app.MapPost("/api/restart", (ProcessControlService svc) =>
        {
            svc.Restart();
            return Results.Ok(new ApiResponse(true, "Reiniciando el equipo"));
        });

        app.MapPost("/api/lock", (ProcessControlService svc) =>
        {
            svc.LockWorkstation();
            return Results.Ok(new ApiResponse(true, "Equipo bloqueado"));
        });

        app.MapPost("/api/suspend", (ProcessControlService svc) =>
        {
            svc.Suspend();
            return Results.Ok(new ApiResponse(true, "Suspendiendo el equipo"));
        });

        // Dynamic Apps & Cached Icon endpoints
        app.MapGet("/api/apps/selected", (InstalledAppsService appsSvc) =>
        {
            var apps = appsSvc.GetSelectedAppsList();
            return Results.Ok(new { success = true, apps });
        });

        app.MapGet("/api/apps/catalog", (HttpContext ctx, InstalledAppsService appsSvc) =>
        {
            var refresh = ctx.Request.Query.ContainsKey("refresh");
            var apps = appsSvc.GetFullCatalog(forceRefresh: refresh);
            return Results.Ok(new { success = true, apps });
        });

        app.MapGet("/api/apps/icon/{id}", (string id, HttpContext ctx, InstalledAppsService appsSvc) =>
        {
            var png = appsSvc.GetIconPngById(id);
            if (png is null || png.Length == 0)
            {
                return Results.NotFound();
            }
            ctx.Response.Headers.CacheControl = "private, max-age=86400";
            return Results.File(png, "image/png");
        });

        app.MapPost("/api/apps/custom", (AddCustomAppRequest req, InstalledAppsService appsSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.ExePath))
                return Results.BadRequest(new ApiResponse(false, "Ingresa la ruta del archivo .exe"));

            var (ok, msg, added) = appsSvc.AddCustomExe(req.Name ?? "", req.ExePath);
            return ok
                ? Results.Ok(new { success = true, message = msg, app = added })
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.MapPost("/api/apps/selected", (
            SaveSelectedAppsRequest req,
            InstalledAppsService appsSvc,
            AgentConfigService cfg) =>
        {
            var wanted = (req.SelectedIds ?? []).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var catalog = appsSvc.GetFullCatalog(forceRefresh: false);
            var toSave = catalog
                .Where(c => wanted.Contains(c.Id))
                .Select(c => new SavedAppEntry(c.Id, c.Name, c.LaunchTarget, c.ExePath, c.Arguments, c.Kind))
                .ToList();

            cfg.SaveSelectedApps(toSave);
            var updated = appsSvc.GetSelectedAppsList();
            return Results.Ok(new { success = true, message = "Lista de aplicaciones actualizada", apps = updated });
        });

        app.MapPost("/api/apps/open", (AppActionRequest req, ProcessControlService svc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Id))
                return Results.BadRequest(new ApiResponse(false, "Aplicación requerida"));

            var (ok, msg) = svc.OpenApp(req.Id);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.NotFound(new ApiResponse(false, msg));
        });

        app.MapPost("/api/apps/close", (AppActionRequest req, ProcessControlService svc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Id))
                return Results.BadRequest(new ApiResponse(false, "Aplicación requerida"));

            var (ok, msg) = svc.CloseApp(req.Id);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.NotFound(new ApiResponse(false, msg));
        });

        // Universal Browser endpoints
        app.MapPost("/api/browser/navigate", (BrowserNavigateRequest req, UniversalBrowserService browserSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Query))
                return Results.BadRequest(new ApiResponse(false, "Ingresa una URL o búsqueda"));

            var (ok, msg) = browserSvc.Navigate(req.BrowserId, req.Query);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.MapPost("/api/browser/action", (BrowserActionRequest req, UniversalBrowserService browserSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Action))
                return Results.BadRequest(new ApiResponse(false, "Acción requerida"));

            var (ok, msg) = browserSvc.SendAction(req.BrowserId, req.Action);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        // Notepad remote editor endpoints
        app.MapPost("/api/notepad/save", (NotepadSaveRequest req, NotepadService notepadSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return Results.BadRequest(new ApiResponse(false, "Escribe contenido antes de guardar"));

            var (ok, msg, savedPath) = notepadSvc.SaveNote(
                req.FileName,
                req.Content,
                req.Location,
                req.OpenInNotepad ?? true);

            return ok
                ? Results.Ok(new { success = true, message = msg, savedPath })
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.MapPost("/api/notepad/preview", (NotepadPreviewRequest req, NotepadService notepadSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return Results.BadRequest(new ApiResponse(false, "Escribe contenido para mostrar en el PC"));

            var (ok, msg) = notepadSvc.WritePreview(req.Content);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.MapPost("/api/notepad/discard", (NotepadService notepadSvc) =>
        {
            var (ok, msg) = notepadSvc.DiscardNote();
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        // Dynamic Steam endpoints
        app.MapGet("/api/steam/accounts", (SteamService steamSvc) =>
        {
            var accounts = steamSvc.GetAccounts();
            return Results.Ok(new { success = true, accounts });
        });

        app.MapPost("/api/steam/launch", (SteamLaunchRequest req, SteamService steamSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.AccountName))
                return Results.BadRequest(new ApiResponse(false, "Cuenta requerida"));

            var (ok, msg) = steamSvc.LaunchWithAccount(req.AccountName);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        // Live Interactive Desktop endpoints
        app.MapGet("/api/desktop/monitors", (RemoteDesktopService desktopSvc) =>
        {
            var monitors = desktopSvc.GetMonitors();
            return Results.Ok(new { success = true, monitors });
        });

        app.MapPost("/api/desktop/input", (DesktopInputCommand cmd, RemoteDesktopService desktopSvc) =>
        {
            var (ok, msg) = desktopSvc.ExecuteInput(cmd);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.Map("/api/desktop/ws", async (
            HttpContext ctx,
            RemoteDesktopService desktopSvc,
            Microsoft.Extensions.Hosting.IHostApplicationLifetime lifetime) =>
        {
            if (!ctx.WebSockets.IsWebSocketRequest)
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            int monitor = int.TryParse(ctx.Request.Query["monitor"], out var m) ? m : 0;
            int quality = int.TryParse(ctx.Request.Query["quality"], out var q) ? q : 60;
            int maxWidth = int.TryParse(ctx.Request.Query["maxWidth"], out var w) ? w : 1280;
            int fps = int.TryParse(ctx.Request.Query["fps"], out var f) ? f : 15;

            using var ws = await ctx.WebSockets.AcceptWebSocketAsync();
            await desktopSvc.HandleWebSocketSessionAsync(ws, monitor, quality, maxWidth, fps, lifetime.ApplicationStopping);
        });
    }
}
