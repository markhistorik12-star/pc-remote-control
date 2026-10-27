using PCControl.Api.Models;
using PCControl.Api.Services;

namespace PCControl.Api.Endpoints;

public static class AppEndpoints
{
    public record OpenAppRequest(string AppName);
    public record CloseAppRequest(string AppName);

    public static void MapAppEndpoints(this WebApplication app)
    {
        app.MapPost("/api/apps/open", (OpenAppRequest request, IProcessService processService) =>
        {
            if (string.IsNullOrWhiteSpace(request.AppName))
            {
                return Results.BadRequest(new ApiResponse(false, "appName is required"));
            }

            try
            {
                var success = processService.StartApp(request.AppName);
                if (success)
                {
                    return Results.Ok(new ApiResponse(true, $"Application '{request.AppName}' started"));
                }
                return Results.NotFound(new ApiResponse(false, $"Application '{request.AppName}' not found"));
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });

        app.MapPost("/api/apps/close", (CloseAppRequest request, IProcessService processService) =>
        {
            if (string.IsNullOrWhiteSpace(request.AppName))
            {
                return Results.BadRequest(new ApiResponse(false, "appName is required"));
            }

            try
            {
                var success = processService.CloseApp(request.AppName);
                if (success)
                {
                    return Results.Ok(new ApiResponse(true, $"Application '{request.AppName}' closed"));
                }
                return Results.NotFound(new ApiResponse(false, $"Application '{request.AppName}' not found"));
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}