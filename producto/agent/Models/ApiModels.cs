namespace PCRemote.Agent.Models;

public record ApiResponse(bool Success, string Message);

public record SavedAppEntry(
    string Id,
    string Name,
    string LaunchTarget,
    string ExePath,
    string Arguments,
    string Kind
);

public record AppCatalogItem(
    string Id,
    string Name,
    string LaunchTarget,
    string ExePath,
    string Arguments,
    string Kind,
    bool Selected
);

public record AgentConfigData
{
    public string Token { get; set; } = "";
    public int Port { get; set; } = 5050;
    public bool InitializedApps { get; set; } = false;
    public List<SavedAppEntry> SelectedApps { get; set; } = [];
    public List<SavedAppEntry> CustomApps { get; set; } = [];
}
