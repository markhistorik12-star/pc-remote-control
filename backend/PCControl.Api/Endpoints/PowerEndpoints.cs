using PCControl.Api.Models;
using PCControl.Api.Services;

namespace PCControl.Api.Endpoints;

public static class PowerEndpoints
{
    public static void MapPowerEndpoints(this WebApplication app)
    {
        app.MapPost("/api/shutdown", (IProcessService processService) =>
        {
            try
            {
                processService.Shutdown();
                return Results.Ok(new ApiResponse(true, "Shutdown initiated"));
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        app.MapPost("/api/restart", (IProcessService processService) =>
        {
            try
            {
                processService.Restart();
                return Results.Ok(new ApiResponse(true, "Restart initiated"));
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        app.MapPost("/api/lock", (IProcessService processService) =>
        {
            try
            {
                processService.LockWorkstation();
                return Results.Ok(new ApiResponse(true, "Workstation locked"));
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}