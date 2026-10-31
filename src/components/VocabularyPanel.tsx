import React, { useState, useMemo } from 'react';
import { BookOpen, Search, X, ChevronDown, ChevronUp, Plus, Sparkles } from 'lucide-react';
import { VocabularyCategory, VocabularyItem } from '../types';
import rawVocabulary from '../data/vocabulary.json';
import './VocabularyPanel.css';

interface VocabularyPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onInsertCommand: (insertText: string) => void;
}

const CATEGORIES: { id: VocabularyCategory; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'struttura', label: 'Struttura' },
  { id: 'testo', label: 'Testo' },
  { id: 'liste', label: 'Liste' },
  { id: 'matematica', label: 'Matematica' },
  { id: 'tabelle', label: 'Tabelle' },
  { id: 'figure', label: 'Figure' },
  { id: 'riferimenti', label: 'Riferimenti' },
  { id: 'pacchetti', label: 'Pacchetti' },
];

export const VocabularyPanel: React.FC<VocabularyPanelProps> = ({
  isOpen,
  onToggle,
  onInsertCommand,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<VocabularyCategory>('tutti');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = rawVocabulary as VocabularyItem[];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'tutti' || item.category === activeCategory;

      if (!matchesCategory) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCmd = item.command.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchSyntax = item.syntax.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));

      return matchName || matchCmd || matchDesc || matchSyntax || matchKeywords;
    });
  }, [items, activeCategory, searchTerm]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <aside className={`vocab-panel ${isOpen ? '' : 'collapsed'}`}>
      <div className="vocab-header">
        <div className="vocab-header-title">
          <BookOpen size={16} className="text-indigo" />
          <span>Vocabolario LaTeX</span>
          <span className="badge badge-info" style={{ fontSize: 10, padding: '1px 5px' }}>
            {filteredItems.length}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onToggle}
          title="Chiudi pannello vocabolario"
        >
          <X size={15} />
        </button>
      </div>

      <div className="vocab-search-container">
        <div className="vocab-search-box">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="vocab-search-input"
            placeholder="Cerca (es. matrice, frac, bold)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ padding: 2 }}
              onClick={() => setSearchTerm('')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="vocab-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="vocab-list">
        {filteredItems.length === 0 ? (
          <div className="vocab-empty">
            <Search size={24} style={{ opacity: 0.4 }} />
            <div>Nessun comando trovato per "{searchTerm}"</div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11 }}
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('tutti');
              }}
            >
              Azzera filtri
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="vocab-card"
                onClick={() => onInsertCommand(item.insertText || item.command)}
                title="Clicca per inserire nell'editor"
              >
                <div className="vocab-card-header">
                  <span className="vocab-card-name">{item.name}</span>
                  <span className={`vocab-badge vocab-badge-${item.category}`}>
                    {item.category}
                  </span>
                </div>

                <div className="vocab-command-preview">{item.command}</div>

                <div className="vocab-desc">{item.description}</div>

                <div className="vocab-card-footer">
                  <div className="vocab-insert-hint">
                    <Plus size={12} />
                    <span>Inserisci al cursore</span>
                  </div>
                  <button
                    className="vocab-details-toggle"
                    onClick={(e) => toggleExpand(item.id, e)}
                    title={isExpanded ? 'Comprimi' : 'Mostra dettagli'}
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="vocab-expanded-info" onClick={(e) => e.stopPropagation()}>
                    <div className="vocab-info-row">
                      <span className="vocab-info-label">Sintassi:</span>
                      <code className="vocab-info-content">{item.syntax}</code>
                    </div>
                    <div className="vocab-info-row">
                      <span className="vocab-info-label">Esempio:</span>
                      <code className="vocab-info-content">{item.example}</code>
                    </div>
                    <div className="vocab-info-row">
                      <span className="vocab-info-label">Risultato:</span>
                      <span className="vocab-info-preview-text">{item.preview}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
