import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DesktopViewerModal from '../DesktopViewerModal';

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.OPEN;
  binaryType = 'blob';
  sentMessages: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.onopen?.();
    });
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

describe('DesktopViewerModal (Interactive Remote Desktop)', () => {
  const originalWs = globalThis.WebSocket;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    MockWebSocket.instances = [];
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        monitors: [
          { index: 0, name: 'Pantalla 1 (Principal)', x: 0, y: 0, width: 1920, height: 1080, isPrimary: true },
          { index: 1, name: 'Pantalla 2', x: 1920, y: 0, width: 1920, height: 1080, isPrimary: false },
        ],
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWs;
    globalThis.fetch = originalFetch;
  });

  it('connects over WebSocket, sends keyboard text/shortcuts, switches modes, and cleans up on close', async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <DesktopViewerModal
        isOpen={true}
        onClose={onClose}
        ip="192.168.0.10"
        port={5050}
        token="ABC234"
        pcName="PC Escritorio"
      />
    );

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain('ws://192.168.0.10:5050/api/desktop/ws?token=ABC234');

    await waitFor(() => {
      expect(screen.getByLabelText('Cambiar monitor')).toBeTruthy();
    });

    // Send a quick Windows shortcut (Mostrar Escritorio)
    fireEvent.click(screen.getByText('Escritorio'));
    expect(ws.sentMessages.some((m) => m.includes('"key":"show-desktop"'))).toBe(true);

    // Open keyboard input bar and send Unicode text
    fireEvent.click(screen.getByText('⌨️ Teclado'));
    const input = screen.getByPlaceholderText('Escribe texto o contraseña para enviar al PC...');
    fireEvent.change(input, { target: { value: 'Hola Mundo!' } });
    fireEvent.click(screen.getByText('Enviar'));

    expect(ws.sentMessages.some((m) => m.includes('"type":"text"') && m.includes('Hola Mundo!'))).toBe(true);

    // Switch quality preset to 1080p -> pushes live config message
    fireEvent.click(screen.getByText('720p'));
    expect(ws.sentMessages.some((m) => m.includes('"maxWidth":1920'))).toBe(true);

    // Unmount closes the WebSocket cleanly so PC returns to 0% CPU
    unmount();
    expect(ws.closed).toBe(true);
  });
});
