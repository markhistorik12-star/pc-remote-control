using PCControl.Api.Models;
using PCControl.Api.Services;

namespace PCControl.Api.Endpoints;

public static class NotepadEndpoints
{
    public record NotepadSaveRequest(string? FileName, string? Content, string? Location, bool? OpenInNotepad);
    public record NotepadPreviewRequest(string? Content);

    public static void MapNotepadEndpoints(this WebApplication app)
    {
        app.MapPost("/api/notepad/save", (NotepadSaveRequest req, INotepadService notepadSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return Results.BadRequest(new ApiResponse(false, "Escribe contenido antes de guardar"));

            var (ok, msg, savedPath) = notepadSvc.SaveNote(
                req.FileName,
                req.Content,
                req.Location,
                req.OpenInNotepad ?? true);

            return ok
                ? Results.Ok(new { success = true, message = msg, savedPath })
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.MapPost("/api/notepad/preview", (NotepadPreviewRequest req, INotepadService notepadSvc) =>
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return Results.BadRequest(new ApiResponse(false, "Escribe contenido para mostrar en el PC"));

            var (ok, msg) = notepadSvc.WritePreview(req.Content);
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });

        app.MapPost("/api/notepad/discard", (INotepadService notepadSvc) =>
        {
            var (ok, msg) = notepadSvc.DiscardNote();
            return ok
                ? Results.Ok(new ApiResponse(true, msg))
                : Results.BadRequest(new ApiResponse(false, msg));
        });
    }
}
