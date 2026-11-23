import { useState, useCallback } from 'react';
import type { ApiResponse } from './useApi';

export interface AppError {
  id: string;
  timestamp: string;
  type: 'network' | 'api' | 'webview' | 'config' | 'unknown';
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: {
    url?: string;
    method?: string;
    statusCode?: number;
    statusText?: string;
    responseBody?: string;
    stackTrace?: string;
    context?: Record<string, unknown>;
  };
  dismissed: boolean;
}

interface ErrorState {
  errors: AppError[];
  maxErrors: number;
}

const STORAGE_KEY = 'pcRemoteErrors';

const initialState: ErrorState = {
  errors: [],
  maxErrors: 50,
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSeverityFromStatus(status: number): AppError['severity'] {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warning';
  return 'info';
}

export function useErrorHandler() {
  const [state, setState] = useState<ErrorState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { errors: parsed.errors || [], maxErrors: parsed.maxErrors || 50 };
      }
    } catch {
      // Ignore parse errors
    }
    return initialState;
  });

  const saveToStorage = useCallback((errors: AppError[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ errors, maxErrors: state.maxErrors }));
    } catch {
      // Ignore storage errors
    }
  }, [state.maxErrors]);

  const addError = useCallback((
    type: AppError['type'],
    title: string,
    message: string,
    details?: AppError['details'],
    severity?: AppError['severity']
  ) => {
    const error: AppError = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type,
      severity: severity || 'error',
      title,
      message,
      details,
      dismissed: false,
    };

    setState(prev => {
      const newErrors = [error, ...prev.errors].slice(0, prev.maxErrors);
      saveToStorage(newErrors);
      return { ...prev, errors: newErrors };
    });

    // Also log to console for debugging
    console.error(`[${type.toUpperCase()}] ${title}:`, message, details);

    return error.id;
  }, [saveToStorage]);

  const dismissError = useCallback((id: string) => {
    setState(prev => {
      const newErrors = prev.errors.map(e => e.id === id ? { ...e, dismissed: true } : e);
      saveToStorage(newErrors);
      return { ...prev, errors: newErrors };
    });
  }, [saveToStorage]);

  const clearAllErrors = useCallback(() => {
    setState(prev => {
      saveToStorage([]);
      return { ...prev, errors: [] };
    });
  }, [saveToStorage]);

  const retryError = useCallback((id: string, retryFn: () => Promise<void>) => {
    setState(prev => {
      const newErrors = prev.errors.map(e => e.id === id ? { ...e, dismissed: true } : e);
      saveToStorage(newErrors);
      return { ...prev, errors: newErrors };
    });
    retryFn().catch(err => {
      console.error('Retry failed:', err);
    });
  }, [saveToStorage]);

  const copyErrorDetails = useCallback((error: AppError) => {
    const details = {
      id: error.id,
      timestamp: error.timestamp,
      type: error.type,
      severity: error.severity,
      title: error.title,
      message: error.message,
      details: error.details,
    };
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
  }, []);

  const getVisibleErrors = useCallback(() => {
    return state.errors.filter(e => !e.dismissed);
  }, [state.errors]);

  const getAllErrors = useCallback(() => {
    return state.errors;
  }, [state.errors]);

  return {
    errors: getVisibleErrors(),
    allErrors: getAllErrors(),
    addError,
    dismissError,
    clearAllErrors,
    retryError,
    copyErrorDetails,
    hasErrors: getVisibleErrors().length > 0,
    totalErrors: state.errors.length,
  };
}

