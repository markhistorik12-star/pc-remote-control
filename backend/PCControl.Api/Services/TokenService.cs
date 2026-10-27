using Microsoft.Extensions.Configuration;
using System.Text;
using System.Text.Json;

namespace PCControl.Api.Services;

public interface ITokenService
{
    string GetToken();
    bool Validate(string token);
}

public class TokenService : ITokenService
{
    private readonly string _token;
    private readonly string _configPath;

    public TokenService(IConfiguration configuration)
    {
        _configPath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        
        var tokenFromConfig = configuration["Token"];
        if (!string.IsNullOrEmpty(tokenFromConfig))
        {
            _token = tokenFromConfig;
            return;
        }

        _token = GenerateToken();
        PersistToken(_token);
        Console.WriteLine($"Generated new token: {_token}");
    }

    public string GetToken() => _token;

    public bool Validate(string token) => _token == token;

    private static string GenerateToken()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }

    private void PersistToken(string token)
    {
        var json = File.Exists(_configPath) 
            ? File.ReadAllText(_configPath) 
            : "{}";
        
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true });
        
        writer.WriteStartObject();
        foreach (var prop in root.EnumerateObject())
        {
            if (prop.Name != "Token")
            {
                prop.WriteTo(writer);
            }
        }
        writer.WriteString("Token", token);
        writer.WriteEndObject();
        writer.Flush();
        
        File.WriteAllText(_configPath, Encoding.UTF8.GetString(stream.ToArray()));
    }
}