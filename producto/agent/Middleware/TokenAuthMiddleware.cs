using System.Text.Json;
using Microsoft.AspNetCore.Http;
using PCRemote.Agent.Services;

namespace PCRemote.Agent.Middleware;

public class TokenAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly AgentConfigService _config;

    public TokenAuthMiddleware(RequestDelegate next, AgentConfigService config)
    {
        _next = next;
        _config = config;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (HttpMethods.IsOptions(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (path is "/" or "/health" or "/api/discover")
        {
            await _next(context);
            return;
        }

        string? token = null;
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader["Bearer ".Length..].Trim();
        }
        else if (path.StartsWith("/api/apps/icon/") && context.Request.Query.TryGetValue("token", out var qToken))
        {
            token = qToken.ToString().Trim();
        }

        if (string.IsNullOrWhiteSpace(token) || !_config.ValidateToken(token))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { success = false, message = "Token inválido o ausente" }));
            return;
        }

        await _next(context);
    }
}
