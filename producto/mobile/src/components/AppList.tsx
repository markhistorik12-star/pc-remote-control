import { getAppIconUrl, isNotepadApp, type AppItem } from '../services/api';
import AppAvatar from './AppAvatar';
import { PlusIcon } from './ui/Icons';

interface AppListProps {
  apps: AppItem[];
  ip: string;
  port: number;
  token: string;
  loading?: boolean;
  disabled?: boolean;
  onOpenApp: (app: AppItem) => void;
  onCloseApp: (app: AppItem) => void;
  onOpenBrowserRemote: (app: AppItem) => void;
  onOpenNotepadRemote?: (app: AppItem) => void;
  onOpenCatalog: () => void;
}

export default function AppList({
  apps,
  ip,
  port,
  token,
  loading,
  disabled,
  onOpenApp,
  onCloseApp,
  onOpenBrowserRemote,
  onOpenNotepadRemote,
  onOpenCatalog,
}: AppListProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Mis Aplicaciones {apps.length > 0 ? `(${apps.length})` : ''}
        </h2>
        <button
          type="button"
          onClick={onOpenCatalog}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/15 text-primary border border-primary/30 active:bg-primary/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Editar / Agregar</span>
        </button>
      </div>

      {loading && apps.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Cargando aplicaciones de tu PC...
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-7 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Aún no has elegido aplicaciones</p>
          <p className="text-xs text-muted-foreground">
            Detectamos automáticamente tus programas, navegadores y juegos instalados.
          </p>
          <button
            type="button"
            onClick={onOpenCatalog}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-30"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Elegir mis aplicaciones</span>
          </button>
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {apps.map((app) => {
            const iconUrl = ip && token ? getAppIconUrl(ip, port, token, app.id) : null;
            return (
              <li key={app.id} className="flex items-center gap-3 pl-3 pr-2.5 py-2.5">
                <AppAvatar name={app.name} iconUrl={iconUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-foreground truncate">{app.name}</p>
                  {app.kind === 'browser' && (
                    <span className="text-[10px] text-primary font-medium block">Navegador con control</span>
                  )}
                  {app.kind === 'steam' && (
                    <span className="text-[10px] text-sky-400 font-medium block">Selector de cuentas</span>
                  )}
                  {app.kind === 'game' && (
                    <span className="text-[10px] text-emerald-400 font-medium block">Juego / Launcher</span>
                  )}
                  {isNotepadApp(app) && (
                    <span className="text-[10px] text-amber-400 font-medium block">Editor de notas remoto</span>
                  )}
                </div>

                {app.kind === 'browser' && (
                  <button
                    type="button"
                    onClick={() => onOpenBrowserRemote(app)}
                    disabled={disabled}
                    aria-label={`Control de ${app.name}`}
                    className="px-2.5 h-9 rounded-lg text-xs font-medium border border-border bg-muted/50 text-foreground/90 active:bg-muted disabled:opacity-30"
                  >
                    Control
                  </button>
                )}

                {isNotepadApp(app) && onOpenNotepadRemote && (
                  <button
                    type="button"
                    onClick={() => onOpenNotepadRemote(app)}
                    disabled={disabled}
                    aria-label={`Escribir en ${app.name}`}
                    className="px-2.5 h-9 rounded-lg text-xs font-medium border border-border bg-muted/50 text-foreground/90 active:bg-muted disabled:opacity-30"
                  >
                    Escribir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenApp(app)}
                  disabled={disabled}
                  aria-label={`Abrir ${app.name}`}
                  className="px-3.5 h-9 rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-30"
                >
                  Abrir
                </button>

                <button
                  type="button"
                  onClick={() => onCloseApp(app)}
                  disabled={disabled}
                  aria-label={`Cerrar ${app.name}`}
                  className="px-3 h-9 rounded-lg text-[13px] font-medium border border-border text-muted-foreground active:bg-muted disabled:opacity-30"
                >
                  Cerrar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
