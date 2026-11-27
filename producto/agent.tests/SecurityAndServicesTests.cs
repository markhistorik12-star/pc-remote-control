using System.Net;
using Microsoft.AspNetCore.Http;
using PCRemote.Agent;
using PCRemote.Agent.Middleware;
using PCRemote.Agent.Services;
using Xunit;

namespace PCRemote.Agent.Tests;

public sealed class SecurityAndServicesTests : IDisposable
{
    private readonly string _tempDir;

    public SecurityAndServicesTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), "PCRemoteHubTests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempDir))
                Directory.Delete(_tempDir, recursive: true);
        }
        catch { }
    }

    [Fact]
    public void AgentConfigService_GeneratesAndValidatesToken_CaseInsensitiveAndConstantTime()
    {
        var cfg = new AgentConfigService(_tempDir);
        var token = cfg.GetToken();

        Assert.Equal(6, token.Length);
        Assert.True(cfg.ValidateToken(token));
        Assert.True(cfg.ValidateToken(token.ToLowerInvariant()));
        Assert.False(cfg.ValidateToken("WRONG1"));
        Assert.False(cfg.ValidateToken(""));
        Assert.False(cfg.ValidateToken("SHORT"));

        var next = cfg.RegenerateToken();
        Assert.Equal(6, next.Length);
        Assert.True(cfg.ValidateToken(next));
    }

    [Fact]
    public async Task TokenAuthMiddleware_EnforcesAuth_RestrictsQueryToken_AndRateLimitsBruteForce()
    {
        var cfg = new AgentConfigService(_tempDir);
        var validToken = cfg.GetToken();
        var nextCalled = 0;

        var middleware = new TokenAuthMiddleware(_ =>
        {
            nextCalled++;
            return Task.CompletedTask;
        }, cfg);

        // 1. Public discovery endpoint passes without token
        var publicCtx = CreateHttpContext("GET", "/api/discover", "192.168.0.55");
        await middleware.InvokeAsync(publicCtx);
        Assert.Equal(200, publicCtx.Response.StatusCode);
        Assert.Equal(1, nextCalled);

        // 2. Query ?token= is REJECTED on non-icon sensitive endpoints like /api/shutdown
        var queryAbuseCtx = CreateHttpContext("POST", "/api/shutdown", "192.168.0.66", queryToken: validToken);
        await middleware.InvokeAsync(queryAbuseCtx);
        Assert.Equal(StatusCodes.Status401Unauthorized, queryAbuseCtx.Response.StatusCode);

        // 3. Query ?token= is ALLOWED on /api/apps/icon/{id}
        var iconCtx = CreateHttpContext("GET", "/api/apps/icon/abc123", "192.168.0.66", queryToken: validToken);
        await middleware.InvokeAsync(iconCtx);
        Assert.Equal(200, iconCtx.Response.StatusCode);

        // 4. Brute-force protection: 8 failed attempts lock out IP with HTTP 429
        const string attackerIp = "192.168.0.99";
        for (int i = 0; i < 8; i++)
        {
            var badCtx = CreateHttpContext("POST", "/api/pair/verify", attackerIp, bearerToken: "BADTOK");
            await middleware.InvokeAsync(badCtx);
            Assert.Equal(StatusCodes.Status401Unauthorized, badCtx.Response.StatusCode);
        }

        // 9th attempt (even with valid token during lockout!) must receive 429 Too Many Requests
        var lockedCtx = CreateHttpContext("POST", "/api/pair/verify", attackerIp, bearerToken: validToken);
        await middleware.InvokeAsync(lockedCtx);
        Assert.Equal(StatusCodes.Status429TooManyRequests, lockedCtx.Response.StatusCode);
    }

    [Theory]
    [InlineData("https://www.youtube.com", "https://www.youtube.com/")]
    [InlineData("github.com", "https://github.com/")]
    [InlineData("clima en santiago", "https://www.google.com/search?q=clima%20en%20santiago")]
    public void BuildSafeTargetUrl_AllowsValidUrlsAndSearches(string input, string expectedPrefix)
    {
        var safe = UniversalBrowserService.BuildSafeTargetUrl(input);
        Assert.NotNull(safe);
        Assert.StartsWith(expectedPrefix, safe);
        Assert.DoesNotContain("\"", safe);
    }

    [Theory]
    [InlineData("file:///C:/Windows/System32/calc.exe")]
    [InlineData("javascript://alert(1)")]
    [InlineData("ms-msdt:/id PCWDiagnostic")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("https://evil.com\r\n--gpu-launcher=calc")]
    public void BuildSafeTargetUrl_BlocksDangerousSchemesAndControlChars(string malicious)
    {
        var safe = UniversalBrowserService.BuildSafeTargetUrl(malicious);
        Assert.Null(safe);
    }

    [Fact]
    public void BuildSafeTargetUrl_NeutralizesBrowserFlagBreakoutQuotes()
    {
        // Attempted Chromium quote-breakout RCE payload is safely converted into an escaped search query without raw quotes
        var payload = "https://example.com\" --gpu-launcher=\"cmd.exe";
        var safe = UniversalBrowserService.BuildSafeTargetUrl(payload);
        Assert.NotNull(safe);
        Assert.StartsWith("https://www.google.com/search?q=", safe);
        Assert.DoesNotContain("\"", safe);
    }

    [Fact]
    public void ProcessControlService_RejectsUnregisteredAppIds_PreventingArbitraryExecutionOrKill()
    {
        var cfg = new AgentConfigService(_tempDir);
        cfg.SaveSelectedApps([]); // Empty selected apps so no scan is needed for unknown IDs
        var appsSvc = new InstalledAppsService(cfg);
        var procSvc = new ProcessControlService(appsSvc);

        var openRes = procSvc.OpenApp(@"C:\Windows\System32\calc.exe");
        Assert.False(openRes.Success);

        var closeRes = procSvc.CloseApp("lsass");
        Assert.False(closeRes.Success);

        Assert.False(ProcessControlService.IsSafeAllowedLaunchUri("cmd.exe /c calc"));
        Assert.False(ProcessControlService.IsSafeAllowedLaunchUri("steam://rungameid/123;calc"));
        Assert.True(ProcessControlService.IsSafeAllowedLaunchUri("steam://rungameid/730"));
    }

    [Fact]
    public void CorsPolicy_AllowsOnlyLocalhostAndCapacitorOrigins()
    {
        Assert.True(Program.IsTrustedClientOrigin("https://localhost"));
        Assert.True(Program.IsTrustedClientOrigin("http://localhost"));
        Assert.True(Program.IsTrustedClientOrigin("capacitor://localhost"));
        Assert.True(Program.IsTrustedClientOrigin("http://localhost:5173"));
        Assert.True(Program.IsTrustedClientOrigin("http://127.0.0.1:5173"));

        Assert.False(Program.IsTrustedClientOrigin("https://evil.example.com"));
        Assert.False(Program.IsTrustedClientOrigin("http://localhost.evil.com"));
        Assert.False(Program.IsTrustedClientOrigin(null));
    }

    private static DefaultHttpContext CreateHttpContext(
        string method,
        string path,
        string remoteIp,
        string? bearerToken = null,
        string? queryToken = null)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path = path;
        ctx.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
        if (!string.IsNullOrEmpty(bearerToken))
        {
            ctx.Request.Headers.Authorization = $"Bearer {bearerToken}";
        }
        if (!string.IsNullOrEmpty(queryToken))
        {
            ctx.Request.QueryString = new QueryString($"?token={Uri.EscapeDataString(queryToken)}");
        }
        ctx.Response.Body = new MemoryStream();
        return ctx;
    }
}
