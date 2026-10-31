import React, { useState } from 'react';
import { X, Sparkles, ExternalLink, CheckCircle, Download, Loader2, AlertCircle } from 'lucide-react';
import { UpdateInfo } from '../types';
import { openExternalUrl, downloadAndInstallUpdate } from '../services/updateService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadAndInstall = async () => {
    if (!updateInfo?.installerDownloadUrl) {
      if (updateInfo?.releaseUrl) {
        await openExternalUrl(updateInfo.releaseUrl);
      }
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    try {
      await downloadAndInstallUpdate(updateInfo.installerDownloadUrl);
    } catch (err: any) {
      console.error('Update failed:', err);
      setUpdateError(err?.message || String(err));
      setIsUpdating(false);
    }
  };

  const handleOpenReleasePage = async () => {
    if (updateInfo?.releaseUrl) {
      await openExternalUrl(updateInfo.releaseUrl);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '440px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <Sparkles size={16} style={{ color: 'var(--accent-indigo)' }} />
            <span>Aggiornamenti Tex-Notes</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={isUpdating}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          {updateInfo?.available ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning-border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--warning-text)' }}>
                    Nuova versione {updateInfo.latestVersion} disponibile!
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Versione installata: v{updateInfo.currentVersion}
                  </div>
                </div>
              </div>

              {updateInfo.releaseNotes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    NOTE DI RILASCIO:
                  </div>
                  <div
                    style={{
                      maxHeight: '140px',
                      overflowY: 'auto',
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      background: 'var(--bg-tertiary)',
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {updateError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--accent-rose)',
                    color: 'var(--accent-rose)',
                    fontSize: 11,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{updateError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={onClose} disabled={isUpdating}>
                  Chiudi
                </button>

                {updateInfo.releaseUrl && (
                  <button
                    className="btn btn-ghost"
                    onClick={handleOpenReleasePage}
                    disabled={isUpdating}
                    title="Apri la pagina della release nel browser"
                  >
                    <ExternalLink size={13} />
                    <span>Apri GitHub</span>
                  </button>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleDownloadAndInstall}
                  disabled={isUpdating}
                  title="Scarica e installa l'aggiornamento automaticamente"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={13} className="spinning" />
                      <span>Download in corso...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Aggiorna ora nell'app</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <CheckCircle size={36} style={{ color: 'var(--accent-emerald)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                Tex-Notes è aggiornato!
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Stai utilizzando l'ultima versione disponibile (v{updateInfo?.currentVersion || '1.0.1'}).
              </div>
              <button className="btn btn-primary" onClick={onClose}>
                Ottimo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
