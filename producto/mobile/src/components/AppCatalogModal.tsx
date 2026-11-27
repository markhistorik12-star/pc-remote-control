import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getAppCatalog,
  saveSelectedApps,
  addCustomApp,
  getAppIconUrl,
  type AppItem,
} from '../services/api';
import AppAvatar from './AppAvatar';
import { XIcon, SearchIcon, CheckIcon, RefreshCwIcon, PlusIcon } from './ui/Icons';

interface AppCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string;
  port: number;
  token: string;
  onSaved: (updatedApps: AppItem[]) => void;
}

type CategoryFilter = 'all' | 'selected' | 'apps' | 'games' | 'browsers';

export default function AppCatalogModal({
  isOpen,
  onClose,
  ip,
  port,
  token,
  onSaved,
}: AppCatalogModalProps) {
  const [catalog, setCatalog] = useState<AppItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  const loadCatalog = useCallback(
    async (forceRefresh = false) => {
      if (!ip || !token) return;
      setLoading(true);
      setError(null);
      const res = await getAppCatalog(ip, port, token, forceRefresh);
      if (res.success) {
        setCatalog(res.apps);
        setSelectedIds(new Set(res.apps.filter((a) => a.selected).map((a) => a.id)));
      } else {
        setError(res.message || 'No se pudo obtener la lista de programas del PC.');
      }
      setLoading(false);
    },
    [ip, port, token]
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setFilter('all');
      setShowCustomForm(false);
      loadCatalog(false);
    }
  }, [isOpen, loadCatalog]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((app) => {
      if (filter === 'selected' && !selectedIds.has(app.id)) return false;
      if (filter === 'games' && app.kind !== 'game' && app.kind !== 'steam') return false;
      if (filter === 'browsers' && app.kind !== 'browser') return false;
      if (filter === 'apps' && app.kind !== 'standard') return false;
      if (!q) return true;
      return app.name.toLowerCase().includes(q);
    });
  }, [catalog, search, filter, selectedIds]);

  if (!isOpen) return null;

  const toggleApp = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    setAddingCustom(true);
    setError(null);
    const res = await addCustomApp(ip, port, token, customName.trim(), customPath.trim());
    setAddingCustom(false);
    if (res.success && res.app) {
      const newApp = res.app;
      setCatalog((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
      setSelectedIds((prev) => new Set(prev).add(newApp.id));
      setCustomName('');
      setCustomPath('');
      setShowCustomForm(false);
    } else {
      setError(res.message || 'Verifica la ruta del archivo .exe en tu PC.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveSelectedApps(ip, port, token, Array.from(selectedIds));
    setSaving(false);
    if (res.success) {
      onSaved(res.apps);
      onClose();
    } else {
      setError(res.message || 'Error al guardar tu selección.');
    }
  };

  const tabs: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: `Todas (${catalog.length})` },
    { key: 'selected', label: `Elegidas (${selectedIds.size})` },
    { key: 'apps', label: 'Apps' },
    { key: 'games', label: 'Juegos' },
    { key: 'browsers', label: 'Navegadores' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-title"
    >
      <div
        className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 id="catalog-title" className="text-base font-bold text-foreground">
              Programas de tu PC
            </h2>
            <p className="text-xs text-muted-foreground">
              {catalog.length > 0
                ? `${catalog.length} detectados • ${selectedIds.size} seleccionados`
                : 'Escaneando menú inicio y juegos...'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowCustomForm((v) => !v)}
              aria-label="Agregar ruta .exe manual"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1 ${
                showCustomForm
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/60 text-foreground border-border'
              }`}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>.exe</span>
            </button>
            <button
              type="button"
              onClick={() => loadCatalog(true)}
              disabled={loading}
              aria-label="Reescanear programas"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar catálogo"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Manual .exe form */}
        {showCustomForm && (
          <form onSubmit={handleAddCustom} className="p-3.5 bg-primary/10 border-b border-primary/30 space-y-2">
            <p className="text-xs font-semibold text-primary">Agregar programa o juego portable (.exe)</p>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nombre opcional (ej: Mi Juego)"
              className="w-full px-3 h-9 rounded-lg border border-border bg-background/80 text-xs text-foreground"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="Ruta en PC (ej: D:\Juegos\Juego.exe)"
                spellCheck={false}
                className="flex-1 min-w-0 px-3 h-9 rounded-lg border border-border bg-background/80 text-xs font-mono text-foreground"
              />
              <button
                type="submit"
                disabled={addingCustom || !customPath.trim()}
                className="px-3.5 h-9 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-40"
              >
                {addingCustom ? '...' : 'Añadir'}
              </button>
            </div>
          </form>
        )}

        {/* Search & Category chips */}
        <div className="px-4 py-3 space-y-2.5 border-b border-border bg-background/30">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar app, navegador o juego..."
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-10 pr-4 h-10 rounded-xl border border-border bg-background/70 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && catalog.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Escaneando aplicaciones, Microsoft Store y juegos de Steam...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive text-center">
              {error}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay coincidencias en esta vista.
            </div>
          ) : (
            filteredApps.map((app) => {
              const isChecked = selectedIds.has(app.id);
              const iconUrl = getAppIconUrl(ip, port, token, app.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => toggleApp(app.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                    isChecked
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-background/40 border-border hover:bg-muted/30'
                  }`}
                >
                  <AppAvatar name={app.name} iconUrl={iconUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{app.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {app.kind === 'browser'
                        ? 'Navegador • Incluye control remoto'
                        : app.kind === 'steam'
                        ? 'Steam • Incluye selector de cuentas'
                        : app.kind === 'game'
                        ? 'Juego / Plataforma gaming'
                        : 'Aplicación instalada'}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-transparent'
                    }`}
                  >
                    {isChecked && <CheckIcon className="w-4 h-4" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sticky footer */}
        <div className="p-4 border-t border-border bg-card flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 rounded-xl text-sm font-medium bg-muted text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-40"
          >
            {saving ? 'Guardando...' : `Guardar mis apps (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
