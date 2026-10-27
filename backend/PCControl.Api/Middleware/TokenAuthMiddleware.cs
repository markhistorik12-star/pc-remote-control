using System.Text.Json;
using Microsoft.AspNetCore.Http;
using PCControl.Api.Services;

namespace PCControl.Api.Middleware;

public class TokenAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ITokenService _tokenService;

    public TokenAuthMiddleware(RequestDelegate next, ITokenService tokenService)
    {
        _next = next;
        _tokenService = tokenService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        
        // Skip auth for health check or root
        if (path == "/" || path == "/health")
        {
            await _next(context);
            return;
        }

        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            try
            {
                await context.Response.WriteAsync(JsonSerializer.Serialize(new { success = false, message = "Missing or invalid Authorization header" }));
            }
            catch
            {
                // Ignore write errors
            }
            return;
        }

        var token = authHeader["Bearer ".Length..].Trim();
        if (!_tokenService.Validate(token))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            try
            {
                await context.Response.WriteAsync(JsonSerializer.Serialize(new { success = false, message = "Invalid token" }));
            }
            catch
            {
                // Ignore write errors
            }
            return;
        }

        await _next(context);
    }
}