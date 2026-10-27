using Microsoft.Extensions.Configuration;
using PCControl.Api.Services;
using System.IO;
using Xunit;

namespace PCControl.Api.Tests;

public class TokenServiceTests
{
    [Fact]
    public void TokenService_GeneratesAndPersistsToken()
    {
        // Arrange
        var configPath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (File.Exists(configPath)) File.Delete(configPath);

        var inMemorySettings = new Dictionary<string, string>();
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings!)
            .Build();

        // Act
        var service = new TokenService(configuration);
        var token = service.GetToken();

        // Assert
        Assert.NotNull(token);
        Assert.Equal(6, token.Length);
        Assert.True(File.Exists(configPath), "appsettings.json should be created");
        Assert.Contains(token, File.ReadAllText(configPath));

        // Re-instantiate to check persistence
        var configuration2 = new ConfigurationBuilder()
            .AddJsonFile(configPath)
            .Build();
        var service2 = new TokenService(configuration2);
        Assert.Equal(token, service2.GetToken());
    }
}
