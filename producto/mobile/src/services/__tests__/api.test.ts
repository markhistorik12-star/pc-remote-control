import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidTargetEndpoint,
  parseQrPairingString,
  getAppIconUrl,
  getDesktopWsUrl,
  checkHealth,
  openApp,
} from '../api';

describe('API Security & Validation', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('validates target host and port strictly against URL injection', () => {
    expect(isValidTargetEndpoint('192.168.0.10', 5050)).toBe(true);
    expect(isValidTargetEndpoint('my-pc.local', 5050)).toBe(true);
    expect(isValidTargetEndpoint('', 5050)).toBe(false);
    expect(isValidTargetEndpoint('192.168.0.10/evil', 5050)).toBe(false);
    expect(isValidTargetEndpoint('evil.com?x=1#', 5050)).toBe(false);
    expect(isValidTargetEndpoint('user@192.168.0.10', 5050)).toBe(false);
    expect(isValidTargetEndpoint('192.168.0.10', 0)).toBe(false);
    expect(isValidTargetEndpoint('192.168.0.10', 70000)).toBe(false);
  });

  it('parses valid QR pairing URIs and rejects malformed or injected payloads', () => {
    const valid = parseQrPairingString(
      'pcremote://pair?ip=192.168.1.25&port=5050&token=ab34cd&name=DESKTOP-GAMING'
    );
    expect(valid).toEqual({
      ip: '192.168.1.25',
      port: 5050,
      token: 'AB34CD',
      hostname: 'DESKTOP-GAMING',
    });

    expect(parseQrPairingString('https://example.com?ip=1.1.1.1&token=ABCDEF')).toBeNull();
    expect(parseQrPairingString('pcremote://pair?ip=192.168.1.25/attack&port=5050&token=AB34CD')).toBeNull();
    expect(parseQrPairingString('pcremote://pair?ip=192.168.1.25&port=99999&token=AB34CD')).toBeNull();
    expect(parseQrPairingString('pcremote://pair?ip=192.168.1.25&port=5050&token=SHORT')).toBeNull();
  });

  it('builds encoded icon and desktop WebSocket URLs safely and rejects invalid hosts', () => {
    expect(getAppIconUrl('192.168.0.10', 5050, 'ABC234', 'steam_1')).toBe(
      'http://192.168.0.10:5050/api/apps/icon/steam_1?token=ABC234'
    );
    expect(getAppIconUrl('192.168.0.10/bad', 5050, 'ABC234', 'steam_1')).toBe('');

    const wsUrl = getDesktopWsUrl('192.168.0.10', 5050, 'ABC234', {
      monitor: 1,
      quality: 72,
      maxWidth: 1920,
      fps: 12,
    });
    expect(wsUrl).toBe(
      'ws://192.168.0.10:5050/api/desktop/ws?token=ABC234&monitor=1&quality=72&maxWidth=1920&fps=12'
    );
    expect(getDesktopWsUrl('192.168.0.10/evil', 5050, 'ABC234')).toBe('');
    expect(getDesktopWsUrl('192.168.0.10', 5050, '')).toBe('');
  });

  it('sends GET requests without body and attaches Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Conectado', hostname: 'TEST-PC' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await checkHealth('192.168.0.10', 5050, 'ABC234');
    expect(res.success).toBe(true);
    expect(res.hostname).toBe('TEST-PC');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer ABC234');
  });

  it('handles HTTP 401 and network failures gracefully without throwing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Token inválido o ausente' }),
    }) as unknown as typeof fetch;

    const unauthorized = await openApp('192.168.0.10', 5050, 'WRONG1', 'app123');
    expect(unauthorized.success).toBe(false);
    expect(unauthorized.message).toContain('Token');

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down')) as unknown as typeof fetch;
    const offline = await openApp('192.168.0.10', 5050, 'ABC234', 'app123');
    expect(offline.success).toBe(false);
  });
});
