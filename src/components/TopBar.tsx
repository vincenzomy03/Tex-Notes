import React from 'react';
import {
  FolderOpen,
  Save,
  Download,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
  Github,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { CompileStatus, UpdateInfo } from '../types';
import './TopBar.css';

interface TopBarProps {
  fileName: string;
  isDirty: boolean;
  livePreview: boolean;
  onToggleLivePreview: () => void;
  onCompile: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onInsertMedia?: () => void;
  compileStatus: CompileStatus;
  compileDurationMs?: number;
  errorCount: number;
  compilerEngine: string;
  onEngineChange: (engine: string) => void;
  availableEngines: { id: string; name: string; available: boolean }[];
  isVocabOpen: boolean;
  onToggleVocab: () => void;
  updateInfo: UpdateInfo | null;
  onCheckUpdate: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  fileName,
  isDirty,
  livePreview,
  onToggleLivePreview,
  onCompile,
  onOpen,
  onSave,
  onExportPdf,
  onInsertMedia,
  compileStatus,
  compileDurationMs,
  errorCount,
  compilerEngine,
  onEngineChange,
  availableEngines,
  isVocabOpen,
  onToggleVocab,
  updateInfo,
  onCheckUpdate,
}) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-brand">
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: 22, height: 22, objectFit: 'contain' }}
          />
          <span>Tex-Notes</span>
        </div>

        <div className="topbar-actions">
          <button className="btn btn-icon" onClick={onOpen} title="Apri file .tex (Ctrl+O)">
            <FolderOpen size={16} />
          </button>

          <button
            className={`btn btn-icon ${isDirty ? 'btn-primary' : ''}`}
            onClick={onSave}
            title="Salva file .tex (Ctrl+S)"
          >
            <Save size={16} />
          </button>

          {onInsertMedia && (
            <button className="btn btn-icon" onClick={onInsertMedia} title="Inserisci media (PNG, JPG, PDF) nella cartella images">
              <ImageIcon size={16} />
            </button>
          )}

          <button className="btn btn-icon" onClick={onExportPdf} title="Esporta PDF compilato">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="topbar-center">
        {/* Compiler engine selector */}
        <div
          className="engine-select-group"
          title="Motore di compilazione LaTeX in background (Tectonic è offline e consigliato; pdfLaTeX usa MiKTeX)"
        >
          <span className="engine-select-label">Compilatore:</span>
          <select
            className="engine-select"
            value={compilerEngine}
            onChange={(e) => onEngineChange(e.target.value)}
          >
            {availableEngines.map((eng) => (
              <option key={eng.id} value={eng.id} disabled={!eng.available}>
                {eng.name} {!eng.available ? '(non trovato)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Live Preview switch */}
        <div
          className="toggle-switch-container"
          onClick={onToggleLivePreview}
          title="Compila automaticamente in background 1-2s dopo la digitazione"
        >
          <span className="toggle-switch-label">Anteprima Live</span>
          <div className={`toggle-switch ${livePreview ? 'active' : ''}`}>
            <div className="toggle-switch-thumb" />
          </div>
        </div>

        {/* Manual compile button */}
        <button
          className="btn btn-primary"
          onClick={onCompile}
          disabled={compileStatus === 'compiling'}
          title="Forza compilazione ora (F5 / Ctrl+Enter)"
        >
          {compileStatus === 'compiling' ? (
            <RotateCw size={14} className="spinning" />
          ) : (
            <Play size={14} />
          )}
          <span>Compila</span>
        </button>

        {/* Compile status badge */}
        <div className="topbar-status">
          {compileStatus === 'idle' && (
            <span style={{ color: 'var(--text-muted)' }}>Pronto</span>
          )}
          {compileStatus === 'compiling' && (
            <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCw size={12} className="spinning" /> Compilazione...
            </span>
          )}
          {compileStatus === 'success' && (
            <span
              style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center' }}
              title={`PDF pronto (${((compileDurationMs || 0) / 1000).toFixed(1)}s)`}
            >
              <CheckCircle2 size={16} />
            </span>
          )}
          {compileStatus === 'error' && (
            <span style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={13} />
              <span>{errorCount} {errorCount === 1 ? 'errore' : 'errori'}</span>
            </span>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* GitHub Updates checker button */}
        <button
          className="btn btn-ghost"
          onClick={onCheckUpdate}
          title={
            updateInfo?.available
              ? `Aggiornamento disponibile (v${updateInfo.latestVersion})`
              : 'Verifica aggiornamenti su GitHub'
          }
          style={{
            color: updateInfo?.available ? 'var(--accent-amber)' : 'var(--text-secondary)',
            borderColor: updateInfo?.available ? 'var(--accent-amber)' : 'transparent',
          }}
        >
          <Github size={14} />
          <span>
            {updateInfo?.available
              ? `Update v${updateInfo.latestVersion}`
              : `v${updateInfo?.currentVersion || '1.0.4'}`}
          </span>
        </button>

        {/* Vocabulary panel toggle */}
        <button
          className={`btn btn-icon ${isVocabOpen ? 'btn-primary' : ''}`}
          onClick={onToggleVocab}
          title="Vocabolario LaTeX dei comandi"
        >
          <BookOpen size={16} />
        </button>
      </div>
    </header>
  );
};
