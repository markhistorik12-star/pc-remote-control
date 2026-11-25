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

export type BrowserAction =
  | 'reload'
  | 'prev-tab'
  | 'next-tab'
  | 'close-tab'
  | 'reopen-tab'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'back'
  | 'forward';

export async function browserNavigate(ip: string, token: string, query: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/browser/navigate', { query });
}

export async function browserAction(ip: string, token: string, action: BrowserAction): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/browser/action', { action });
}

export interface SteamAccount {
  steamId: string;
  accountName: string;
  personaName: string;
  isAutoLogin: boolean;
  timestamp: number;
}

export interface SteamAccountsResponse {
  success: boolean;
  accounts: SteamAccount[];
  message?: string;
}

export async function getSteamAccounts(ip: string, token: string): Promise<SteamAccountsResponse> {
  const url = `http://${ip}:5000/api/steam/accounts`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, accounts: [], message: data.message || `HTTP ${response.status}` };
    }
    return { success: true, accounts: data.accounts || [] };
  } catch {
    return { success: false, accounts: [], message: 'No se pudo conectar con el PC.' };
  }
}

export async function launchSteamAccount(ip: string, token: string, accountName: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/steam/launch', { accountName });
}