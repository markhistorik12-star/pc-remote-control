using System;
using System.IO;
using Microsoft.Extensions.Configuration;
using PCControl.Api.Services;

class Program {
    static void Main() {
        var configBuilder = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);
        
        var configuration = configBuilder.Build();
        
        Console.WriteLine("First token service instance:");
        var tokenService1 = new TokenService(configuration);
        Console.WriteLine($"Token: {tokenService1.GetToken()}");
        
        Console.WriteLine("\nSecond token service instance:");
        var tokenService2 = new TokenService(configuration);
        Console.WriteLine($"Token: {tokenService2.GetToken()}");
        
        Console.WriteLine($"\nSame token: {tokenService1.GetToken() == tokenService2.GetToken()}");
    }
}