export function formatErrorForDisplay(error: unknown, context?: Record<string, unknown>): { type: AppError['type']; title: string; message: string; details?: AppError['details']; severity: AppError['severity'] } {
  // Extract context info
  const url = context?.url as string || '';
  const method = context?.method as string || '';
  const responseBody = context?.responseBody as string;
  const settingsIp = context?.settingsIp as string || '';

  // 1. TypeError from fetch (network level failure)
  if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) {
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2');
    const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(url);
    
    return {
      type: 'network',
      title: '❌ Sin Conexión al PC',
      message: [
        `No se pudo conectar al PC (${settingsIp || 'IP no configurada'}:5000).`,
        '',
        '🔧 Qué hacer:',
        '1. Verifica que el PC esté ENCENDIDO y no en suspensión',
        '2. Confirma que el móvil y PC estén en la MISMA red WiFi',
        '3. En el PC, ejecuta el backend: `dotnet run` en `backend/PCControl.Api`',
        '4. Verifica la IP del PC con `ipconfig` (Windows) y actualízala en Configuración',
        '5. Si usas firewall/antivirus, permite el puerto 5000',
        isLocalhost ? '⚠️ Estás usando localhost - en móvil usa la IP real (ej: 192.168.x.x)' : '',
        isPrivateIp ? '✅ IP privada detectada correctamente' : '⚠️ IP pública detectada - asegúrate de estar en la misma red local',
      ].filter(Boolean).join('\n'),
      severity: 'error',
      details: { context, stackTrace: error.stack },
    };
  }

  // 2. Response object (HTTP error status)
  if (error instanceof Response) {
    const status = error.status;
    const statusText = error.statusText;
    const action = context?.apiCall || 'Petición';
    
    let specificMessage = '';
    let whatToDo = '';
    
    switch (status) {
      case 400:
        specificMessage = `Petición inválida (HTTP 400)`;
        whatToDo = 'Revisa los datos enviados. Posible campo requerido faltante o formato incorrecto.';
        break;
      case 401:
        specificMessage = `No autorizado (HTTP 401) - Token inválido o expirado`;
        whatToDo = [
          '1. Ve a Configuración en la app',
          '2. Verifica que el Token coincida EXACTAMENTE con el de `appsettings.json` en el PC',
          '3. Token por defecto: FKALFV (6 caracteres, solo letras y números)',
          '4. Guarda de nuevo y prueba conexión',
        ].join('\n');
        break;
      case 403:
        specificMessage = `Acceso denegado (HTTP 403)`;
        whatToDo = 'El token es válido pero no tiene permisos para esta acción. Contacta al administrador.';
        break;
      case 404:
        specificMessage = `Endpoint no encontrado (HTTP 404) - ${action}`;
        whatToDo = 'El endpoint no existe en el backend. Verifica que el backend esté actualizado y corriendo la versión correcta.';
        break;
      case 408:
        specificMessage = `Tiempo de espera agotado (HTTP 408)`;
        whatToDo = 'El PC tardó demasiado en responder. Verifica carga del sistema o aumenta timeout.';
        break;
      case 500:
        specificMessage = `Error interno del servidor (HTTP 500)`;
        whatToDo = [
          '1. En el PC, revisa la consola donde corre `dotnet run`',
          '2. Busca errores en rojo (exceptions, stack traces)',
          '3. Común: puerto 5000 ocupado, BD no accesible, permisos de admin',
          '4. Reinicia el backend: Ctrl+C y vuelve a `dotnet run`',
        ].join('\n');
        break;
      case 502:
      case 503:
      case 504:
        specificMessage = `Servidor no disponible (HTTP ${status})`;
        whatToDo = 'El backend se cayó o no responde. Reinicia `dotnet run` en el PC.';
        break;
      default:
        specificMessage = `Error HTTP ${status}: ${statusText || 'Error desconocido'}`;
        whatToDo = 'Revisa la consola del backend para más detalles.';
    }

    return {
      type: 'api',
      title: `🌐 Error HTTP ${status}`,
      message: [
        specificMessage,
        '',
        `📍 Endpoint: ${action}`,
        `🔗 URL: ${url}`,
        '',
        '🔧 Qué hacer:',
        whatToDo,
        '',
        responseBody ? `📄 Respuesta: ${responseBody.substring(0, 500)}` : '',
      ].filter(Boolean).join('\n'),
      severity: getSeverityFromStatus(status),
      details: { statusCode: status, statusText, responseBody, url, method, context },
    };
  }

  // 3. Error instances with specific messages
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const apiCall = context?.apiCall || 'Operación';

    // Network/Connection errors
    if (msg.includes('networkerror') || msg.includes('failed to fetch') || msg.includes('econnrefused') || msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('enotfound') || msg.includes('dns')) {
      return {
        type: 'network',
        title: '🔌 Error de Conexión de Red',
        message: [
          `No se pudo alcanzar el servidor: ${error.message}`,
          '',
          '🔧 Qué hacer paso a paso:',
          '1. ✅ PC encendido y `dotnet run` corriendo en `backend/PCControl.Api`',
          '2. ✅ Mismo WiFi en móvil y PC (no datos móviles, no VPN)',
          '3. ✅ IP correcta en Configuración (ej: 192.168.1.50, no localhost)',
          '4. ✅ Puerto 5000 abierto en firewall Windows (Entrada/Salida)',
          '5. ✅ Token correcto (6 chars, ej: FKALFV) en app y `appsettings.json`',
          '6. Prueba `ping <IP_PC>` desde terminal en PC',
          '7. Prueba `curl http://<IP_PC>:5000/health` desde PC',
          '',
          msg.includes('etimedout') ? '⏱️ Timeout: El PC no respondió a tiempo - ¿PC lento o firewall bloqueando?' : '',
          msg.includes('econnrefused') ? '🚫 Conexión rechazada: Backend no corriendo o puerto 5000 cerrado' : '',
          msg.includes('enotfound') ? '🔍 DNS/Host no encontrado: IP mal escrita o red distinta' : '',
        ].filter(Boolean).join('\n'),
        severity: 'error',
        details: { context, stackTrace: error.stack },
      };
    }

    // Auth/Token errors
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token') || msg.includes('invalid token') || msg.includes('expired') || msg.includes('forbidden') || msg.includes('403')) {
      return {
        type: 'api',
        title: '🔐 Error de Autenticación',
        message: [
          `Token inválido, expirado o sin permisos: ${error.message}`,
          '',
          '🔧 Solución exacta:',
          '1. Abre Configuración en la app (🔧)',
          '2. Copia EXACTAMENTE el Token de `backend/PCControl.Api/appsettings.json`',
          '   → Busca "ApiToken": "FKALFV" (o tu valor personalizado)',
          '3. Pégalo en la app (6 caracteres, mayúsculas/números)',
          '4. Verifica que la IP sea la correcta (ej: 192.168.1.50)',
          '5. Guarda y pulsa "Test Conexión"',
          '',
          '⚠️ Errores comunes:',
          '• Espacios al inicio/fin del token',
          '• Minúsculas vs mayúsculas (debe ser exacto)',
          '• Token viejo en appsettings.json vs nuevo en app',
          '• Caracteres especiales copiados por error',
        ].filter(Boolean).join('\n'),
        severity: 'error',
        details: { context, stackTrace: error.stack },
      };
    }

    // Not found / 404
    if (msg.includes('404') || msg.includes('not found')) {
      return {
        type: 'api',
        title: '🔍 Endpoint No Encontrado (404)',
        message: [
          `El endpoint no existe en el backend: ${apiCall}`,
          '',
          '🔧 Qué hacer:',
          '1. Verifica que el backend sea la versión más reciente (`git pull` + `dotnet run`)',
          '2. El endpoint puede haber cambiado de nombre o ruta',
          '3. Revisa `Controllers/` en el backend para endpoints disponibles',
          '4. Endpoints esperados: /health, /api/shutdown, /api/restart, /api/lock, /api/apps/open, /api/apps/close',
        ].join('\n'),
        severity: 'warning',
        details: { context, stackTrace: error.stack },
      };
    }

    // Server errors 5xx
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('internal server error')) {
      return {
        type: 'api',
        title: '💥 Error Interno del Servidor (500)',
        message: [
          `El backend lanzó una excepción: ${error.message}`,
          '',
          '🔧 Revisa INMEDIATAMENTE la consola del PC donde corre `dotnet run`:',
          '• Busca texto en ROJO (Exception, StackTrace)',
          '• Causas frecuentes:',
          '  - Puerto 5000 ya en uso (netstat -ano | findstr :5000)',
          '  - Falta permisos de Administrador (ejecuta terminal como Admin)',
          '  - Base de datos / archivo de config no accesible',
          '  - Dependencias NuGet faltantes (`dotnet restore`)',
          '  - Código lanzando excepción no controlada',
        ].join('\n'),
        severity: 'error',
        details: { context, stackTrace: error.stack },
      };
    }

    // Timeout
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout')) {
      return {
        type: 'network',
        title: '⏱️ Tiempo de Espera Agotado',
        message: [
          `La petición tardó demasiado: ${error.message}`,
          '',
          '🔧 Qué hacer:',
          '1. El PC está muy cargado - cierra apps pesadas',
          '2. Firewall/Antivirus retrasando la conexión - desactiva temporalmente',
          '3. Red lenta - acerca el móvil al router',
          '4. Backend bloqueado - revisa consola `dotnet run` por deadlocks',
          '5. Aumenta timeout en `useApi.ts` si es necesario',
        ].join('\n'),
        severity: 'error',
        details: { context, stackTrace: error.stack },
      };
    }

    // CORS
    if (msg.includes('cors') || msg.includes('cross-origin') || msg.includes('blocked by cors')) {
      return {
        type: 'api',
        title: '🚫 Error CORS (Política de Origen)',
        message: [
          `El navegador bloqueó la petición por política CORS: ${error.message}`,
          '',
          '🔧 En el backend (Program.cs o Startup.cs):',
          '• Agrega: `builder.Services.AddCors(o => o.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));`',
          '• Y: `app.UseCors("AllowAll");` antes de `app.UseAuthorization()`',
          '• Reinicia `dotnet run`',
        ].join('\n'),
        severity: 'error',
        details: { context, stackTrace: error.stack },
      };
    }

    // Generic error with full message
    return {
      type: 'unknown',
      title: '⚠️ Error Inesperado',
      message: [
        `${error.message}`,
        '',
        '🔧 Información para depurar:',
        `• Acción: ${apiCall}`,
        `• URL: ${url || 'N/A'}`,
        `• Método: ${method || 'N/A'}`,
        `• Stack: ${error.stack?.split('\n').slice(0, 3).join(' → ') || 'N/A'}`,
        '',
        'Copia este error (botón 📋) y revisa la consola del backend.',
      ].filter(Boolean).join('\n'),
      severity: 'error',
      details: { context, stackTrace: error.stack },
    };
  }

  // 4. Fallback for any other type
  return {
    type: 'unknown',
    title: '❓ Error Desconocido',
    message: [
      `Error no clasificado: ${String(error)}`,
      '',
      'Contexto disponible:',
      JSON.stringify(context, null, 2).substring(0, 500),
    ].join('\n'),
    severity: 'error',
    details: { context },
  };
}

export function handleApiError(error: unknown, apiCall: string, addErrorFn: (type: AppError['type'], title: string, message: string, details?: AppError['details'], severity?: AppError['severity']) => string, apiErrorDetails?: ApiResponse['errorDetails']) {
  const formatted = formatErrorForDisplay(error, { apiCall, ...apiErrorDetails });
  return addErrorFn(formatted.type, formatted.title, formatted.message, formatted.details, formatted.severity);
}