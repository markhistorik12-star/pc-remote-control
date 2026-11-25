using PCControl.Api.Models;
using PCControl.Api.Services;

namespace PCControl.Api.Endpoints;

public static class SteamEndpoints
{
    public record LaunchSteamAccountRequest(string AccountName);

    public static void MapSteamEndpoints(this WebApplication app)
    {
        app.MapGet("/api/steam/accounts", (ISteamService steamService) =>
        {
            var accounts = steamService.GetAccounts();
            return Results.Ok(new { success = true, accounts });
        });

        app.MapPost("/api/steam/launch", (LaunchSteamAccountRequest request, ISteamService steamService) =>
        {
            if (string.IsNullOrWhiteSpace(request.AccountName))
            {
                return Results.BadRequest(new ApiResponse(false, "accountName is required"));
            }

            var (success, message) = steamService.LaunchWithAccount(request.AccountName);
            return success
                ? Results.Ok(new ApiResponse(true, message))
                : Results.BadRequest(new ApiResponse(false, message));
        });
    }
}
