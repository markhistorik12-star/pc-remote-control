using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.WindowsServices;
using PCControl.Api.Endpoints;
using PCControl.Api.Middleware;
using PCControl.Api.Models;
using PCControl.Api.Services;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

[assembly: InternalsVisibleTo("PCControl.Api.Tests")]

namespace PCControl.Api
{
    public class Program
    {
        [DllImport("psapi.dll")]
        private static extern int EmptyWorkingSet(IntPtr hwProc);

        public static void TrimMemory()
        {
            try
            {
                GC.Collect(2, GCCollectionMode.Forced, true, true);
                GC.WaitForPendingFinalizers();
                GC.Collect(2, GCCollectionMode.Forced, true, true);
                EmptyWorkingSet(System.Diagnostics.Process.GetCurrentProcess().Handle);
            }
            catch
            {
                // Ignore
            }
        }

        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions
            {
                Args = args,
                ContentRootPath = AppContext.BaseDirectory
            });
            builder.Logging.ClearProviders();


            builder.Host.UseWindowsService();

            builder.Services.Configure<HostOptions>(options =>
            {
                options.ShutdownTimeout = TimeSpan.FromSeconds(10);
            });

            builder.Services.AddSingleton<ITokenService, TokenService>();
            builder.Services.AddSingleton<IProcessService, ProcessService>();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            var app = builder.Build();

            app.UseCors("AllowFrontend");

            app.UseMiddleware<TokenAuthMiddleware>();

            app.MapGet("/", () => Results.Ok(new ApiResponse(true, "PC Control API is running")));
            app.MapMethods("/health", ["GET", "HEAD", "POST"], () => Results.Ok(new ApiResponse(true, "Healthy")));

            app.MapPowerEndpoints();
            app.MapAppEndpoints();

            // Endpoints de debug
            app.MapGet("/api/debug/health", () => {
                var status = new {
                    timestamp = DateTime.UtcNow,
                    dotnetVersion = Environment.Version.ToString(),
                    os = Environment.OSVersion.Platform,
                    memory = GC.GetTotalMemory(false),
                    hostname = System.Net.Dns.GetHostName(),
                    ipAddresses = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                        .SelectMany(n => n.GetIPProperties().UnicastAddresses)
                        .Select(a => a.Address.ToString())
                        .ToList()
                };
                return Results.Ok(status);
            });

            app.MapGet("/api/debug/echo/{message}", (string message) => {
                return Results.Ok(new { 
                    received = message, 
                    timestamp = DateTime.UtcNow,
                    serverTime = DateTime.UtcNow,
                    processed = true 
                });
            });

            app.MapGet("/api/debug/test-auth", (HttpContext context) => {
                var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
                var token = authHeader?.StartsWith("Bearer ") == true 
                    ? authHeader["Bearer ".Length..].Trim() 
                    : "";
                
                if (string.IsNullOrEmpty(token))
                {
                    return Results.Json(new { error = "No token provided" }, statusCode: 401);
                }
                
                if (token == "FKALFV")
                {
                    return Results.Ok(new { 
                        status = "authenticated",
                        token = token,
                        user = "debug-user",
                        timestamp = DateTime.UtcNow
                    });
                }
                else
                {
                    return Results.Json(new { error = "Invalid token", received = token }, statusCode: 401);
                }
            });

            var port = builder.Configuration.GetValue<int>("Port", 5000);
            app.Urls.Add($"http://0.0.0.0:{port}");

            var tokenService = app.Services.GetRequiredService<ITokenService>();
            // Startup log removed
            Console.WriteLine($"Token: {tokenService.GetToken()}");

            // Optimización de memoria en segundo plano
            app.Lifetime.ApplicationStarted.Register(() =>
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(2000);
                    TrimMemory();
                    
                    // Mantener el uso de memoria mínimo periódicamente cada 5 minutos
                    using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
                    while (await timer.WaitForNextTickAsync())
                    {
                        TrimMemory();
                    }
                });
            });

            app.Run();
        }
    }
}
