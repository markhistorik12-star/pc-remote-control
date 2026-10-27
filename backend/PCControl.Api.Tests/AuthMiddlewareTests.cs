using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PCControl.Api.Services;
using Xunit;

namespace PCControl.Api.Tests;

public class AuthMiddlewareTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthMiddlewareTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var tokenDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ITokenService));
                if (tokenDescriptor != null)
                {
                    services.Remove(tokenDescriptor);
                }
                services.AddSingleton<ITokenService, TestTokenService>();

                var processDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IProcessService));
                if (processDescriptor != null)
                {
                    services.Remove(processDescriptor);
                }
                services.AddSingleton<IProcessService, TestProcessService>();
            });
        });
    }

    [Fact]
    public async Task AuthMiddleware_RejectsMissingToken()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/shutdown", new { });
        
        var content = await response.Content.ReadAsStringAsync();
        System.Console.WriteLine($"Status: {response.StatusCode}, Content: {content}");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task HealthEndpoint_SkipsAuth()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AuthMiddleware_RejectsInvalidToken()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "wrongtoken");
        var response = await client.PostAsJsonAsync("/api/shutdown", new { });
        
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthMiddleware_AllowsValidToken()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "VALID123");
        var response = await client.PostAsJsonAsync("/api/shutdown", new { });
        
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private class TestTokenService : ITokenService
    {
        public string GetToken() => "VALID123";
        public bool Validate(string token) => token == "VALID123";
    }

    private class TestProcessService : IProcessService
    {
        public void Shutdown() { }
        public void Restart() { }
        public void LockWorkstation() { }
        public bool StartApp(string appName) => true;
        public bool CloseApp(string appName) => true;
    }
}