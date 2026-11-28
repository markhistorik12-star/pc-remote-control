using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using PCControl.Api.Models;
using PCControl.Api.Services;

namespace PCControl.Api.Endpoints;

public static class DesktopEndpoints
{
    public static void MapDesktopEndpoints(this WebApplication app)
    {
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
            IHostApplicationLifetime lifetime) =>
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
