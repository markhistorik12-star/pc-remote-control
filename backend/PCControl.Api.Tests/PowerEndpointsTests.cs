using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PCControl.Api.Models;
using PCControl.Api.Services;
using Xunit;

namespace PCControl.Api.Tests;

public class PowerEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public PowerEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var tokenDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ITokenService));
                if (tokenDescriptor != null) services.Remove(tokenDescriptor);
                services.AddSingleton<ITokenService, TestTokenService>();

                var processDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IProcessService));
                if (processDescriptor != null) services.Remove(processDescriptor);
                services.AddSingleton<IProcessService, TestProcessService>();
            });
        });
    }

    [Fact]
    public async Task ShutdownEndpoint_WithValidToken_ReturnsSuccess()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "VALID123");
        
        var response = await client.PostAsJsonAsync("/api/shutdown", new { });
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
    }

    [Fact]
    public async Task RestartEndpoint_WithValidToken_ReturnsSuccess()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "VALID123");
        
        var response = await client.PostAsJsonAsync("/api/restart", new { });
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
    }

    [Fact]
    public async Task LockEndpoint_WithValidToken_ReturnsSuccess()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "VALID123");
        
        var response = await client.PostAsJsonAsync("/api/lock", new { });
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
    }

    [Fact]
    public async Task ShutdownEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/shutdown", new { });
        
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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