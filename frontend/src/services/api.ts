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
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json() as ApiResponse;
  
  if (!response.ok) {
    return { success: false, message: data.message || `HTTP ${response.status}` };
  }

  return data;
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

export async function openApp(ip: string, token: string, appName: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/apps/open', { appName });
}

export async function closeApp(ip: string, token: string, appName: string): Promise<ApiResponse> {
  return fetchWithAuth(ip, token, '/api/apps/close', { appName });
}