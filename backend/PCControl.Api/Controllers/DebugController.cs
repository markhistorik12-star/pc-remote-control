using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;

namespace PCControl.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DebugController : ControllerBase
    {
        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            var status = new {
                timestamp = DateTime.UtcNow,
                dotnetVersion = Environment.Version.ToString(),
                os = Environment.OSVersion.Platform,
                memory = GC.GetTotalMemory(false),
                connections = "TODO implement",
                network = new {
                    hostname = Dns.GetHostName(),
                    ipAddresses = NetworkInterface.GetAllNetworkInterfaces()
                        .SelectMany(n => n.GetIPProperties().UnicastAddresses)
                        .Select(a => a.Address.ToString())
                        .ToList()
                }
            };
            return Ok(status);
        }

        [HttpGet("echo/{message}")]
        public IActionResult Echo(string message)
        {
            return Ok(new { 
                received = message, 
                timestamp = DateTime.UtcNow,
                serverTime = DateTime.UtcNow,
                processed = true 
            });
        }

        [HttpGet("test-auth")]
        public IActionResult TestAuth()
        {
            // Test token validation
            var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { error = "No token provided" });
            }
            
            // Log for debugging
            // Console.WriteLine($"[DEBUG] Token received: {token}");
            // Console.WriteLine($"[DEBUG] Token expected: FKALFV");
            
            if (token == "FKALFV")
            {
                return Ok(new { 
                    status = "authenticated",
                    token = token,
                    user = "test-user",
                    timestamp = DateTime.UtcNow
                });
            }
            else
            {
                return Unauthorized(new { error = "Invalid token", received = token });
            }
        }
    }
}