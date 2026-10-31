import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  dropCursor,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { StreamLanguage, syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { autocompletion, CompletionContext, CompletionResult, snippetCompletion } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';
import { FileText, UploadCloud } from 'lucide-react';
import rawVocabulary from '../data/vocabulary.json';
import { VocabularyItem } from '../types';
import './Editor.css';

export interface EditorHandle {
  insertSnippet: (snippetText: string) => void;
  goToLine: (lineNumber: number) => void;
  getContent: () => string;
  setContent: (newContent: string) => void;
  focus: () => void;
}

interface EditorProps {
  value: string;
  onChange: (newValue: string) => void;
  fileName?: string;
  isDirty?: boolean;
  onFileDrop?: (file: File) => void;
}

// Custom dark syntax highlighting style for LaTeX
const latexDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#f43f5e', fontWeight: 'bold' }, // \begin, \end, \documentclass
  { tag: t.macroName, color: '#38bdf8' }, // \section, \textbf, \frac
  { tag: t.special(t.variableName), color: '#a855f7' }, // math variables
  { tag: t.comment, color: '#6e7681', fontStyle: 'italic' }, // % comments
  { tag: t.string, color: '#34d399' }, // strings / labels
  { tag: t.bracket, color: '#fbbf24' }, // { } [ ]
  { tag: t.atom, color: '#ec4899' }, // numbers & special atoms
  { tag: t.operator, color: '#cbd5e1' }, // &, =, +, -, *
]);

export const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ value, onChange, fileName = 'document.tex', isDirty = false, onFileDrop }, ref) => {
    const editorParentRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [cursorStats, setCursorStats] = useState({ line: 1, col: 1, totalLines: 1 });
    const [isDragging, setIsDragging] = useState(false);

    // Create Autocomplete provider from vocabulary
    const latexAutocomplete = (context: CompletionContext): CompletionResult | null => {
      const word = context.matchBefore(/\\[a-zA-Z*]*|[a-zA-Z*]+/);
      if (!word) return null;
      if (word.from === word.to && !context.explicit) return null;

      const items = rawVocabulary as VocabularyItem[];
      const query = word.text.toLowerCase().replace(/^\\/, '');

      const completions = items
        .filter((item) => {
          const cmdClean = item.command.replace(/^\\/, '').toLowerCase();
          const nameClean = item.name.toLowerCase();
          const matchKeyword = item.keywords.some((k) => k.toLowerCase().includes(query));
          return cmdClean.includes(query) || nameClean.includes(query) || matchKeyword;
        })
        .map((item) => {
          return snippetCompletion(item.insertText || item.command, {
            label: item.command.split(/[{[\n]/)[0],
            detail: item.name,
            info: `${item.description}\n\nSintassi: ${item.syntax}\nEsempio: ${item.example}`,
            type: item.category === 'matematica' ? 'function' : 'keyword',
            boost: item.command.toLowerCase().startsWith('\\' + query) ? 2 : 0,
          });
        });

      return {
        from: word.from,
        options: completions,
        validFor: /^\\[a-zA-Z*]*$/,
      };
    };

    useImperativeHandle(ref, () => ({
      insertSnippet: (snippetText: string) => {
        if (!viewRef.current) return;
        const view = viewRef.current;
        const selection = view.state.selection.main;

        // Clean snippet tokens like ${1:foo} for plain insertion if snippet engine isn't directly bound
        const cleanedText = snippetText.replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$0/g, '');

        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: cleanedText },
          selection: { anchor: selection.from + cleanedText.length },
        });
        view.focus();
      },

      goToLine: (lineNumber: number) => {
        if (!viewRef.current) return;
        const view = viewRef.current;
        const doc = view.state.doc;
        const targetLine = Math.max(1, Math.min(lineNumber, doc.lines));
        const linePos = doc.line(targetLine);

        view.dispatch({
          selection: { anchor: linePos.from, head: linePos.to },
          scrollIntoView: true,
        });
        view.focus();
      },

      getContent: () => {
        return viewRef.current ? viewRef.current.state.doc.toString() : value;
      },

      setContent: (newContent: string) => {
        if (!viewRef.current) return;
        const view = viewRef.current;
        const currentDoc = view.state.doc.toString();
        if (currentDoc !== newContent) {
          view.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: newContent },
          });
        }
      },

      focus: () => {
        viewRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (!editorParentRef.current) return;

      const languageCompartment = new Compartment();

      const startState = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          bracketMatching(),
          dropCursor(),
          history(),
          languageCompartment.of(StreamLanguage.define(stex)),
          syntaxHighlighting(latexDarkHighlight),
          autocompletion({
            override: [latexAutocomplete],
            icons: true,
          }),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newDoc = update.state.doc.toString();
              onChange(newDoc);
            }

            if (update.selectionSet || update.docChanged) {
              const pos = update.state.selection.main.head;
              const line = update.state.doc.lineAt(pos);
              setCursorStats({
                line: line.number,
                col: pos - line.from + 1,
                totalLines: update.state.doc.lines,
              });
            }
          }),
          EditorView.theme({
            '&': { height: '100%', backgroundColor: 'transparent' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorParentRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
      };
    }, []);

    // Sync external value updates (e.g. file open)
    useEffect(() => {
      if (viewRef.current) {
        const currentDoc = viewRef.current.state.doc.toString();
        if (value !== currentDoc) {
          viewRef.current.dispatch({
            changes: { from: 0, to: currentDoc.length, insert: value },
          });
        }
      }
    }, [value]);

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (onFileDrop) {
          onFileDrop(file);
        }
      }
    };

    return (
      <div
        className="editor-wrapper"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="editor-header">
          <div className="editor-header-left">
            <span className="editor-filename">
              <FileText size={13} style={{ color: 'var(--accent-cyan)' }} />
              {fileName}
              {isDirty && <span className="dirty-indicator" title="Modifiche non salvate" />}
            </span>
          </div>

          <div className="editor-stats">
            <span>Righe: {cursorStats.totalLines}</span>
            <span>
              Ln {cursorStats.line}, Col {cursorStats.col}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>UTF-8</span>
            <span style={{ color: 'var(--accent-cyan)' }}>LaTeX</span>
          </div>
        </div>

        <div className="editor-container" ref={editorParentRef} />

        {isDragging && (
          <div className="editor-drag-overlay">
            <UploadCloud size={40} style={{ color: 'var(--accent-cyan)' }} />
            <div>Rilascia il file .tex qui per aprirlo</div>
          </div>
        )}
      </div>
    );
  }
);
