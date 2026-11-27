using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace PCRemote.Agent.Services;

public class NotepadService
{
    private const int MaxContentLength = 2 * 1024 * 1024; // 2 MB
    private const int SW_RESTORE = 9;

    private static readonly HashSet<string> ReservedDosNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    };

    private readonly string _desktopDir;
    private readonly string _documentsNotesDir;
    private readonly string _draftFilePath;
    private readonly bool _launchGuiProcess;
    private readonly object _procLock = new();
    private int? _draftNotepadPid;

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public NotepadService()
        : this(null, null, null, launchGuiProcess: true)
    {
    }

    public NotepadService(
        string? customDesktopDir,
        string? customDocumentsNotesDir,
        string? customDraftDir,
        bool launchGuiProcess = true)
    {
        _desktopDir = !string.IsNullOrWhiteSpace(customDesktopDir)
            ? customDesktopDir
            : Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);

        _documentsNotesDir = !string.IsNullOrWhiteSpace(customDocumentsNotesDir)
            ? customDocumentsNotesDir
            : Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                "Notas PC Remote");

        var draftDir = !string.IsNullOrWhiteSpace(customDraftDir)
            ? customDraftDir
            : Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PCRemoteHub");

        Directory.CreateDirectory(draftDir);
        _draftFilePath = Path.Combine(draftDir, "borrador_bloc_de_notas.txt");
        _launchGuiProcess = launchGuiProcess;
    }

    public static string SanitizeTxtFileName(string? rawName)
    {
        var trimmed = (rawName ?? "").Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return $"Nota_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt";
        }

        // Normalize slashes and keep only the leaf segment to block directory traversal
        var normalized = trimmed.Replace('/', '\\');
        var leaf = Path.GetFileName(normalized).Trim().Trim('.');

        var invalidChars = Path.GetInvalidFileNameChars();
        var sb = new StringBuilder(leaf.Length);
        foreach (var ch in leaf)
        {
            if (Array.IndexOf(invalidChars, ch) >= 0 || char.IsControl(ch))
            {
                sb.Append('_');
            }
            else
            {
                sb.Append(ch);
            }
        }

        var cleaned = sb.ToString().Trim().Trim('.');
        if (cleaned.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[..^4].Trim().Trim('.');
        }
        else if (Path.HasExtension(cleaned))
        {
            // Force .txt extension by stripping any other extension (.bat, .cmd, .exe, etc.)
            cleaned = Path.GetFileNameWithoutExtension(cleaned).Trim().Trim('.');
        }

        while (cleaned.Contains("..", StringComparison.Ordinal))
        {
            cleaned = cleaned.Replace("..", "_");
        }

        if (string.IsNullOrWhiteSpace(cleaned))
        {
            return $"Nota_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt";
        }

        if (ReservedDosNames.Contains(cleaned))
        {
            cleaned = "Nota_" + cleaned;
        }

        if (cleaned.Length > 80)
        {
            cleaned = cleaned[..80].Trim().Trim('.');
        }

        return cleaned + ".txt";
    }

    public (bool Success, string Message, string? SavedPath) SaveNote(
        string? fileName,
        string? content,
        string? location = "desktop",
        bool openInNotepad = true)
    {
        var text = content ?? "";
        if (text.Length > MaxContentLength)
        {
            return (false, "El texto supera el tamaño máximo permitido (2 MB).", null);
        }

        var useDocs = string.Equals(location?.Trim(), "documents", StringComparison.OrdinalIgnoreCase);
        var baseDir = useDocs ? _documentsNotesDir : _desktopDir;

        try
        {
            Directory.CreateDirectory(baseDir);
            var fullBaseDir = Path.GetFullPath(baseDir);
            if (!fullBaseDir.EndsWith(Path.DirectorySeparatorChar))
            {
                fullBaseDir += Path.DirectorySeparatorChar;
            }

            var safeFileName = SanitizeTxtFileName(fileName);
            var fullPath = Path.GetFullPath(Path.Combine(fullBaseDir, safeFileName));

            if (!fullPath.StartsWith(fullBaseDir, StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Nombre de archivo no permitido.", null);
            }

            File.WriteAllText(fullPath, text, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));

            CleanupDraftFile();
            CloseTrackedDraftProcess();

            if (_launchGuiProcess && openInNotepad)
            {
                LaunchNotepadWithFile(fullPath, trackAsDraft: false);
            }

            var folderLabel = useDocs ? "Documentos\\Notas PC Remote" : "Escritorio";
            return (true, $"Guardado en {folderLabel}: {safeFileName}", fullPath);
        }
        catch (Exception ex)
        {
            return (false, $"No se pudo guardar el archivo: {ex.Message}", null);
        }
    }

    public (bool Success, string Message) WritePreview(string? content)
    {
        var text = content ?? "";
        if (text.Length > MaxContentLength)
        {
            return (false, "El texto supera el tamaño máximo permitido (2 MB).");
        }

        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_draftFilePath)!);
            File.WriteAllText(_draftFilePath, text, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));

            if (_launchGuiProcess)
            {
                CloseTrackedDraftProcess();
                LaunchNotepadWithFile(_draftFilePath, trackAsDraft: true);
            }

            return (true, "Borrador abierto en el Bloc de notas del PC");
        }
        catch (Exception ex)
        {
            return (false, $"No se pudo abrir el Bloc de notas: {ex.Message}");
        }
    }

    public (bool Success, string Message) DiscardNote()
    {
        try
        {
            CleanupDraftFile();

            if (_launchGuiProcess)
            {
                CloseTrackedDraftProcess();
                CloseAllNotepadProcesses();
            }

            return (true, "Nota descartada y Bloc de notas cerrado");
        }
        catch (Exception ex)
        {
            return (false, $"Error al descartar la nota: {ex.Message}");
        }
    }

    private void CleanupDraftFile()
    {
        try
        {
            if (File.Exists(_draftFilePath))
            {
                File.Delete(_draftFilePath);
            }
        }
        catch
        {
            // Ignore file lock / delete errors
        }
    }

    private void LaunchNotepadWithFile(string filePath, bool trackAsDraft)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "notepad.exe",
            UseShellExecute = false
        };
        psi.ArgumentList.Add(filePath);

        var proc = Process.Start(psi);
        if (proc is null) return;

        if (trackAsDraft)
        {
            lock (_procLock)
            {
                _draftNotepadPid = proc.Id;
            }
        }

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(220);
                proc.Refresh();
                if (!proc.HasExited && proc.MainWindowHandle != IntPtr.Zero)
                {
                    if (IsIconic(proc.MainWindowHandle))
                    {
                        ShowWindow(proc.MainWindowHandle, SW_RESTORE);
                    }
                    SetForegroundWindow(proc.MainWindowHandle);
                }
            }
            catch
            {
                // Ignore window focus errors
            }
            finally
            {
                proc.Dispose();
            }
        });
    }

    private void CloseTrackedDraftProcess()
    {
        int? pid;
        lock (_procLock)
        {
            pid = _draftNotepadPid;
            _draftNotepadPid = null;
        }

        if (pid is null) return;

        try
        {
            using var proc = Process.GetProcessById(pid.Value);
            if (!proc.HasExited && proc.ProcessName.Contains("notepad", StringComparison.OrdinalIgnoreCase))
            {
                proc.Kill(entireProcessTree: true);
            }
        }
        catch
        {
            // Already exited
        }
    }

    private static void CloseAllNotepadProcesses()
    {
        var procs = Process.GetProcessesByName("notepad");
        try
        {
            foreach (var proc in procs)
            {
                try
                {
                    if (!proc.HasExited)
                    {
                        proc.Kill(entireProcessTree: true);
                    }
                }
                catch
                {
                    // Ignore access errors
                }
            }
        }
        finally
        {
            foreach (var proc in procs) proc.Dispose();
        }
    }
}
