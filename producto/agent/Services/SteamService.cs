using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace PCRemote.Agent.Services;

public record SteamAccountInfo(
    string SteamId,
    string AccountName,
    string PersonaName,
    bool IsAutoLogin,
    long Timestamp
);

public class SteamService
{
    private static readonly Regex UserBlockRegex = new(
        @"""(?<id>\d{17})""\s*\{(?<body>[^{}]*)\}",
        RegexOptions.Compiled | RegexOptions.Singleline);

    private static readonly Regex KeyValueRegex = new(
        @"""(?<key>[^""]+)""\s+""(?<val>[^""]*)""",
        RegexOptions.Compiled);

    public static string? GetSteamDir()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam");
            var path = key?.GetValue("SteamPath") as string;
            if (!string.IsNullOrWhiteSpace(path))
            {
                var normalized = path.Replace('/', Path.DirectorySeparatorChar);
                if (File.Exists(Path.Combine(normalized, "steam.exe")))
                {
                    return normalized;
                }
            }
        }
        catch
        {
            // Ignore
        }

        const string defaultDir = @"C:\Program Files (x86)\Steam";
        return File.Exists(Path.Combine(defaultDir, "steam.exe")) ? defaultDir : null;
    }

    public IReadOnlyList<SteamAccountInfo> GetAccounts()
    {
        var steamDir = GetSteamDir();
        if (steamDir is null) return [];

        var vdfPath = Path.Combine(steamDir, "config", "loginusers.vdf");
        if (!File.Exists(vdfPath)) return [];

        var content = File.ReadAllText(vdfPath);
        var accounts = new List<SteamAccountInfo>();

        foreach (Match match in UserBlockRegex.Matches(content))
        {
            var steamId = match.Groups["id"].Value;
            var body = match.Groups["body"].Value;
            var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (Match kv in KeyValueRegex.Matches(body))
            {
                fields[kv.Groups["key"].Value] = kv.Groups["val"].Value;
            }

            if (!fields.TryGetValue("AccountName", out var accountName) || string.IsNullOrWhiteSpace(accountName))
                continue;

            var personaName = fields.TryGetValue("PersonaName", out var persona) && !string.IsNullOrWhiteSpace(persona)
                ? persona
                : accountName;

            var isAutoLogin =
                (fields.TryGetValue("AutoLogin", out var autoVal) && autoVal == "1") ||
                (fields.TryGetValue("MostRecent", out var recentVal) && recentVal == "1");

            long.TryParse(fields.TryGetValue("timestamp", out var ts) ? ts : "0", out var timestamp);
            accounts.Add(new SteamAccountInfo(steamId, accountName, personaName, isAutoLogin, timestamp));
        }

        return accounts
            .OrderByDescending(a => a.IsAutoLogin)
            .ThenByDescending(a => a.Timestamp)
            .ToList();
    }

    public (bool Success, string Message) LaunchWithAccount(string accountName)
    {
        var steamDir = GetSteamDir();
        if (steamDir is null) return (false, "Steam no está instalado en este PC");

        var steamExe = Path.Combine(steamDir, "steam.exe");
        var vdfPath = Path.Combine(steamDir, "config", "loginusers.vdf");
        var configVdfPath = Path.Combine(steamDir, "config", "config.vdf");

        var target = GetAccounts().FirstOrDefault(a =>
            a.AccountName.Equals(accountName.Trim(), StringComparison.OrdinalIgnoreCase));

        if (target is null)
        {
            return (false, $"Cuenta '{accountName}' no encontrada");
        }

        try
        {
            var running = Process.GetProcessesByName("steam");
            if (running.Length > 0)
            {
                foreach (var p in running)
                {
                    try
                    {
                        if (!p.HasExited)
                        {
                            p.Kill(entireProcessTree: true);
                            p.WaitForExit(3000);
                        }
                    }
                    catch { }
                    finally { p.Dispose(); }
                }
                Thread.Sleep(500);
            }

            if (File.Exists(vdfPath))
            {
                var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                var content = File.ReadAllText(vdfPath);
                var updated = UserBlockRegex.Replace(content, m =>
                {
                    var id = m.Groups["id"].Value;
                    var isTarget = id == target.SteamId;
                    var block = m.Value;
                    var autoFlag = isTarget ? "1" : "0";

                    if (Regex.IsMatch(block, @"""AutoLogin""\s+""\d"""))
                        block = Regex.Replace(block, @"""AutoLogin""\s+""\d""", $"\"AutoLogin\"\t\t\"{autoFlag}\"");
                    if (Regex.IsMatch(block, @"""MostRecent""\s+""\d"""))
                        block = Regex.Replace(block, @"""MostRecent""\s+""\d""", $"\"MostRecent\"\t\t\"{autoFlag}\"");

                    if (isTarget)
                    {
                        if (Regex.IsMatch(block, @"""RememberPassword""\s+""\d"""))
                            block = Regex.Replace(block, @"""RememberPassword""\s+""\d""", "\"RememberPassword\"\t\t\"1\"");
                        if (Regex.IsMatch(block, @"""timestamp""\s+""\d+"""))
                            block = Regex.Replace(block, @"""timestamp""\s+""\d+""", $"\"timestamp\"\t\t\"{nowUnix}\"");
                    }
                    return block;
                });
                File.WriteAllText(vdfPath, updated);
            }

            if (File.Exists(configVdfPath))
            {
                var cfg = File.ReadAllText(configVdfPath);
                if (Regex.IsMatch(cfg, @"""AlwaysShowUserChooser""\s+""1"""))
                {
                    cfg = Regex.Replace(cfg, @"""AlwaysShowUserChooser""\s+""1""", "\"AlwaysShowUserChooser\"\t\t\"0\"");
                    File.WriteAllText(configVdfPath, cfg);
                }
            }

            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Valve\Steam"))
            {
                key.SetValue("AutoLoginUser", target.AccountName, RegistryValueKind.String);
                key.SetValue("RememberPassword", 1, RegistryValueKind.DWord);
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = steamExe,
                UseShellExecute = true
            });

            return (true, $"Abriendo Steam como {target.PersonaName}");
        }
        catch (Exception ex)
        {
            return (false, $"Error al iniciar Steam: {ex.Message}");
        }
    }
}
