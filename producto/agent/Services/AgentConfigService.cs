using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;
using PCRemote.Agent.Models;

namespace PCRemote.Agent.Services;

public class AgentConfigService
{
    private readonly object _lock = new();
    private readonly string _configDir;
    private readonly string _configPath;
    private AgentConfigData _data;

    public event Action? ConfigChanged;

    public AgentConfigService(string? customConfigDir = null)
    {
        _configDir = string.IsNullOrWhiteSpace(customConfigDir)
            ? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PCRemoteHub")
            : customConfigDir;
        Directory.CreateDirectory(_configDir);
        _configPath = Path.Combine(_configDir, "config.json");
        _data = LoadOrCreate();
    }

    private AgentConfigData LoadOrCreate()
    {
        try
        {
            if (File.Exists(_configPath))
            {
                var json = File.ReadAllText(_configPath);
                var parsed = JsonSerializer.Deserialize<AgentConfigData>(json);
                if (parsed != null)
                {
                    if (string.IsNullOrWhiteSpace(parsed.Token))
                    {
                        parsed.Token = GenerateSecureToken();
                        SaveInternal(parsed);
                    }
                    if (parsed.Port <= 0) parsed.Port = 5050;
                    return parsed;
                }
            }
        }
        catch
        {
            // Recreate clean config if corrupted
        }

        var fresh = new AgentConfigData
        {
            Token = GenerateSecureToken(),
            Port = 5050,
            InitializedApps = false,
            SelectedApps = []
        };
        SaveInternal(fresh);
        return fresh;
    }

    private void SaveInternal(AgentConfigData data)
    {
        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        var tempPath = _configPath + ".tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, _configPath, overwrite: true);
    }

    public string GetToken()
    {
        lock (_lock) return _data.Token;
    }

    public int GetPort()
    {
        lock (_lock) return _data.Port;
    }

    public bool ValidateToken(string candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate)) return false;
        var cleanCandidate = candidate.Trim().ToUpperInvariant();
        string expected;
        lock (_lock)
        {
            expected = (_data.Token ?? "").Trim().ToUpperInvariant();
        }
        if (expected.Length == 0) return false;

        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var candidateBytes = Encoding.UTF8.GetBytes(cleanCandidate);
        return CryptographicOperations.FixedTimeEquals(expectedBytes, candidateBytes);
    }

    public string RegenerateToken()
    {
        string newToken;
        lock (_lock)
        {
            newToken = GenerateSecureToken();
            _data.Token = newToken;
            SaveInternal(_data);
        }
        ConfigChanged?.Invoke();
        return newToken;
    }

    public bool HasInitializedApps()
    {
        lock (_lock) return _data.InitializedApps;
    }

    public IReadOnlyList<SavedAppEntry> GetSelectedApps()
    {
        lock (_lock) return _data.SelectedApps.ToList();
    }

    public IReadOnlyList<SavedAppEntry> GetCustomApps()
    {
        lock (_lock) return (_data.CustomApps ?? []).ToList();
    }

    public void AddCustomApp(SavedAppEntry app)
    {
        lock (_lock)
        {
            _data.CustomApps ??= [];
            _data.CustomApps.RemoveAll(a => a.Id.Equals(app.Id, StringComparison.OrdinalIgnoreCase));
            _data.CustomApps.Add(app);
            if (!_data.SelectedApps.Any(a => a.Id.Equals(app.Id, StringComparison.OrdinalIgnoreCase)))
            {
                _data.SelectedApps.Add(app);
            }
            SaveInternal(_data);
        }
        ConfigChanged?.Invoke();
    }

    public void SaveSelectedApps(IEnumerable<SavedAppEntry> apps)
    {
        lock (_lock)
        {
            _data.SelectedApps = apps.ToList();
            _data.InitializedApps = true;
            SaveInternal(_data);
        }
        ConfigChanged?.Invoke();
    }

    public static bool IsAutoStartEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", false);
            return key?.GetValue("PCRemoteHub") is string val && !string.IsNullOrWhiteSpace(val);
        }
        catch
        {
            return false;
        }
    }

    public static void SetAutoStart(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
            if (enabled)
            {
                var exePath = Environment.ProcessPath ?? Path.Combine(AppContext.BaseDirectory, "PCRemote.Agent.exe");
                key.SetValue("PCRemoteHub", $"\"{exePath}\"");
            }
            else
            {
                key.DeleteValue("PCRemoteHub", false);
            }
        }
        catch
        {
            // Ignore registry errors
        }
    }

    public static string GetPrimaryLanIp()
    {
        try
        {
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(n =>
                    n.OperationalStatus == OperationalStatus.Up &&
                    n.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    !n.Description.Contains("Virtual", StringComparison.OrdinalIgnoreCase) &&
                    !n.Description.Contains("Hyper-V", StringComparison.OrdinalIgnoreCase) &&
                    !n.Description.Contains("WSL", StringComparison.OrdinalIgnoreCase) &&
                    !n.Name.Contains("vEthernet", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(n => n.GetIPProperties().GatewayAddresses.Count > 0)
                .ToList();

            foreach (var nic in interfaces)
            {
                var ipv4 = nic.GetIPProperties().UnicastAddresses
                    .Select(u => u.Address)
                    .FirstOrDefault(a =>
                        a.AddressFamily == AddressFamily.InterNetwork &&
                        !IPAddress.IsLoopback(a) &&
                        !a.ToString().StartsWith("169.254."));
                if (ipv4 != null) return ipv4.ToString();
            }
        }
        catch
        {
            // Fallback below
        }

        return "127.0.0.1";
    }

    private static string GenerateSecureToken()
    {
        // Exclude ambiguous chars like 0/O and 1/I for easy manual typing
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<byte> bytes = stackalloc byte[6];
        RandomNumberGenerator.Fill(bytes);
        var result = new char[6];
        for (int i = 0; i < 6; i++)
        {
            result[i] = chars[bytes[i] % chars.Length];
        }
        return new string(result);
    }
}
