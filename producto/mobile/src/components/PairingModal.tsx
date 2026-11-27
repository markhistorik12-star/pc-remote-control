import { useEffect, useRef, useState } from 'react';
import type { DeviceProfile, ProfileIconKey } from '../hooks/useSettings';
import {
  discoverPcsOnWifi,
  parseQrPairingString,
  type DiscoveredPc,
} from '../services/api';
import { PROFILE_ICON_OPTIONS, ProfileIconGlyph } from './ProfileAvatar';
import {
  XIcon,
  WifiIcon,
  QrCodeIcon,
  MonitorIcon,
  ShieldIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
} from './ui/Icons';

export interface PairingSubmitPayload {
  id?: string;
  name: string;
  icon: ProfileIconKey;
  ip: string;
  port: number;
  token: string;
  hostname?: string;
  skipVerify?: boolean;
}

interface PairingModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  editingProfile?: DeviceProfile | null;
  hintIp?: string;
  onClose: () => void;
  onConnect: (payload: PairingSubmitPayload) => Promise<boolean>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

export default function PairingModal({
  isOpen,
  mode,
  editingProfile,
  hintIp,
  onClose,
  onConnect,
}: PairingModalProps) {
  const [tab, setTab] = useState<'wifi' | 'qr' | 'manual'>('wifi');
  const [discovered, setDiscovered] = useState<DiscoveredPc[]>([]);
  const [scanningWifi, setScanningWifi] = useState(false);
  const [selectedPc, setSelectedPc] = useState<DiscoveredPc | null>(null);

  const [profileName, setProfileName] = useState('');
  const [profileIcon, setProfileIcon] = useState<ProfileIconKey>('desktop');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('5050');
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSaveOffline, setCanSaveOffline] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [qrStatus, setQrStatus] = useState<string>('Iniciando cámara...');

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setCanSaveOffline(false);

    if (mode === 'edit' && editingProfile) {
      setProfileName(editingProfile.name);
      setProfileIcon(editingProfile.icon);
      setIp(editingProfile.ip);
      setPort(String(editingProfile.port || 5050));
      setToken(editingProfile.token);
      setSelectedPc(null);
      setTab('manual');
    } else {
      setProfileName('');
      setProfileIcon('desktop');
      setIp('');
      setPort('5050');
      setToken('');
      setSelectedPc(null);
      setTab('wifi');
      runWifiDiscovery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, editingProfile?.id]);

  // QR scanner lifecycle
  useEffect(() => {
    if (!isOpen || tab !== 'qr') return;

    let stream: MediaStream | null = null;
    let active = true;
    let timerId: number | undefined;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrStatus('Tu dispositivo no permite acceso directo a cámara aquí. Usa la pestaña Wi-Fi.');
        return;
      }
      if (!window.BarcodeDetector) {
        setQrStatus('Escáner nativo no disponible en este WebView. Usa la pestaña Wi-Fi (1 toque).');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setQrStatus('Apunta al código QR de PC Remote Hub en tu PC');

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const scanTick = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              const parsed = parseQrPairingString(codes[0].rawValue);
              if (parsed) {
                active = false;
                stream?.getTracks().forEach((t) => t.stop());
                setConnecting(true);
                const ok = await onConnect({
                  id: mode === 'edit' ? editingProfile?.id : undefined,
                  name: profileName.trim(),
                  icon: profileIcon,
                  ip: parsed.ip,
                  port: parsed.port,
                  token: parsed.token,
                  hostname: parsed.hostname,
                });
                setConnecting(false);
                if (ok) onClose();
                else setError('El código QR fue leído, pero no se pudo conectar al PC.');
                return;
              }
            }
          } catch {
            // Ignore frame errors
          }
          if (active) {
            timerId = window.setTimeout(scanTick, 250);
          }
        };
        timerId = window.setTimeout(scanTick, 400);
      } catch {
        setQrStatus('Permiso de cámara denegado. Puedes usar la pestaña Wi-Fi.');
      }
    };

    startCamera();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [isOpen, tab, mode, editingProfile?.id, profileName, profileIcon, onConnect, onClose]);

  const runWifiDiscovery = async () => {
    setScanningWifi(true);
    setError(null);
    const pcs = await discoverPcsOnWifi(hintIp, Number(port) || 5050);
    setDiscovered(pcs);
    if (pcs.length === 1) {
      setSelectedPc(pcs[0]);
      setIp(pcs[0].ip);
      setPort(String(pcs[0].port));
      if (!profileName.trim()) {
        setProfileName(pcs[0].hostname);
      }
    }
    setScanningWifi(false);
  };

  if (!isOpen) return null;

  const resolveFormTarget = () => {
    const targetIp = (tab === 'wifi' && selectedPc ? selectedPc.ip : ip).trim();
    const targetPort = tab === 'wifi' && selectedPc ? selectedPc.port : Number(port) || 5050;
    const targetHost =
      tab === 'wifi' && selectedPc ? selectedPc.hostname : editingProfile?.hostname;
    const cleanToken = token.trim().toUpperCase();
    return { targetIp, targetPort, targetHost, cleanToken };
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCanSaveOffline(false);

    const { targetIp, targetPort, targetHost, cleanToken } = resolveFormTarget();

    if (!targetIp) {
      setError('Selecciona tu PC o ingresa la dirección IP.');
      return;
    }
    if (cleanToken.length !== 6) {
      setError('Ingresa el Token de 6 caracteres que aparece junto al reloj de tu PC.');
      return;
    }

    // Fast path when editing only name/icon of an existing profile (works even if PC is off)
    const unchangedCredentials =
      mode === 'edit' &&
      editingProfile &&
      editingProfile.ip === targetIp &&
      editingProfile.port === targetPort &&
      editingProfile.token === cleanToken;

    setConnecting(true);
    const ok = await onConnect({
      id: mode === 'edit' ? editingProfile?.id : undefined,
      name: profileName.trim(),
      icon: profileIcon,
      ip: targetIp,
      port: targetPort,
      token: cleanToken,
      hostname: targetHost,
      skipVerify: Boolean(unchangedCredentials),
    });
    setConnecting(false);

    if (ok) {
      onClose();
    } else {
      setError('No se pudo conectar ahora. Verifica el Token y el Wi-Fi, o guárdalo para después.');
      setCanSaveOffline(true);
    }
  };

  const handleSaveWithoutVerify = async () => {
    const { targetIp, targetPort, targetHost, cleanToken } = resolveFormTarget();
    if (!targetIp || cleanToken.length !== 6) return;
    await onConnect({
      id: mode === 'edit' ? editingProfile?.id : undefined,
      name: profileName.trim(),
      icon: profileIcon,
      ip: targetIp,
      port: targetPort,
      token: cleanToken,
      hostname: targetHost,
      skipVerify: true,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pairing-title"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="pairing-title" className="text-lg font-bold text-foreground">
              {mode === 'edit' ? 'Editar Perfil' : 'Agregar Dispositivo'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === 'edit'
                ? 'Personaliza el nombre, el icono o los datos de conexión'
                : 'Personaliza el perfil y vincula tu PC'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Profile customization */}
        <div className="space-y-2.5 p-3 rounded-xl bg-background/50 border border-border">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Nombre del perfil (opcional)
            </label>
            <input
              type="text"
              maxLength={32}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Ej: PC Escritorio, Notebook Sala..."
              className="w-full px-3 h-10 rounded-xl border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <span className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              Icono del dispositivo
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PROFILE_ICON_OPTIONS.map((opt) => {
                const selected = profileIcon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setProfileIcon(opt.key)}
                    className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 transition-colors ${
                      selected
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    <ProfileIconGlyph icon={opt.key} className="w-4 h-4" />
                    <span className="text-[11px] font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mode selector tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-background/60 border border-border">
          <button
            type="button"
            onClick={() => {
              setTab('wifi');
              if (discovered.length === 0 && !scanningWifi) runWifiDiscovery();
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'wifi' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <WifiIcon className="w-3.5 h-3.5" />
            <span>Wi-Fi</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('qr')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'qr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <QrCodeIcon className="w-3.5 h-3.5" />
            <span>Código QR</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'manual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <MonitorIcon className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>

        {tab === 'qr' ? (
          <div className="space-y-3">
            <div className="relative aspect-square w-full max-h-60 rounded-2xl overflow-hidden bg-black border border-border flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-primary/70 rounded-2xl pointer-events-none" />
            </div>
            <p className="text-xs text-center text-muted-foreground">{qrStatus}</p>
          </div>
        ) : (
          <form onSubmit={handleConnectSubmit} className="space-y-3.5">
            {tab === 'wifi' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Equipos detectados en Wi-Fi
                  </span>
                  <button
                    type="button"
                    onClick={runWifiDiscovery}
                    disabled={scanningWifi}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <RefreshCwIcon className={`w-3.5 h-3.5 ${scanningWifi ? 'animate-spin' : ''}`} />
                    <span>{scanningWifi ? 'Buscando...' : 'Buscar de nuevo'}</span>
                  </button>
                </div>

                {scanningWifi ? (
                  <div className="p-4 rounded-xl border border-border bg-background/40 text-center text-xs text-muted-foreground">
                    Escaneando tu red local en busca de PC Remote Hub...
                  </div>
                ) : discovered.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-background/30 text-center space-y-1">
                    <p className="text-xs font-medium text-foreground">
                      No se detectó ningún PC automáticamente
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Verifica que PC Remote Hub esté abierto en Windows o usa la pestaña Manual.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {discovered.map((pc) => {
                      const active = selectedPc?.ip === pc.ip;
                      return (
                        <button
                          key={`${pc.ip}:${pc.port}`}
                          type="button"
                          onClick={() => {
                            setSelectedPc(pc);
                            setIp(pc.ip);
                            setPort(String(pc.port));
                            if (!profileName.trim()) {
                              setProfileName(pc.hostname);
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                            active ? 'bg-primary/15 border-primary' : 'bg-background/40 border-border'
                          }`}
                        >
                          <MonitorIcon className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {pc.hostname}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {pc.ip}:{pc.port}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Dirección IP
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="192.168.0.10"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-3.5 h-11 rounded-xl border border-border bg-input text-sm font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Puerto
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="5050"
                    className="w-full px-3 h-11 rounded-xl border border-border bg-input text-sm font-mono text-foreground"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Token de 6 caracteres (visible en el PC)
              </label>
              <div className="relative">
                <ShieldIcon className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="ABC234"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-border bg-input text-base font-mono tracking-[0.25em] uppercase text-foreground"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {canSaveOffline && (
                  <button
                    type="button"
                    onClick={handleSaveWithoutVerify}
                    className="w-full py-2 rounded-lg text-xs font-semibold border border-border bg-card text-foreground active:bg-muted"
                  >
                    Guardar perfil sin conectar ahora
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-11 rounded-xl text-sm font-medium bg-muted text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={connecting}
                className="flex-1 h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-40"
              >
                {connecting
                  ? 'Conectando...'
                  : mode === 'edit'
                  ? 'Guardar cambios'
                  : 'Guardar y conectar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
