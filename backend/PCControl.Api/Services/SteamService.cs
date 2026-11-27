using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace PCControl.Api.Services;

public record SteamAccount(
    string SteamId,
    string AccountName,
    string PersonaName,
    bool IsAutoLogin,
    long Timestamp
);

public interface ISteamService
{
    IReadOnlyList<SteamAccount> GetAccounts();
    (bool Success, string Message) LaunchWithAccount(string accountName);
}

[System.Runtime.Versioning.SupportedOSPlatform("windows")]
public class SteamService : ISteamService
{
    private static readonly Regex UserBlockRegex = new(
        @"""(?<id>\d{17})""\s*\{(?<body>[^{}]*)\}",
        RegexOptions.Compiled | RegexOptions.Singleline);

    private static readonly Regex KeyValueRegex = new(
        @"""(?<key>[^""]+)""\s+""(?<val>[^""]*)""",
        RegexOptions.Compiled);

    private static string GetSteamDir()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam");
            var path = key?.GetValue("SteamPath") as string;
            if (!string.IsNullOrWhiteSpace(path))
            {
                var normalized = path.Replace('/', Path.DirectorySeparatorChar);
                if (Directory.Exists(normalized)) return normalized;
            }
        }
        catch
        {
            // Fallback to default path
        }

        return @"C:\Program Files (x86)\Steam";
    }

    private static string GetLoginUsersPath() =>
        Path.Combine(GetSteamDir(), "config", "loginusers.vdf");

    public IReadOnlyList<SteamAccount> GetAccounts()
    {
        var vdfPath = GetLoginUsersPath();
        if (!File.Exists(vdfPath))
        {
            return [];
        }

        var content = File.ReadAllText(vdfPath);
        var accounts = new List<SteamAccount>();

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
            {
                continue;
            }

            var personaName = fields.TryGetValue("PersonaName", out var persona) && !string.IsNullOrWhiteSpace(persona)
                ? persona
                : accountName;

            var isAutoLogin =
                (fields.TryGetValue("AutoLogin", out var autoVal) && autoVal == "1") ||
                (fields.TryGetValue("MostRecent", out var recentVal) && recentVal == "1");

            long.TryParse(fields.TryGetValue("timestamp", out var ts) ? ts : "0", out var timestamp);

            accounts.Add(new SteamAccount(steamId, accountName, personaName, isAutoLogin, timestamp));
        }

        return accounts
            .OrderByDescending(a => a.IsAutoLogin)
            .ThenByDescending(a => a.Timestamp)
            .ToList();
    }

    public (bool Success, string Message) LaunchWithAccount(string accountName)
    {
        var trimmed = accountName.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return (false, "Cuenta de Steam requerida");
        }

        var accounts = GetAccounts();
        var targetAccount = accounts.FirstOrDefault(a =>
            a.AccountName.Equals(trimmed, StringComparison.OrdinalIgnoreCase));

        if (targetAccount is null)
        {
            return (false, $"Cuenta '{trimmed}' no encontrada en Steam");
        }

        var steamDir = GetSteamDir();
        var steamExe = Path.Combine(steamDir, "steam.exe");
        var vdfPath = GetLoginUsersPath();

        if (!File.Exists(steamExe))
        {
            return (false, "No se encontró steam.exe");
        }

        try
        {
            // Close running Steam first so it does not overwrite loginusers.vdf on exit
            var runningSteam = Process.GetProcessesByName("steam");
            if (runningSteam.Length > 0)
            {
                foreach (var proc in runningSteam)
                {
                    try
                    {
                        if (!proc.HasExited)
                        {
                            proc.Kill(entireProcessTree: true);
                            proc.WaitForExit(3000);
                        }
                    }
                    catch
                    {
                        // Ignore
                    }
                    finally
                    {
                        proc.Dispose();
                    }
                }
                Thread.Sleep(500);
            }

            // Update loginusers.vdf: set AutoLogin="1" and fresh timestamp only for the chosen account
            if (File.Exists(vdfPath))
            {
                var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                var content = File.ReadAllText(vdfPath);
                var updated = UserBlockRegex.Replace(content, m =>
                {
                    var id = m.Groups["id"].Value;
                    var isTarget = id == targetAccount.SteamId;
                    var block = m.Value;

                    var autoFlag = isTarget ? "1" : "0";
                    if (Regex.IsMatch(block, @"""AutoLogin""\s+""\d"""))
                    {
                        block = Regex.Replace(block, @"""AutoLogin""\s+""\d""", $"\"AutoLogin\"\t\t\"{autoFlag}\"");
                    }
                    if (Regex.IsMatch(block, @"""MostRecent""\s+""\d"""))
                    {
                        block = Regex.Replace(block, @"""MostRecent""\s+""\d""", $"\"MostRecent\"\t\t\"{autoFlag}\"");
                    }
                    if (isTarget)
                    {
                        if (Regex.IsMatch(block, @"""RememberPassword""\s+""\d"""))
                        {
                            block = Regex.Replace(block, @"""RememberPassword""\s+""\d""", "\"RememberPassword\"\t\t\"1\"");
                        }
                        if (Regex.IsMatch(block, @"""timestamp""\s+""\d+"""))
                        {
                            block = Regex.Replace(block, @"""timestamp""\s+""\d+""", $"\"timestamp\"\t\t\"{nowUnix}\"");
                        }
                    }
                    return block;
                });
                File.WriteAllText(vdfPath, updated);
            }

            // Disable Steam's "Ask which account to use each time Steam starts" picker in config.vdf
            var configVdfPath = Path.Combine(steamDir, "config", "config.vdf");
            if (File.Exists(configVdfPath))
            {
                var cfgContent = File.ReadAllText(configVdfPath);
                if (Regex.IsMatch(cfgContent, @"""AlwaysShowUserChooser""\s+""1"""))
                {
                    cfgContent = Regex.Replace(cfgContent, @"""AlwaysShowUserChooser""\s+""1""", "\"AlwaysShowUserChooser\"\t\t\"0\"");
                    File.WriteAllText(configVdfPath, cfgContent);
                }
            }

            // Update Windows Registry so Steam logs straight into the chosen account
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Valve\Steam"))
            {
                key.SetValue("AutoLoginUser", targetAccount.AccountName, RegistryValueKind.String);
                key.SetValue("RememberPassword", 1, RegistryValueKind.DWord);
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = steamExe,
                UseShellExecute = true
            });

            return (true, $"Abriendo Steam como {targetAccount.PersonaName}");
        }
        catch (Exception ex)
        {
            return (false, $"Error al cambiar cuenta de Steam: {ex.Message}");
        }
    }
}
