import React, { useState } from 'react';
import { AlertCircle, Terminal, ChevronDown, ChevronUp, Copy, Check, CheckCircle2 } from 'lucide-react';
import { CompileError } from '../types';
import './BottomPanel.css';

interface BottomPanelProps {
  errors: CompileError[];
  rawLog: string;
  onJumpToLine: (lineNumber: number) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  errors,
  rawLog,
  onJumpToLine,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'errors' | 'log'>('errors');
  const [copied, setCopied] = useState(false);

  const handleCopyLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bottom-panel ${isOpen ? '' : 'collapsed'}`}
      style={{ height: isOpen ? '160px' : '28px' }}
    >
      <div className="bottom-panel-header" onClick={onToggleOpen}>
        <div className="bottom-panel-tabs">
          <button
            className={`bottom-panel-tab ${activeTab === 'errors' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('errors');
              if (!isOpen) onToggleOpen();
            }}
          >
            <AlertCircle
              size={13}
              style={{ color: errors.length > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}
            />
            <span>Errori ({errors.length})</span>
          </button>

          <button
            className={`bottom-panel-tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('log');
              if (!isOpen) onToggleOpen();
            }}
          >
            <Terminal size={13} />
            <span>Log Compilatore</span>
          </button>
        </div>

        <div className="bottom-panel-actions">
          {activeTab === 'log' && rawLog && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ padding: '2px 6px', fontSize: 10, gap: 4 }}
              onClick={handleCopyLog}
              title="Copia log negli appunti"
            >
              {copied ? <Check size={11} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={11} />}
              <span>{copied ? 'Copiato' : 'Copia'}</span>
            </button>
          )}

          <button
            className="btn btn-ghost btn-icon"
            style={{ padding: 2 }}
            title={isOpen ? 'Riduci pannello' : 'Espandi pannello'}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bottom-panel-body">
          {activeTab === 'errors' ? (
            errors.length === 0 ? (
              <div className="error-empty">
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>Nessun errore di compilazione rilevato.</span>
              </div>
            ) : (
              <div className="error-list">
                {errors.map((err, idx) => (
                  <div
                    key={`err-${idx}`}
                    className="error-item"
                    onClick={() => onJumpToLine(err.line)}
                    title="Clicca per saltare a questa riga nell'editor"
                  >
                    <span className="error-line-badge">
                      {err.line > 0 ? `Riga ${err.line}` : 'Generale'}
                    </span>
                    <div className="error-content">
                      <div className="error-message">{err.message}</div>
                      {err.raw && <div className="error-raw">{err.raw}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <pre className="log-view">{rawLog || 'Nessun log disponibile.'}</pre>
          )}
        </div>
      )}
    </div>
  );
};
