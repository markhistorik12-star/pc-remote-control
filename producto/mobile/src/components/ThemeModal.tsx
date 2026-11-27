import type { ThemeId, ThemeOption } from '../hooks/useTheme';
import { CheckIcon, XIcon, PaletteIcon } from './ui/Icons';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  themes: ThemeOption[];
  onSelectTheme: (id: ThemeId) => void;
}

export default function ThemeModal({
  isOpen,
  onClose,
  currentTheme,
  themes,
  onSelectTheme,
}: ThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div
        className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <PaletteIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="text-base font-bold text-foreground">
                Temas de colores
              </h2>
              <p className="text-xs text-muted-foreground">
                Elige el estilo visual de tu aplicación ({themes.length} temas)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector de temas"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-1 gap-2.5">
          {themes.map((item) => {
            const active = item.id === currentTheme;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTheme(item.id)}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                  active
                    ? 'bg-primary/12 border-primary ring-1 ring-primary/40'
                    : 'bg-background/50 border-border hover:bg-muted/40'
                }`}
              >
                {/* Theme visual preview miniature */}
                <div
                  className="w-14 h-11 rounded-xl border border-black/20 p-1.5 flex flex-col justify-between flex-shrink-0 shadow-inner"
                  style={{ backgroundColor: item.swatches.bg }}
                >
                  <div
                    className="h-3.5 w-full rounded-md flex items-center px-1 gap-1"
                    style={{ backgroundColor: item.swatches.card }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.swatches.primary }}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.swatches.accent }}
                    />
                  </div>
                  <div
                    className="h-2.5 w-8 rounded-sm"
                    style={{ backgroundColor: item.swatches.primary }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {item.name}
                    </span>
                    {active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 transition-colors ${
                    active
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/35 bg-transparent'
                  }`}
                >
                  {active && <CheckIcon className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-border bg-card flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:brightness-90"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
