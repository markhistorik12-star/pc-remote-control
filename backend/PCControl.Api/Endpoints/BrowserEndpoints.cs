using PCControl.Api.Models;
using PCControl.Api.Services;

namespace PCControl.Api.Endpoints;

public static class BrowserEndpoints
{
    public record BrowserNavigateRequest(string Query);
    public record BrowserActionRequest(string Action);

    public static void MapBrowserEndpoints(this WebApplication app)
    {
        app.MapPost("/api/browser/navigate", (BrowserNavigateRequest request, IBrowserService browserService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return Results.BadRequest(new ApiResponse(false, "query is required"));
            }

            var (success, message) = browserService.OpenUrlOrSearch(request.Query);
            return success
                ? Results.Ok(new ApiResponse(true, message))
                : Results.BadRequest(new ApiResponse(false, message));
        });

        app.MapPost("/api/browser/action", (BrowserActionRequest request, IBrowserService browserService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Action))
            {
                return Results.BadRequest(new ApiResponse(false, "action is required"));
            }

            var (success, message) = browserService.SendAction(request.Action);
            return success
                ? Results.Ok(new ApiResponse(true, message))
                : Results.BadRequest(new ApiResponse(false, message));
        });
    }
}
