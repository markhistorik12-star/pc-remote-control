import { useState } from 'react';
import { useErrorHandler, type AppError } from '../hooks/useErrorHandler';
import { AlertTriangleIcon, XIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, TerminalIcon, WifiOffIcon, ServerIcon, AlertCircleIcon, TrashIcon } from './ui/Icons';

interface ErrorBannerProps {
  error: AppError;
  onDismiss: (id: string) => void;
  onRetry?: (id: string, retryFn: () => Promise<void>) => void;
  onCopy: (error: AppError) => void;
}

function ErrorBanner({ error, onDismiss, onRetry, onCopy }: ErrorBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const severityStyles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  const typeIcons = {
    network: <WifiOffIcon className="w-5 h-5" />,
    api: <ServerIcon className="w-5 h-5" />,
    webview: <TerminalIcon className="w-5 h-5" />,
    config: <AlertCircleIcon className="w-5 h-5" />,
    unknown: <AlertTriangleIcon className="w-5 h-5" />,
  };

  const typeLabels = {
    network: 'Red',
    api: 'API',
    webview: 'WebView',
    config: 'Config',
    unknown: 'Desconocido',
  };

  return (
    <div className={`${severityStyles[error.severity]} border rounded-xl p-4 mb-3 animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {typeIcons[error.type]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-medium bg-white/50 rounded-full">
                {typeLabels[error.type]}
              </span>
              <h4 className="font-semibold text-sm">{error.title}</h4>
              <span className="text-xs text-muted-foreground">
                {new Date(error.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onCopy(error)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/50 transition-colors"
                title="Copiar detalles"
              >
                <CopyIcon className="w-4 h-4" />
              </button>

              {onRetry && (
                <button
                  onClick={() => onRetry(error.id, async () => {})}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/50 transition-colors"
                  title="Reintentar"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/50 transition-colors"
                title={expanded ? 'Ocultar detalles' : 'Mostrar detalles'}
              >
                {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => onDismiss(error.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/50 transition-colors"
                title="Descartar"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="mt-2 text-sm">{error.message}</p>

          {error.details && expanded && (
            <div className="mt-3 space-y-3 animate-in fade-in duration-200">
              {error.details.url && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">URL: </span>
                  <code className="font-mono text-foreground break-all">{error.details.url}</code>
                </div>
              )}

              {error.details.method && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Método: </span>
                  <code className="font-mono text-foreground">{error.details.method}</code>
                </div>
              )}

              {error.details.statusCode && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Código HTTP: </span>
                  <code className="font-mono text-foreground">{error.details.statusCode}</code>
                  {error.details.statusText && (
                    <span className="ml-1 text-muted-foreground">({error.details.statusText})</span>
                  )}
                </div>
              )}

              {error.details.responseBody && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                    Respuesta del servidor ▼
                  </summary>
                  <pre className="mt-1 p-2 bg-white/50 rounded text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                    {error.details.responseBody}
                  </pre>
                </details>
              )}

              {error.details.context && Object.keys(error.details.context).length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                    Contexto adicional ▼
                  </summary>
                  <pre className="mt-1 p-2 bg-white/50 rounded text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify(error.details.context, null, 2)}
                  </pre>
                </details>
              )}

              {error.details.stackTrace && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                    Stack Trace ▼
                  </summary>
                  <pre className="mt-1 p-2 bg-white/50 rounded text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto text-red-600">
                    {error.details.stackTrace}
                  </pre>
                </details>
              )}
            </div>
          )}

          {error.details && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Mostrar detalles técnicos ▼
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ErrorToastProps {
  maxVisible?: number;
  onClearAll?: () => void;
}

export function ErrorToast({ maxVisible = 3, onClearAll }: ErrorToastProps) {
  const { errors, dismissError, clearAllErrors, copyErrorDetails, retryError, hasErrors, totalErrors } = useErrorHandler();

  if (!hasErrors) return null;

  const visibleErrors = errors.slice(0, maxVisible);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md sm:max-w-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-2">
        {visibleErrors.map((error) => (
          <ErrorBanner
            key={error.id}
            error={error}
            onDismiss={dismissError}
            onRetry={retryError}
            onCopy={copyErrorDetails}
          />
        ))}

        {errors.length > maxVisible && (
          <div className="bg-muted/50 border border-border rounded-xl p-3 text-center text-sm text-muted-foreground">
            <span>+{errors.length - maxVisible} errores más</span>
            {onClearAll && (
              <button
                onClick={onClearAll}
                className="ml-2 text-xs text-primary hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>
        )}

        {totalErrors > 0 && onClearAll && (
          <button
            onClick={clearAllErrors}
            className="w-full mt-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            <TrashIcon className="w-4 h-4 inline mr-1" />
            Limpiar todos los errores ({totalErrors})
          </button>
        )}
      </div>
    </div>
  );
}

interface ErrorPanelProps {
  title?: string;
  onClearAll?: () => void;
}

export function ErrorPanel({ title = 'Registro de Errores', onClearAll }: ErrorPanelProps) {
  const { errors, dismissError, clearAllErrors, copyErrorDetails, retryError, totalErrors } = useErrorHandler();

  if (errors.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <AlertCircleIcon className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Sin errores registrados</h3>
        <p className="text-sm text-muted-foreground">Los errores aparecerán aquí automáticamente cuando ocurran</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
            {totalErrors} total
          </span>
          {onClearAll && (
            <button
              onClick={clearAllErrors}
              className="px-3 py-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <TrashIcon className="w-4 h-4 inline mr-1" />
              Limpiar todo
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {errors.map((error) => (
          <ErrorBanner
            key={error.id}
            error={error}
            onDismiss={dismissError}
            onRetry={retryError}
            onCopy={copyErrorDetails}
          />
        ))}
      </div>
    </div>
  );
}