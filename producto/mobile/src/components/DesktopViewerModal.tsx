import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDesktopMonitors,
  getDesktopWsUrl,
  sendDesktopInput,
  type DesktopInputPayload,
  type MonitorInfo,
} from '../services/api';
import { MonitorIcon, RefreshCwIcon, XIcon } from './ui/Icons';

interface DesktopViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string;
  port: number;
  token: string;
  pcName?: string;
}

type PointerMode = 'direct' | 'trackpad';
type StreamPreset = 'balanced' | 'hd';

const PRESETS: Record<StreamPreset, { label: string; maxWidth: number; quality: number; fps: number }> = {
  balanced: { label: 'Fluido 720p', maxWidth: 1280, quality: 58, fps: 16 },
  hd: { label: 'Nítido 1080p', maxWidth: 1920, quality: 72, fps: 12 },
};

export default function DesktopViewerModal({
  isOpen,
  onClose,
  ip,
  port,
  token,
  pcName,
}: DesktopViewerModalProps) {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [monitorIndex, setMonitorIndex] = useState(0);
  const [preset, setPreset] = useState<StreamPreset>('balanced');
  const [pointerMode, setPointerMode] = useState<PointerMode>('direct');
  const [rightClickArmed, setRightClickArmed] = useState(false);
  const [dragArmed, setDragArmed] = useState(false);
  const [showKeyboardBar, setShowKeyboardBar] = useState(false);
  const [textInput, setTextInput] = useState('');

  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [fpsCount, setFpsCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [reconnectSeed, setReconnectSeed] = useState(0);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const frameBusyRef = useRef(false);
  const framesInSecRef = useRef(0);

  // Gesture tracking refs
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    moved: boolean;
    longPressed: boolean;
    draggingRemote: boolean;
    pinchStartDist: number;
    pinchStartZoom: number;
  }>({
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    longPressed: false,
    draggingRemote: false,
    pinchStartDist: 0,
    pinchStartZoom: 1,
  });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  const dispatchCommand = useCallback(
    (payload: DesktopInputPayload) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        return;
      }
      if (payload.type !== 'config') {
        void sendDesktopInput(ip, port, token, { ...payload, monitorIndex });
      }
    },
    [ip, port, token, monitorIndex]
  );

  // Load monitor list when modal opens
  useEffect(() => {
    if (!isOpen || !ip || !token) return;
    let cancelled = false;

    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRightClickArmed(false);
    setDragArmed(false);

    void getDesktopMonitors(ip, port, token).then((res) => {
      if (!cancelled && res.success && res.monitors.length > 0) {
        setMonitors(res.monitors);
        setMonitorIndex((prev) => (prev < res.monitors.length ? prev : 0));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, ip, port, token]);

  // WebSocket live frame streaming lifecycle (0% background CPU when modal closes)
  useEffect(() => {
    if (!isOpen || !ip || !token) return;

    const cfg = PRESETS[preset];
    const wsUrl = getDesktopWsUrl(ip, port, token, {
      monitor: monitorIndex,
      quality: cfg.quality,
      maxWidth: cfg.maxWidth,
      fps: cfg.fps,
    });

    if (!wsUrl) {
      setStatus('error');
      return;
    }

    setStatus('connecting');
    framesInSecRef.current = 0;
    setFpsCount(0);

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'blob';
    wsRef.current = ws;

    const fpsInterval = setInterval(() => {
      setFpsCount(framesInSecRef.current);
      framesInSecRef.current = 0;
    }, 1000);

    ws.onopen = () => {
      setStatus('live');
    };

    ws.onmessage = (ev) => {
      if (!(ev.data instanceof Blob)) return;
      if (frameBusyRef.current) return;

      frameBusyRef.current = true;
      const nextUrl = URL.createObjectURL(ev.data);
      const imgEl = imgRef.current;

      if (!imgEl) {
        URL.revokeObjectURL(nextUrl);
        frameBusyRef.current = false;
        return;
      }

      const prevUrl = activeBlobUrlRef.current;
      activeBlobUrlRef.current = nextUrl;

      const releasePrev = () => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        frameBusyRef.current = false;
      };

      imgEl.onload = () => {
        framesInSecRef.current += 1;
        releasePrev();
      };
      imgEl.onerror = () => {
        releasePrev();
      };
      imgEl.src = nextUrl;
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus((prev) => (prev === 'live' ? 'error' : prev));
    };

    return () => {
      clearInterval(fpsInterval);
      wsRef.current = null;
      try {
        ws.close();
      } catch {
        // Ignore close errors
      }
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      frameBusyRef.current = false;
    };
    // We intentionally push monitor/preset changes via live `config` messages when already open,
    // and only recreate the socket on open/credentials/manual reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ip, port, token, reconnectSeed]);

  // Push live monitor/quality updates over the open WebSocket without dropping connection
  useEffect(() => {
    if (!isOpen) return;
    const cfg = PRESETS[preset];
    dispatchCommand({
      type: 'config',
      monitorIndex,
      quality: cfg.quality,
      maxWidth: cfg.maxWidth,
      fps: cfg.fps,
    });
  }, [isOpen, monitorIndex, preset, dispatchCommand]);

  if (!isOpen) return null;

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clampPan = (nextX: number, nextY: number, currentZoom: number) => {
    if (currentZoom <= 1.01) return { x: 0, y: 0 };
    const stage = stageRef.current;
    const maxX = stage ? ((currentZoom - 1) * stage.clientWidth) / 2 : 300;
    const maxY = stage ? ((currentZoom - 1) * stage.clientHeight) / 2 : 300;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY)),
    };
  };

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.max(1, Math.min(3.5, Number(nextZoom.toFixed(2))));
    setZoom(clamped);
    setPan((prev) => clampPan(prev.x, prev.y, clamped));
  };

  const getNormalizedCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return null;

    const normX = (clientX - rect.left) / rect.width;
    const normY = (clientY - rect.top) / rect.height;
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
      return {
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
      };
    }
    return { x: normX, y: normY };
  };

  const showRippleAt = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const sRect = stage.getBoundingClientRect();
    const id = Date.now();
    setTapRipple({ x: clientX - sRect.left, y: clientY - sRect.top, id });
    setTimeout(() => {
      setTapRipple((cur) => (cur?.id === id ? null : cur));
    }, 360);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      clearLongPress();
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      gestureStartRef.current.pinchStartDist = Math.max(10, dist);
      gestureStartRef.current.pinchStartZoom = zoom;
      gestureStartRef.current.moved = true;
      return;
    }

    const g = gestureStartRef.current;
    g.x = e.clientX;
    g.y = e.clientY;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    g.moved = false;
    g.longPressed = false;
    g.draggingRemote = false;

    if (pointerMode === 'direct' && dragArmed && zoom <= 1.02) {
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      if (coords) {
        g.draggingRemote = true;
        dispatchCommand({ type: 'down', button: 'left', x: coords.x, y: coords.y });
      }
      return;
    }

    // Long-press (480ms without moving) triggers Right-Click cleanly
    clearLongPress();
    const downX = e.clientX;
    const downY = e.clientY;
    longPressTimerRef.current = setTimeout(() => {
      if (pointersRef.current.size !== 1 || gestureStartRef.current.moved) return;
      gestureStartRef.current.longPressed = true;
      showRippleAt(downX, downY);
      if (pointerMode === 'trackpad') {
        dispatchCommand({ type: 'click', button: 'right' });
      } else {
        const coords = getNormalizedCoords(downX, downY);
        if (coords) {
          dispatchCommand({ type: 'click', button: 'right', x: coords.x, y: coords.y });
        }
      }
    }, 480);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch-to-zoom with 2 fingers
    if (pointersRef.current.size === 2) {
      clearLongPress();
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / Math.max(10, gestureStartRef.current.pinchStartDist);
      applyZoom(gestureStartRef.current.pinchStartZoom * ratio);
      return;
    }

    const g = gestureStartRef.current;
    const dx = e.clientX - g.lastX;
    const dy = e.clientY - g.lastY;
    const totalMove = Math.hypot(e.clientX - g.x, e.clientY - g.y);

    if (totalMove > 9) {
      g.moved = true;
      clearLongPress();
    }

    g.lastX = e.clientX;
    g.lastY = e.clientY;

    if (!g.moved) return;

    if (pointerMode === 'trackpad') {
      const sensitivity = 1.65;
      dispatchCommand({
        type: 'move',
        relative: true,
        deltaX: Math.round(dx * sensitivity),
        deltaY: Math.round(dy * sensitivity),
      });
      return;
    }

    if (g.draggingRemote) {
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      if (coords) {
        dispatchCommand({ type: 'move', x: coords.x, y: coords.y });
      }
      return;
    }

    if (zoom > 1.01) {
      setPan((prev) => clampPan(prev.x + dx, prev.y + dy, zoom));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    clearLongPress();
    pointersRef.current.delete(e.pointerId);

    const g = gestureStartRef.current;
    if (g.draggingRemote) {
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      dispatchCommand({
        type: 'up',
        button: 'left',
        x: coords?.x,
        y: coords?.y,
      });
      g.draggingRemote = false;
      return;
    }

    if (g.longPressed || g.moved) return;

    const now = Date.now();
    const isDoubleTap =
      now - lastTapRef.current.time < 320 &&
      Math.hypot(e.clientX - lastTapRef.current.x, e.clientY - lastTapRef.current.y) < 26;

    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    showRippleAt(e.clientX, e.clientY);

    if (pointerMode === 'trackpad') {
      if (rightClickArmed) {
        dispatchCommand({ type: 'click', button: 'right' });
        setRightClickArmed(false);
      } else if (isDoubleTap) {
        dispatchCommand({ type: 'double-click' });
      } else {
        dispatchCommand({ type: 'click', button: 'left' });
      }
      return;
    }

    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (rightClickArmed) {
      dispatchCommand({ type: 'click', button: 'right', x: coords.x, y: coords.y });
      setRightClickArmed(false);
    } else if (isDoubleTap) {
      dispatchCommand({ type: 'double-click', x: coords.x, y: coords.y });
    } else {
      dispatchCommand({ type: 'click', button: 'left', x: coords.x, y: coords.y });
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput) return;
    dispatchCommand({ type: 'text', text: textInput });
    setTextInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Escritorio en vivo"
    >
      {/* Top Control Header */}
      <div className="px-3 py-2.5 bg-card/95 border-b border-border flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              status === 'live'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'connecting'
                ? 'bg-amber-400 animate-bounce'
                : 'bg-red-500'
            }`}
          />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {pcName || 'Escritorio en Vivo'}
            </h2>
            <p className="text-[10px] text-muted-foreground truncate">
              {status === 'live'
                ? `En vivo • ${fpsCount} FPS • ${
                    pointerMode === 'direct' ? 'Toque directo' : 'Modo Trackpad'
                  }`
                : status === 'connecting'
                ? 'Conectando transmisión local...'
                : 'Transmisión pausada • Toca reconectar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {monitors.length > 1 && (
            <button
              type="button"
              onClick={() => setMonitorIndex((i) => (i + 1) % monitors.length)}
              className="h-8 px-2.5 rounded-lg border border-border bg-muted/60 text-[11px] font-semibold text-foreground flex items-center gap-1 active:bg-muted"
              aria-label="Cambiar monitor"
            >
              <MonitorIcon className="w-3.5 h-3.5 text-primary" />
              <span>P{monitorIndex + 1}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setPreset((p) => (p === 'balanced' ? 'hd' : 'balanced'))}
            className="h-8 px-2.5 rounded-lg border border-border bg-muted/60 text-[11px] font-semibold text-foreground active:bg-muted"
          >
            {preset === 'balanced' ? '720p' : '1080p'}
          </button>

          <button
            type="button"
            onClick={() => setReconnectSeed((s) => s + 1)}
            className="w-8 h-8 rounded-lg border border-border bg-muted/60 flex items-center justify-center text-muted-foreground active:bg-muted"
            aria-label="Reconectar transmisión"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${status === 'connecting' ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-destructive/20 border border-destructive/40 flex items-center justify-center text-destructive active:bg-destructive/30"
            aria-label="Cerrar escritorio en vivo"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Desktop Viewport */}
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearLongPress();
          pointersRef.current.clear();
        }}
        className="relative flex-1 bg-black overflow-hidden flex items-center justify-center touch-none"
      >
        <img
          ref={imgRef}
          alt="Pantalla del PC"
          draggable={false}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          className={`max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none transition-opacity duration-150 ${
            status === 'live' ? 'opacity-100' : 'opacity-35'
          }`}
        />

        {tapRipple && (
          <span
            style={{ left: tapRipple.x - 14, top: tapRipple.y - 14 }}
            className="pointer-events-none absolute w-7 h-7 rounded-full border-2 border-primary bg-primary/25 animate-ping"
          />
        )}

        {status !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="bg-card/90 border border-border rounded-2xl px-5 py-4 max-w-xs shadow-2xl space-y-2 pointer-events-auto">
              <p className="text-sm font-semibold text-foreground">
                {status === 'connecting'
                  ? 'Abriendo ventana de escritorio...'
                  : 'No se pudo recibir video del PC'}
              </p>
              <p className="text-xs text-muted-foreground">
                {status === 'connecting'
                  ? 'Conectando en red local de baja latencia'
                  : 'Verifica que PC Remote Hub esté actualizado en tu PC y en la misma red Wi-Fi.'}
              </p>
              {status === 'error' && (
                <button
                  type="button"
                  onClick={() => setReconnectSeed((s) => s + 1)}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  Reintentar conexión
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Zoom Pills */}
        <div
          className="absolute right-3 bottom-3 flex items-center gap-1 bg-card/85 backdrop-blur-md border border-border rounded-xl p-1 shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => applyZoom(zoom - 0.5)}
            disabled={zoom <= 1}
            className="w-7 h-7 rounded-lg text-xs font-bold text-foreground disabled:opacity-35 active:bg-muted"
            aria-label="Alejar zoom"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2 h-7 rounded-lg text-[11px] font-mono font-semibold text-primary active:bg-muted"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => applyZoom(zoom + 0.5)}
            disabled={zoom >= 3.5}
            className="w-7 h-7 rounded-lg text-xs font-bold text-foreground disabled:opacity-35 active:bg-muted"
            aria-label="Acercar zoom"
          >
            +
          </button>
        </div>
      </div>

      {/* Optional Remote Keyboard Input Bar */}
      {showKeyboardBar && (
        <form
          onSubmit={handleSendText}
          className="px-3 py-2 bg-card border-t border-border flex items-center gap-2 flex-shrink-0"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Escribe texto o contraseña para enviar al PC..."
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            disabled={!textInput}
            className="h-10 px-3.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-40"
          >
            Enviar
          </button>
          <button
            type="button"
            onClick={() => dispatchCommand({ type: 'key', key: 'backspace' })}
            className="h-10 px-2.5 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground active:brightness-90"
            aria-label="Borrar carácter"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => dispatchCommand({ type: 'key', key: 'enter' })}
            className="h-10 px-3 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground active:brightness-90"
          >
            ↵
          </button>
        </form>
      )}

      {/* Bottom Interactive Controls & Quick Windows Keys */}
      <div className="px-3 py-2.5 bg-card border-t border-border space-y-2 flex-shrink-0">
        {/* Primary Pointer & Mouse Actions */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={() =>
              setPointerMode((m) => (m === 'direct' ? 'trackpad' : 'direct'))
            }
            className={`h-9 rounded-xl border text-[11px] font-semibold transition-colors ${
              pointerMode === 'trackpad'
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-muted/60 text-foreground'
            }`}
          >
            {pointerMode === 'direct' ? '👆 Directo' : '🖱️ Trackpad'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (pointerMode === 'trackpad') {
                dispatchCommand({ type: 'click', button: 'right' });
              } else {
                setRightClickArmed((v) => !v);
                setDragArmed(false);
              }
            }}
            className={`h-9 rounded-xl border text-[11px] font-semibold transition-colors ${
              rightClickArmed
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/60 text-foreground active:bg-muted'
            }`}
          >
            Clic Der.
          </button>

          <button
            type="button"
            onClick={() => {
              setDragArmed((v) => !v);
              setRightClickArmed(false);
            }}
            disabled={pointerMode === 'trackpad' || zoom > 1.02}
            className={`h-9 rounded-xl border text-[11px] font-semibold transition-colors disabled:opacity-35 ${
              dragArmed
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/60 text-foreground active:bg-muted'
            }`}
          >
            Arrastrar
          </button>

          <button
            type="button"
            onClick={() => setShowKeyboardBar((v) => !v)}
            className={`h-9 rounded-xl border text-[11px] font-semibold transition-colors ${
              showKeyboardBar
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-muted/60 text-foreground active:bg-muted'
            }`}
          >
            ⌨️ Teclado
          </button>

          <div className="grid grid-cols-2 rounded-xl border border-border overflow-hidden bg-muted/60 divide-x divide-border">
            <button
              type="button"
              onClick={() => dispatchCommand({ type: 'scroll', deltaY: 240 })}
              className="h-9 text-xs font-bold text-foreground active:bg-muted"
              aria-label="Scroll arriba"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => dispatchCommand({ type: 'scroll', deltaY: -240 })}
              className="h-9 text-xs font-bold text-foreground active:bg-muted"
              aria-label="Scroll abajo"
            >
              ↓
            </button>
          </div>
        </div>

        {/* Quick Windows System Shortcuts Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { label: '⊞ Inicio', key: 'win' },
            { label: 'Escritorio', key: 'show-desktop' },
            { label: 'Alt+Tab', key: 'alt-tab' },
            { label: 'Esc', key: 'escape' },
            { label: 'Enter', key: 'enter' },
            { label: 'Copiar', key: 'copy' },
            { label: 'Pegar', key: 'paste' },
            { label: '✕ Cerrar app', key: 'close-window' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => dispatchCommand({ type: 'key', key: item.key })}
              className="px-2.5 h-8 rounded-lg border border-border bg-background/60 text-[11px] font-medium text-muted-foreground hover:text-foreground active:bg-muted whitespace-nowrap flex-shrink-0"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
