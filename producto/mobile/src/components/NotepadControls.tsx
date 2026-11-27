import { useState } from 'react';
import { getAppIconUrl, type AppItem, type NotepadSaveLocation } from '../services/api';
import AppAvatar from './AppAvatar';
import { XIcon, CheckIcon, TrashIcon } from './ui/Icons';

interface NotepadControlsProps {
  isOpen: boolean;
  notepadApp: AppItem | null;
  ip: string;
  port: number;
  token: string;
  disabled?: boolean;
  onClose: () => void;
  onSave: (payload: {
    fileName: string;
    content: string;
    location: NotepadSaveLocation;
    openInNotepad: boolean;
  }) => Promise<boolean>;
  onPreview: (content: string) => Promise<boolean>;
  onDiscard: () => Promise<boolean>;
}

export default function NotepadControls({
  isOpen,
  notepadApp,
  ip,
  port,
  token,
  disabled,
  onClose,
  onSave,
  onPreview,
  onDiscard,
}: NotepadControlsProps) {
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<NotepadSaveLocation>('desktop');
  const [openInNotepad, setOpenInNotepad] = useState(true);
  const [busy, setBusy] = useState<'save' | 'preview' | 'discard' | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!isOpen) return null;

  const appName = notepadApp?.name || 'Bloc de notas';
  const iconUrl =
    notepadApp && ip && token ? getAppIconUrl(ip, port, token, notepadApp.id) : null;

  const lineCount = content ? content.split('\n').length : 0;

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || busy) return;

    setBusy('save');
    const ok = await onSave({
      fileName: fileName.trim(),
      content,
      location,
      openInNotepad,
    });
    setBusy(null);

    if (ok) {
      setConfirmDiscard(false);
    }
  };

  const handlePreviewClick = async () => {
    if (disabled || busy) return;
    setBusy('preview');
    await onPreview(content);
    setBusy(null);
  };

  const executeDiscard = async () => {
    if (disabled || busy) return;
    setBusy('discard');
    await onDiscard();
    setBusy(null);
    setFileName('');
    setContent('');
    setConfirmDiscard(false);
    onClose();
  };

  const handleDiscardClick = () => {
    if (content.trim().length > 0 && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    void executeDiscard();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={() => {
        setConfirmDiscard(false);
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notepad-controls-title"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <AppAvatar name={appName} iconUrl={iconUrl} sizeClass="w-10 h-10" />
            <div className="min-w-0">
              <h2
                id="notepad-controls-title"
                className="text-base font-semibold text-foreground truncate"
              >
                {appName}
              </h2>
              <p className="text-xs text-muted-foreground">
                Escribe, guarda o descarta tu nota en el PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmDiscard(false);
              onClose();
            }}
            aria-label="Cerrar editor de Bloc de notas"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveSubmit} className="space-y-3.5">
          {/* File name and target folder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="notepad-filename"
                className="text-xs font-medium text-muted-foreground"
              >
                Nombre del archivo (.txt)
              </label>
              <div
                className="inline-flex rounded-lg border border-border bg-background/60 p-0.5 text-[11px]"
                role="group"
                aria-label="Carpeta de destino"
              >
                <button
                  type="button"
                  onClick={() => setLocation('desktop')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    location === 'desktop'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  Escritorio
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('documents')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    location === 'documents'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  Documentos
                </button>
              </div>
            </div>

            <input
              id="notepad-filename"
              type="text"
              maxLength={80}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Ej: ideas.txt (opcional, se autogenera)"
              disabled={disabled || Boolean(busy)}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3.5 h-10 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Note content textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="notepad-content"
                className="text-xs font-medium text-muted-foreground"
              >
                Contenido de la nota
              </label>
              <span className="text-[11px] font-mono text-muted-foreground">
                {content.length} car. · {lineCount} {lineCount === 1 ? 'línea' : 'líneas'}
              </span>
            </div>

            <textarea
              id="notepad-content"
              rows={7}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (confirmDiscard) setConfirmDiscard(false);
              }}
              placeholder="Escribe aquí el texto para tu Bloc de notas..."
              disabled={disabled || Boolean(busy)}
              className="w-full p-3.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/60 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Open on PC toggle + Live preview */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setOpenInNotepad((v) => !v)}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground select-none"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  openInNotepad
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border bg-input'
                }`}
              >
                {openInNotepad && <CheckIcon className="w-3 h-3" />}
              </span>
              <span>Abrir en el PC al guardar</span>
            </button>

            <button
              type="button"
              onClick={handlePreviewClick}
              disabled={disabled || Boolean(busy) || !content.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/70 border border-border text-foreground/90 active:bg-muted disabled:opacity-30"
            >
              {busy === 'preview' ? 'Enviando...' : 'Ver en el PC'}
            </button>
          </div>

          {confirmDiscard ? (
            <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-destructive">
                ¿Descartar el texto sin guardar?
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="px-2.5 h-8 rounded-lg text-xs font-medium bg-muted text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeDiscard}
                  disabled={busy === 'discard'}
                  className="px-3 h-8 rounded-lg text-xs font-semibold bg-destructive text-white active:brightness-90"
                >
                  {busy === 'discard' ? 'Descartando...' : 'Sí, descartar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDiscardClick}
                disabled={disabled || Boolean(busy)}
                className="px-3.5 h-11 rounded-xl text-sm font-medium border border-destructive/35 bg-destructive/10 text-destructive flex items-center justify-center gap-1.5 active:bg-destructive/20 disabled:opacity-30"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Descartar</span>
              </button>

              <button
                type="submit"
                disabled={disabled || Boolean(busy) || !content.trim()}
                className="flex-1 h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-35"
              >
                {busy === 'save' ? 'Guardando...' : 'Guardar archivo'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
