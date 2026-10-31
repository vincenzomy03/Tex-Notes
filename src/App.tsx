import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Editor, EditorHandle } from './components/Editor';
import { PdfPreview } from './components/PdfPreview';
import { VocabularyPanel } from './components/VocabularyPanel';
import { BottomPanel } from './components/BottomPanel';
import { UpdateModal } from './components/UpdateModal';
import {
  compileLatexSource,
  fetchAvailableCompilers,
  CompilerOption,
} from './services/compilerService';
import {
  openDocumentDialog,
  saveDocument,
  exportPdfDialog,
  insertMediaDialog,
} from './services/fileService';
import { checkGitHubUpdates } from './services/updateService';
import defaultLatexDoc from './data/defaultDocument.tex?raw';
import { CompileStatus, CompileError, UpdateInfo, FileState } from './types';

export default function App() {
  const [content, setContent] = useState<string>(defaultLatexDoc);
  const [fileState, setFileState] = useState<FileState>({
    path: null,
    name: 'appunti.tex',
    isDirty: false,
    autoSave: false,
  });

  // Compiler state
  const [livePreview, setLivePreview] = useState<boolean>(true);
  const [compileStatus, setCompileStatus] = useState<CompileStatus>('idle');
  const [compileDurationMs, setCompileDurationMs] = useState<number>(0);
  const [pdfBase64, setPdfBase64] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [rawLog, setRawLog] = useState<string>('');
  const [compilerEngine, setCompilerEngine] = useState<string>('tectonic');
  const [availableEngines, setAvailableEngines] = useState<CompilerOption[]>([]);

  // UI Panels state
  const [isVocabOpen, setIsVocabOpen] = useState<boolean>(false);
  const [isBottomOpen, setIsBottomOpen] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  // Split pane ratio (percentage for editor width)
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  // References
  const editorRef = useRef<EditorHandle>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load available compilers on launch
  useEffect(() => {
    fetchAvailableCompilers().then((engines) => {
      setAvailableEngines(engines);
      const tectonic = engines.find((e) => e.id === 'tectonic' && e.available);
      if (tectonic) {
        setCompilerEngine('tectonic');
      } else if (engines.length > 0 && engines[0].available) {
        setCompilerEngine(engines[0].id);
      }
    });

    // Check updates in background silently
    checkGitHubUpdates().then((info) => {
      setUpdateInfo(info);
    });
  }, []);

  // Main compilation routine
  const triggerCompilation = useCallback(
    async (sourceCode: string) => {
      setCompileStatus('compiling');
      const workingDir = fileState.path
        ? fileState.path.replace(/[/\\][^/\\]+$/, '')
        : null;

      try {
        const result = await compileLatexSource(sourceCode, workingDir, compilerEngine);
        setCompileDurationMs(result.durationMs);
        setRawLog(result.rawLog);

        if (result.success && result.pdfBase64) {
          setCompileStatus(result.errors && result.errors.length > 0 ? 'error' : 'success');
          setPdfBase64(result.pdfBase64);
          setErrors(result.errors || []);
          if (result.errors && result.errors.length > 0) {
            setIsBottomOpen(true);
          }
        } else {
          setCompileStatus('error');
          setErrors(result.errors || []);
          if (result.errors && result.errors.length > 0) {
            setIsBottomOpen(true);
          }
        }
      } catch (err) {
        console.error('Compilation failed:', err);
        setCompileStatus('error');
        setErrors([{ line: 1, message: String(err) }]);
        setIsBottomOpen(true);
      }
    },
    [fileState.path, compilerEngine]
  );

  // Initial compilation on mount
  useEffect(() => {
    triggerCompilation(content);
  }, []);

  // Handle document content changes with live preview debouncing (1.5 seconds)
  const handleContentChange = (newDoc: string) => {
    setContent(newDoc);
    setFileState((prev) => ({ ...prev, isDirty: true }));

    if (livePreview) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        triggerCompilation(newDoc);
      }, 1500);
    }
  };

  // Insert command snippet from Vocabulary into Editor
  const handleInsertCommand = (insertText: string) => {
    editorRef.current?.insertSnippet(insertText);
  };

  // Jump to specific error line
  const handleJumpToLine = (lineNumber: number) => {
    editorRef.current?.goToLine(lineNumber);
  };

  // File Operations
  const handleOpenFile = async () => {
    const res = await openDocumentDialog();
    if (res) {
      setContent(res.content);
      setFileState({
        path: res.path,
        name: res.name,
        isDirty: false,
        autoSave: false,
      });
      triggerCompilation(res.content);
    }
  };

  const handleSaveFile = async () => {
    try {
      const res = await saveDocument(fileState.path, content, fileState.name);
      setFileState((prev) => ({
        ...prev,
        path: res.path,
        name: res.name,
        isDirty: false,
      }));
    } catch (err) {
      console.warn('Save canceled or failed:', err);
    }
  };

  const handleExportPdf = async () => {
    try {
      const defaultPdfName = fileState.name.replace(/\.tex$/i, '') + '.pdf';
      await exportPdfDialog(defaultPdfName, pdfBase64);
    } catch (err) {
      alert(`Impossibile esportare il PDF: ${err}`);
    }
  };

  const handleInsertMedia = async () => {
    try {
      let currentPath = fileState.path;
      // If file has never been saved, prompt to save first so images/ folder is created next to the document
      if (!currentPath) {
        const res = await saveDocument(null, content, fileState.name);
        currentPath = res.path;
        setFileState((prev) => ({
          ...prev,
          path: res.path,
          name: res.name,
          isDirty: false,
        }));
      }

      const res = await insertMediaDialog(currentPath);
      if (res && editorRef.current) {
        // Auto-inject \usepackage{graphicx} if missing from preamble
        setContent((prev) => {
          if (!prev.includes('graphicx')) {
            if (prev.includes('\\documentclass')) {
              return prev.replace(
                /(\\documentclass[^\n]*\n)/,
                '$1\\usepackage{graphicx}\n'
              );
            }
            return '\\usepackage{graphicx}\n' + prev;
          }
          return prev;
        });

        editorRef.current.insertSnippet(res.snippet);
      }
    } catch (err) {
      console.warn('Inserimento media annullato:', err);
    }
  };

  // Drag and drop of .tex files onto window
  const handleFileDrop = async (file: File) => {
    try {
      const text = await file.text();
      setContent(text);
      setFileState({
        path: null,
        name: file.name,
        isDirty: false,
        autoSave: false,
      });
      triggerCompilation(text);
    } catch (err) {
      console.error('Error reading dropped file:', err);
    }
  };

  // Keyboard shortcuts (Ctrl+S, Ctrl+O, F5, Ctrl+Enter, Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
      ) {
        e.preventDefault();
        triggerCompilation(content);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsVocabOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, fileState]);

  // Splitter drag resize logic
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);

    const startX = e.clientX;
    const initialRatio = splitRatio;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newRatio = Math.max(25, Math.min(75, initialRatio + deltaPercent));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="app-container">
      <TopBar
        fileName={fileState.name}
        isDirty={fileState.isDirty}
        livePreview={livePreview}
        onToggleLivePreview={() => setLivePreview((prev) => !prev)}
        onCompile={() => triggerCompilation(content)}
        onOpen={handleOpenFile}
        onSave={handleSaveFile}
        onInsertMedia={handleInsertMedia}
        onExportPdf={handleExportPdf}
        compileStatus={compileStatus}
        compileDurationMs={compileDurationMs}
        errorCount={errors.length}
        compilerEngine={compilerEngine}
        onEngineChange={(eng) => {
          setCompilerEngine(eng);
          triggerCompilation(content);
        }}
        availableEngines={availableEngines}
        isVocabOpen={isVocabOpen}
        onToggleVocab={() => setIsVocabOpen((prev) => !prev)}
        updateInfo={updateInfo}
        onCheckUpdate={() => setIsUpdateModalOpen(true)}
      />

      <div className="main-content">
        <div className="workspace-area">
          <div className="editor-preview-split" ref={containerRef}>
            {/* Left: Code Editor */}
            <div
              style={{
                width: `${splitRatio}%`,
                height: '100%',
                display: 'flex',
                minWidth: '240px',
              }}
            >
              <Editor
                ref={editorRef}
                value={content}
                onChange={handleContentChange}
                fileName={fileState.name}
                isDirty={fileState.isDirty}
                onFileDrop={handleFileDrop}
              />
            </div>

            {/* Resizable Divider */}
            <div
              className={`resizer-horizontal ${isDraggingSplitter ? 'dragging' : ''}`}
              onMouseDown={handleSplitterMouseDown}
              title="Trascina per ridimensionare editor e anteprima"
            />

            {/* Right: PDF Preview */}
            <div
              style={{
                width: `${100 - splitRatio}%`,
                height: '100%',
                display: 'flex',
                minWidth: '240px',
              }}
            >
              <PdfPreview
                pdfBase64={pdfBase64}
                isCompiling={compileStatus === 'compiling'}
                hasError={errors.length > 0}
              />
            </div>
          </div>

          {/* Bottom Panel: Errors & Logs */}
          <BottomPanel
            errors={errors}
            rawLog={rawLog}
            onJumpToLine={handleJumpToLine}
            isOpen={isBottomOpen}
            onToggleOpen={() => setIsBottomOpen((prev) => !prev)}
          />
        </div>

        {/* Collapsible LaTeX Vocabulary Panel */}
        <VocabularyPanel
          isOpen={isVocabOpen}
          onToggle={() => setIsVocabOpen(false)}
          onInsertCommand={handleInsertCommand}
        />
      </div>

      {/* GitHub Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
      />
    </div>
  );
}
