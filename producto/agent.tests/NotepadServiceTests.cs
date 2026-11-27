using PCRemote.Agent.Services;
using Xunit;

namespace PCRemote.Agent.Tests;

public sealed class NotepadServiceTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly string _desktopDir;
    private readonly string _docsDir;
    private readonly string _draftDir;

    public NotepadServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), "PCRemoteNotepadTests_" + Guid.NewGuid().ToString("N"));
        _desktopDir = Path.Combine(_tempRoot, "Desktop");
        _docsDir = Path.Combine(_tempRoot, "Documents", "Notas PC Remote");
        _draftDir = Path.Combine(_tempRoot, "Drafts");
        Directory.CreateDirectory(_desktopDir);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempRoot))
                Directory.Delete(_tempRoot, recursive: true);
        }
        catch { }
    }

    [Fact]
    public void SaveNote_WritesUtf8TxtFileToDesktopAndDocuments()
    {
        var svc = new NotepadService(_desktopDir, _docsDir, _draftDir, launchGuiProcess: false);

        var content = "¡Hola mundo!\nLista de compras:\n- Café\n- Piña";
        var (ok1, msg1, path1) = svc.SaveNote("lista_compras", content, "desktop", openInNotepad: false);

        Assert.True(ok1);
        Assert.Contains("lista_compras.txt", msg1);
        Assert.NotNull(path1);
        Assert.Equal(Path.Combine(_desktopDir, "lista_compras.txt"), path1);
        Assert.Equal(content, File.ReadAllText(path1!));

        var (ok2, _, path2) = svc.SaveNote("apuntes.txt", "Nota en documentos", "documents", openInNotepad: false);
        Assert.True(ok2);
        Assert.Equal(Path.Combine(_docsDir, "apuntes.txt"), path2);
        Assert.Equal("Nota en documentos", File.ReadAllText(path2!));
    }

    [Theory]
    [InlineData("../../Windows/System32/evil.exe", "evil.txt")]
    [InlineData(@"..\otro\script.bat", "script.txt")]
    [InlineData("CON", "Nota_CON.txt")]
    [InlineData("NUL.txt", "Nota_NUL.txt")]
    [InlineData("mi:archivo*raro?.cmd", "mi_archivo_raro_.txt")]
    public void SanitizeTxtFileName_NeutralizesTraversalExecutableExtensionsAndReservedNames(
        string maliciousInput,
        string expectedSafeName)
    {
        var actual = NotepadService.SanitizeTxtFileName(maliciousInput);
        Assert.Equal(expectedSafeName, actual);

        var svc = new NotepadService(_desktopDir, _docsDir, _draftDir, launchGuiProcess: false);
        var (ok, _, savedPath) = svc.SaveNote(maliciousInput, "contenido seguro", "desktop", openInNotepad: false);

        Assert.True(ok);
        Assert.NotNull(savedPath);
        Assert.StartsWith(Path.GetFullPath(_desktopDir), savedPath!);
        Assert.EndsWith(".txt", savedPath!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void WritePreviewAndDiscardNote_CreateAndRemoveDraftFileCleanly()
    {
        var svc = new NotepadService(_desktopDir, _docsDir, _draftDir, launchGuiProcess: false);
        var draftFile = Path.Combine(_draftDir, "borrador_bloc_de_notas.txt");

        var (previewOk, _) = svc.WritePreview("Borrador temporal desde el celular");
        Assert.True(previewOk);
        Assert.True(File.Exists(draftFile));
        Assert.Equal("Borrador temporal desde el celular", File.ReadAllText(draftFile));

        var (discardOk, _) = svc.DiscardNote();
        Assert.True(discardOk);
        Assert.False(File.Exists(draftFile));
    }
}
