import { useSettings } from './useSettings';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errorDetails?: {
    statusCode?: number;
    statusText?: string;
    responseBody?: string;
    url?: string;
    method?: string;
  };
}

async function fetchWithAuth(
  ip: string,
  token: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse> {
  const url = `http://${ip}:5000${endpoint}`;

  console.log('[API] Request:', { url, method: options.method || 'GET', endpoint });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      data = { raw: responseBody };
    }

    console.log('[API] Response:', { status: response.status, ok: response.ok, url });

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `HTTP ${response.status}`,
        data,
        errorDetails: {
          statusCode: response.status,
          statusText: response.statusText,
          responseBody,
          url,
          method: options.method || 'GET',
        },
      };
    }

    return { success: true, message: 'OK', data };
  } catch (error: any) {
    console.error('[API] Error:', error);
    return {
      success: false,
      message: error.message || 'No se pudo conectar con el PC. Verifica que esté encendido y en la misma red.',
      data: null,
      errorDetails: {
        responseBody: error.message,
        url,
        method: options.method || 'GET',
      },
    };
  }
}

export function useApi() {
  const { settings } = useSettings();

  const post = (endpoint: string, body?: BodyInit | object | null) =>
    fetchWithAuth(settings.ip, settings.token, endpoint, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const get = (endpoint: string) =>
    fetchWithAuth(settings.ip, settings.token, endpoint, { method: 'GET' });

  return {
    post,
    get,
    ip: settings.ip,
    token: settings.token,
    isConfigured: !!settings.ip && !!settings.token,
  };
}
