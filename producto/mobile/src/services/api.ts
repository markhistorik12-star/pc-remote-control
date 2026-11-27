export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface DiscoveredPc {
  hostname: string;
  ip: string;
  port: number;
  version?: string;
}

export interface AppItem {
  id: string;
  name: string;
  launchTarget?: string;
  exePath: string;
  arguments: string;
  kind: 'browser' | 'steam' | 'game' | 'standard';
  selected: boolean;
}

const VALID_HOST_REGEX = /^[a-zA-Z0-9.-]+$/;

export function isValidTargetEndpoint(ip: string, port: number): boolean {
  const cleanIp = ip.trim();
  if (!cleanIp || cleanIp.length > 253 || !VALID_HOST_REGEX.test(cleanIp)) {
    return false;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return false;
  }
  return true;
}

export function getAppIconUrl(ip: string, port: number, token: string, appId: string): string {
  const cleanIp = ip.trim();
  const cleanPort = Number(port);
  if (!isValidTargetEndpoint(cleanIp, cleanPort) || !token.trim() || !appId.trim()) {
    return '';
  }
  return `http://${cleanIp}:${cleanPort}/api/apps/icon/${encodeURIComponent(appId)}?token=${encodeURIComponent(token.trim())}`;
}

export interface SteamAccount {
  steamId: string;
  accountName: string;
  personaName: string;
  isAutoLogin: boolean;
  timestamp: number;
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

async function requestApi<T = ApiResponse>(
  ip: string,
  port: number,
  token: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: object,
  timeoutMs = 8000
): Promise<T & ApiResponse> {
  const cleanIp = ip.trim();
  const cleanPort = Number(port);
  if (!isValidTargetEndpoint(cleanIp, cleanPort)) {
    return {
      success: false,
      message: 'Dirección IP o puerto no válidos.',
    } as T & ApiResponse;
  }

  const url = `http://${cleanIp}:${cleanPort}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      signal: controller.signal,
    };
    if (method !== 'GET' && body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const data = await res.json();
    if (!res.ok) {
      return {
        ...data,
        success: false,
        message: data?.message || `Error HTTP ${res.status}`,
      };
    }
    return { success: true, message: data?.message || 'OK', ...data };
  } catch {
    return {
      success: false,
      message: 'No se pudo conectar con el PC. Verifica que esté encendido y en el mismo Wi-Fi.',
    } as T & ApiResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyConnection(
  ip: string,
  port: number,
  token: string
): Promise<ApiResponse & { hostname?: string; steamInstalled?: boolean }> {
  return requestApi(ip, port, token, '/api/pair/verify', 'POST', {});
}

export async function checkHealth(
  ip: string,
  port: number,
  token: string
): Promise<ApiResponse & { hostname?: string; steamInstalled?: boolean }> {
  return requestApi(ip, port, token, '/health', 'GET');
}

export const shutdown = (ip: string, port: number, token: string) =>
  requestApi(ip, port, token, '/api/shutdown', 'POST');

export const restart = (ip: string, port: number, token: string) =>
  requestApi(ip, port, token, '/api/restart', 'POST');

export const lock = (ip: string, port: number, token: string) =>
  requestApi(ip, port, token, '/api/lock', 'POST');

export const suspend = (ip: string, port: number, token: string) =>
  requestApi(ip, port, token, '/api/suspend', 'POST');

export async function getSelectedApps(
  ip: string,
  port: number,
  token: string
): Promise<{ success: boolean; apps: AppItem[]; message?: string }> {
  const res = await requestApi<{ apps?: AppItem[] }>(ip, port, token, '/api/apps/selected', 'GET');
  return { success: res.success, apps: res.apps || [], message: res.message };
}

export async function getAppCatalog(
  ip: string,
  port: number,
  token: string,
  forceRefresh = false
): Promise<{ success: boolean; apps: AppItem[]; message?: string }> {
  const suffix = forceRefresh ? '?refresh=1' : '';
  const res = await requestApi<{ apps?: AppItem[] }>(
    ip,
    port,
    token,
    `/api/apps/catalog${suffix}`,
    'GET',
    undefined,
    15000
  );
  return { success: res.success, apps: res.apps || [], message: res.message };
}

export async function addCustomApp(
  ip: string,
  port: number,
  token: string,
  name: string,
  exePath: string
): Promise<{ success: boolean; app?: AppItem; message: string }> {
  return requestApi<{ app?: AppItem }>(ip, port, token, '/api/apps/custom', 'POST', { name, exePath });
}

export async function saveSelectedApps(
  ip: string,
  port: number,
  token: string,
  selectedIds: string[]
): Promise<{ success: boolean; apps: AppItem[]; message: string }> {
  const res = await requestApi<{ apps?: AppItem[] }>(ip, port, token, '/api/apps/selected', 'POST', {
    selectedIds,
  });
  return { success: res.success, apps: res.apps || [], message: res.message };
}

export const openApp = (ip: string, port: number, token: string, id: string) =>
  requestApi(ip, port, token, '/api/apps/open', 'POST', { id });

export const closeApp = (ip: string, port: number, token: string, id: string) =>
  requestApi(ip, port, token, '/api/apps/close', 'POST', { id });

export const browserNavigate = (
  ip: string,
  port: number,
  token: string,
  browserId: string | undefined,
  query: string
) => requestApi(ip, port, token, '/api/browser/navigate', 'POST', { browserId, query });

export const browserAction = (
  ip: string,
  port: number,
  token: string,
  browserId: string | undefined,
  action: BrowserAction
) => requestApi(ip, port, token, '/api/browser/action', 'POST', { browserId, action });

export async function getSteamAccounts(
  ip: string,
  port: number,
  token: string
): Promise<{ success: boolean; accounts: SteamAccount[]; message?: string }> {
  const res = await requestApi<{ accounts?: SteamAccount[] }>(ip, port, token, '/api/steam/accounts', 'GET');
  return { success: res.success, accounts: res.accounts || [], message: res.message };
}

export const launchSteamAccount = (ip: string, port: number, token: string, accountName: string) =>
  requestApi(ip, port, token, '/api/steam/launch', 'POST', { accountName });

export function parseQrPairingString(raw: string): { ip: string; port: number; token: string; hostname?: string } | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed.toLowerCase().startsWith('pcremote://')) return null;
    const url = new URL(trimmed.replace(/^pcremote:\/\//i, 'http://'));
    const ip = (url.searchParams.get('ip') || '').trim();
    const port = Number(url.searchParams.get('port') || '5050');
    const token = (url.searchParams.get('token') || '').trim().toUpperCase();
    const hostname = (url.searchParams.get('name') || '').trim().slice(0, 64);
    if (!isValidTargetEndpoint(ip, port) || !/^[A-Z0-9]{6}$/.test(token)) return null;
    return { ip, port, token, hostname };
  } catch {
    return null;
  }
}

async function probeHost(ip: string, port: number, timeoutMs = 550): Promise<DiscoveredPc | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://${ip}:${port}/api/discover`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.product === 'PCRemoteHub') {
      return {
        hostname: data.hostname || ip,
        ip,
        port: Number(data.port) || port,
        version: data.version,
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverPcsOnWifi(hintIp?: string, port = 5050): Promise<DiscoveredPc[]> {
  const prefixes = new Set<string>();
  if (hintIp && /^(\d{1,3}\.){3}\d{1,3}$/.test(hintIp.trim())) {
    prefixes.add(hintIp.trim().split('.').slice(0, 3).join('.'));
  }
  ['192.168.0', '192.168.1', '192.168.100', '10.0.0'].forEach((p) => prefixes.add(p));

  const found = new Map<string, DiscoveredPc>();

  // Wave 1: scan most common router DHCP ranges first (fast ~600ms hit!)
  const commonHosts = [
    ...Array.from({ length: 45 }, (_, i) => i + 2),
    ...Array.from({ length: 40 }, (_, i) => i + 100),
  ];

  const wave1Candidates: string[] = [];
  prefixes.forEach((prefix) => {
    commonHosts.forEach((h) => wave1Candidates.push(`${prefix}.${h}`));
  });

  const batchSize = 60;
  for (let i = 0; i < wave1Candidates.length; i += batchSize) {
    const slice = wave1Candidates.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((ip) => probeHost(ip, port, 550)));
    results.forEach((r) => {
      if (r) found.set(`${r.ip}:${r.port}`, r);
    });
    if (found.size > 0) return Array.from(found.values());
  }

  // Wave 2: scan full remaining /24 on first two prefixes if nothing found in Wave 1
  const primaryPrefixes = Array.from(prefixes).slice(0, 2);
  const usedSet = new Set(commonHosts);
  const wave2Candidates: string[] = [];
  primaryPrefixes.forEach((prefix) => {
    for (let h = 2; h <= 254; h++) {
      if (!usedSet.has(h)) wave2Candidates.push(`${prefix}.${h}`);
    }
  });

  for (let i = 0; i < wave2Candidates.length; i += batchSize) {
    const slice = wave2Candidates.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((ip) => probeHost(ip, port, 550)));
    results.forEach((r) => {
      if (r) found.set(`${r.ip}:${r.port}`, r);
    });
  }

  return Array.from(found.values());
}
