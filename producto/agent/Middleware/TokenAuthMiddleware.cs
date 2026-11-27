using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using PCRemote.Agent.Services;

namespace PCRemote.Agent.Middleware;

public class TokenAuthMiddleware
{
    private const int MaxFailedAttempts = 8;
    private static readonly TimeSpan WindowDuration = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(1);

    private sealed record AttemptTracker(int Count, DateTime WindowStartUtc, DateTime LockedUntilUtc);

    private readonly ConcurrentDictionary<string, AttemptTracker> _failedByIp = new(StringComparer.Ordinal);
    private readonly RequestDelegate _next;
    private readonly AgentConfigService _config;
    private long _requestCounter;

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

        var clientKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;

        if (Interlocked.Increment(ref _requestCounter) % 128 == 0)
        {
            PruneExpiredTrackers(now);
        }

        if (_failedByIp.TryGetValue(clientKey, out var existing) && existing.LockedUntilUtc > now)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers.RetryAfter = ((int)Math.Ceiling((existing.LockedUntilUtc - now).TotalSeconds)).ToString();
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                success = false,
                message = "Demasiados intentos fallidos. Espera 1 minuto antes de reintentar."
            }));
            return;
        }

        string? token = null;
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader["Bearer ".Length..].Trim();
        }
        else if ((path.StartsWith("/api/apps/icon/", StringComparison.Ordinal) ||
                  (path == "/api/desktop/ws" && context.WebSockets.IsWebSocketRequest)) &&
                 context.Request.Query.TryGetValue("token", out var qToken))
        {
            if (path == "/api/desktop/ws" &&
                context.Request.Headers.TryGetValue("Origin", out var originVal) &&
                !string.IsNullOrWhiteSpace(originVal.ToString()) &&
                !Program.IsTrustedClientOrigin(originVal.ToString()))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
            token = qToken.ToString().Trim();
        }

        if (string.IsNullOrWhiteSpace(token) || !_config.ValidateToken(token))
        {
            RecordFailedAttempt(clientKey, now);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                success = false,
                message = "Token inválido o ausente"
            }));
            return;
        }

        _failedByIp.TryRemove(clientKey, out _);
        await _next(context);
    }

    private void RecordFailedAttempt(string clientKey, DateTime now)
    {
        _failedByIp.AddOrUpdate(
            clientKey,
            _ => new AttemptTracker(1, now, DateTime.MinValue),
            (_, prev) =>
            {
                if (now - prev.WindowStartUtc > WindowDuration)
                {
                    return new AttemptTracker(1, now, DateTime.MinValue);
                }

                var nextCount = prev.Count + 1;
                var lockUntil = nextCount >= MaxFailedAttempts ? now.Add(LockoutDuration) : DateTime.MinValue;
                return new AttemptTracker(nextCount, prev.WindowStartUtc, lockUntil);
            });
    }

    private void PruneExpiredTrackers(DateTime now)
    {
        foreach (var kvp in _failedByIp)
        {
            var expiredWindow = now - kvp.Value.WindowStartUtc > WindowDuration;
            var expiredLock = kvp.Value.LockedUntilUtc <= now;
            if (expiredWindow && expiredLock)
            {
                _failedByIp.TryRemove(kvp.Key, out _);
            }
        }
    }
}
