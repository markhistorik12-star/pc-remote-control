import { useState } from 'react';
import type { DeviceProfile } from '../hooks/useSettings';
import ProfileAvatar from './ProfileAvatar';
import { XIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon } from './ui/Icons';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: DeviceProfile[];
  activeProfileId: string | null;
  onSelectProfile: (profile: DeviceProfile) => void;
  onAddProfile: () => void;
  onEditProfile: (profile: DeviceProfile) => void;
  onDeleteProfile: (profile: DeviceProfile) => void;
}

export default function ProfilesModal({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onAddProfile,
  onEditProfile,
  onDeleteProfile,
}: ProfilesModalProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={() => {
        setConfirmDeleteId(null);
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profiles-modal-title"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="profiles-modal-title" className="text-lg font-bold text-foreground">
              Mis Dispositivos
            </h2>
            <p className="text-xs text-muted-foreground">
              Elige qué equipo controlar o administra tus perfiles guardados
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmDeleteId(null);
              onClose();
            }}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border bg-background/40 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No tienes dispositivos guardados</p>
            <p className="text-xs text-muted-foreground">
              Agrega tu primer PC por Wi-Fi, código QR o dirección IP.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              const isConfirmingDelete = confirmDeleteId === profile.id;
              const showHost =
                profile.hostname &&
                profile.hostname.toLowerCase() !== profile.name.toLowerCase();

              return (
                <li
                  key={profile.id}
                  className={`rounded-xl border transition-colors ${
                    isActive
                      ? 'border-primary/70 bg-primary/10'
                      : 'border-border bg-background/40'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        onSelectProfile(profile);
                        onClose();
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <ProfileAvatar icon={profile.icon} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {profile.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground flex-shrink-0">
                              <CheckIcon className="w-2.5 h-2.5" />
                              Activo
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                          {showHost ? `${profile.hostname} · ` : ''}
                          {profile.ip}:{profile.port}
                        </p>
                      </div>
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            onDeleteProfile(profile);
                          }}
                          className="px-2.5 h-8 rounded-lg text-xs font-semibold bg-destructive text-white active:brightness-90"
                        >
                          Borrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 h-8 rounded-lg text-xs font-medium bg-muted text-foreground"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            onEditProfile(profile);
                          }}
                          className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground active:bg-muted"
                          aria-label={`Editar ${profile.name}`}
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(profile.id)}
                          className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-destructive/80 active:bg-destructive/15"
                          aria-label={`Eliminar ${profile.name}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            setConfirmDeleteId(null);
            onAddProfile();
          }}
          className="w-full h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-2 active:brightness-90"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Agregar nuevo dispositivo</span>
        </button>
      </div>
    </div>
  );
}
