export interface ApiResponse {
  success: boolean;
  message: string;
}

async function fetchWithAuth(
  ip: string,
  token: string,
  endpoint: string,
  body?: object
): Promise<ApiResponse> {
  const url = `http://${ip}:5000${endpoint}`;
  
  console.log('[API] Request:', { url, method: 'POST', endpoint, hasBody: !!body });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('[API] Response:', { status: response.status, ok: response.ok, url });

    const data = await response.json() as ApiResponse;
    
    console.log('[API] Response data:', data);
    
    if (!response.ok) {
      return { success: false, message: data.message || `HTTP ${response.status}` };
    }

    return data;
  } catch (error) {
    console.error('[API] Error:', error);
    return { success: false, message: 'No se pudo conectar con el PC. Verifica que esté encendido y en la misma red.' };
  }
}

export async function shutdown(ip: string, token: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/shutdown');
}

export async function restart(ip: string, token: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/restart');
}

export async function lock(ip: string, token: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/lock');
}

export async function suspend(ip: string, token: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/suspend');
}

export async function openApp(ip: string, token: string, appName: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/apps/open', { appName });
}

export async function closeApp(ip: string, token: string, appName: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/apps/close', { appName });
}

export async function testConnection(ip: string, token: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/health');
}