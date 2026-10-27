using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.WindowsServices;
using PCControl.Api.Endpoints;
using PCControl.Api.Middleware;
using PCControl.Api.Models;
using PCControl.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService();

builder.Services.Configure<HostOptions>(options =>
{
    options.ShutdownTimeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IProcessService, ProcessService>();

var app = builder.Build();

app.UseMiddleware<TokenAuthMiddleware>();

app.MapGet("/", () => Results.Ok(new ApiResponse(true, "PC Control API is running")));
app.MapGet("/health", () => Results.Ok(new ApiResponse(true, "Healthy")));

app.MapPowerEndpoints();
app.MapAppEndpoints();

var port = builder.Configuration.GetValue<int>("Port", 5000);
app.Urls.Add($"http://0.0.0.0:{port}");

var tokenService = app.Services.GetRequiredService<ITokenService>();
Console.WriteLine($"PC Control API started on port {port}");
Console.WriteLine($"Token: {tokenService.GetToken()}");

app.Run();

public partial class Program { }