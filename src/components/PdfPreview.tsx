import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSearch,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import './PdfPreview.css';

// Initialize PDF.js worker from local bundled asset
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfPreviewProps {
  pdfBase64?: string;
  isCompiling: boolean;
  hasError: boolean;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfBase64,
  isCompiling,
  hasError,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [lastValidPdf, setLastValidPdf] = useState<string | null>(null);
  const [showingLastValid, setShowingLastValid] = useState<boolean>(false);
  const [pageInput, setPageInput] = useState<string>('1');

  // Track scroll position across reloads
  const scrollPosRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });
  const activeRenderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());

  // Update active PDF base64 source
  useEffect(() => {
    if (pdfBase64) {
      setLastValidPdf(pdfBase64);
      setShowingLastValid(false);
      loadPdf(pdfBase64);
    } else if (hasError && lastValidPdf) {
      setShowingLastValid(true);
    }
  }, [pdfBase64, hasError, lastValidPdf]);

  // Calculate optimal fit scale according to container width
  const computeFitScale = useCallback(
    async (doc: pdfjsLib.PDFDocumentProxy, containerEl: HTMLDivElement) => {
      try {
        const page = await doc.getPage(1);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        // 20px padding on each side plus a small safety margin
        const availableWidth = containerEl.clientWidth - 44;
        if (availableWidth > 80 && unscaledViewport.width > 0) {
          const fit = Math.round((availableWidth / unscaledViewport.width) * 100) / 100;
          return Math.max(0.35, Math.min(fit, 2.5));
        }
      } catch (err) {
        console.error('Error computing fit scale:', err);
      }
      return null;
    },
    []
  );

  // Auto-fit responsive observer
  useEffect(() => {
    if (!viewportRef.current || !autoFit || !pdfDoc) return;
    const container = viewportRef.current;

    let timer: NodeJS.Timeout | null = null;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 60) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            computeFitScale(pdfDoc, container).then((newScale) => {
              if (newScale && Math.abs(newScale - scale) > 0.02) {
                setScale(newScale);
              }
            });
          }, 35);
        }
      }
    });

    observer.observe(container);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [autoFit, pdfDoc, scale, computeFitScale]);

  const loadPdf = async (base64Data: string) => {
    try {
      // Save current scroll position before loading new document
      if (viewportRef.current) {
        scrollPosRef.current = {
          top: viewportRef.current.scrollTop,
          left: viewportRef.current.scrollLeft,
        };
      }

      const cleanB64 = base64Data.replace(/^data:application\/pdf;base64,/, '');
      const rawData = atob(cleanB64);
      const uint8Array = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        uint8Array[i] = rawData.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const loadedDoc = await loadingTask.promise;
      setPdfDoc(loadedDoc);
      setTotalPages(loadedDoc.numPages);

      // Immediately apply auto-fit on initial load if enabled
      if (autoFit && viewportRef.current) {
        computeFitScale(loadedDoc, viewportRef.current).then((fitScale) => {
          if (fitScale) setScale(fitScale);
        });
      }
    } catch (err) {
      console.error('Failed to parse and load PDF in pdf.js:', err);
    }
  };

  // High-DPI crisp rendering for all pages
  const renderPages = useCallback(async () => {
    if (!pdfDoc || !viewportRef.current) return;

    const viewportEl = viewportRef.current;
    const pageCanvases = viewportEl.querySelectorAll<HTMLCanvasElement>('canvas.pdf-page-card');

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = pageCanvases[pageNum - 1];
      if (!canvas) continue;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      const cssViewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const existingTask = activeRenderTasksRef.current.get(pageNum);
      if (existingTask) {
        try {
          existingTask.cancel();
        } catch (_) {}
        activeRenderTasksRef.current.delete(pageNum);
      }

      const task = page.render(renderContext);
      activeRenderTasksRef.current.set(pageNum, task);
      try {
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
        }
      } finally {
        if (activeRenderTasksRef.current.get(pageNum) === task) {
          activeRenderTasksRef.current.delete(pageNum);
        }
      }
    }

    // Restore scroll position after render
    if (viewportRef.current) {
      viewportRef.current.scrollTop = scrollPosRef.current.top;
      viewportRef.current.scrollLeft = scrollPosRef.current.left;
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (pdfDoc) {
      renderPages();
    }
  }, [pdfDoc, scale, renderPages]);

  // Keep track of scroll position and active page
  const handleScroll = () => {
    if (!viewportRef.current || !pdfDoc) return;
    const el = viewportRef.current;
    scrollPosRef.current = { top: el.scrollTop, left: el.scrollLeft };

    const canvases = el.querySelectorAll<HTMLCanvasElement>('canvas.pdf-page-card');
    canvases.forEach((canvas, idx) => {
      const rect = canvas.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();
      if (rect.top <= parentRect.top + parentRect.height / 2 && rect.bottom >= parentRect.top) {
        const page = idx + 1;
        setCurrentPage(page);
        setPageInput(String(page));
      }
    });
  };

  // Preset zoom levels including clean 100%
  const ZOOM_LEVELS = [0.5, 0.6, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  const handleZoomIn = () => {
    setAutoFit(false);
    setScale((prev) => {
      const next = ZOOM_LEVELS.find((lvl) => lvl > prev + 0.02);
      return next ?? Math.min(Math.round((prev + 0.1) * 10) / 10, 3.0);
    });
  };

  const handleZoomOut = () => {
    setAutoFit(false);
    setScale((prev) => {
      const prevLevels = ZOOM_LEVELS.filter((lvl) => lvl < prev - 0.02);
      const prevVal = prevLevels[prevLevels.length - 1];
      return prevVal ?? Math.max(Math.round((prev - 0.1) * 10) / 10, 0.35);
    });
  };

  const handleZoomReset = () => {
    setAutoFit(false);
    setScale(1.0);
  };

  const handleToggleFitWidth = () => {
    if (!autoFit) {
      setAutoFit(true);
      if (viewportRef.current && pdfDoc) {
        computeFitScale(pdfDoc, viewportRef.current).then((fitScale) => {
          if (fitScale) setScale(fitScale);
        });
      }
    } else {
      // Toggle off back to standard 100%
      setAutoFit(false);
      setScale(1.0);
    }
  };

  const scrollToPage = (pageNum: number) => {
    if (!viewportRef.current || pageNum < 1 || pageNum > totalPages) return;
    const canvases = viewportRef.current.querySelectorAll<HTMLCanvasElement>('canvas.pdf-page-card');
    const target = canvases[pageNum - 1];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
      setPageInput(String(pageNum));
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const num = parseInt(pageInput, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        scrollToPage(num);
      } else {
        setPageInput(String(currentPage));
      }
    }
  };

  return (
    <div className="pdf-preview-container">
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-group">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1 || totalPages === 0}
            title="Pagina precedente"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="pdf-page-indicator">
            <input
              type="text"
              className="pdf-page-input"
              value={pageInput}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              disabled={totalPages === 0}
            />
            <span>/ {totalPages || 1}</span>
          </div>

          <button
            className="btn btn-ghost btn-icon"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages === 0}
            title="Pagina successiva"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="pdf-toolbar-group">
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleZoomOut}
            disabled={scale <= 0.35}
            title="Riduci zoom"
          >
            <ZoomOut size={14} />
          </button>

          <span
            className="pdf-zoom-label"
            onClick={handleZoomReset}
            style={{ cursor: 'pointer' }}
            title={autoFit ? 'Adattamento automatico attivo (clicca per 100%)' : 'Ripristina zoom 100%'}
          >
            {autoFit ? 'Auto ' : ''}{Math.round(scale * 100)}%
          </span>

          <button
            className="btn btn-ghost btn-icon"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            title="Aumenta zoom"
          >
            <ZoomIn size={14} />
          </button>

          <button
            className={`btn btn-ghost btn-icon ${autoFit ? 'btn-active' : ''}`}
            onClick={handleToggleFitWidth}
            title={autoFit ? 'Adattamento automatico attivo (clicca per disattivare)' : 'Adatta automaticamente alla larghezza'}
          >
            <Maximize2 size={13} />
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={handleZoomReset}
            title="Ripristina zoom 100%"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {showingLastValid && (
        <div className="pdf-stale-banner">
          <AlertTriangle size={14} />
          <span>Visualizzazione ultimo PDF valido (errori nel codice)</span>
        </div>
      )}

      {isCompiling && (
        <div className="pdf-loading-overlay">
          <Loader2 size={13} className="spinning" style={{ color: 'var(--accent-cyan)' }} />
          <span>Compilazione...</span>
        </div>
      )}

      <div className={`pdf-viewport ${autoFit ? 'autofit' : ''}`} ref={viewportRef} onScroll={handleScroll}>
        {pdfDoc ? (
          Array.from({ length: totalPages }).map((_, index) => (
            <canvas key={`pdf-page-${index + 1}`} className="pdf-page-card" />
          ))
        ) : (
          <div className="pdf-empty-state">
            <FileSearch size={48} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>Nessuna anteprima PDF disponibile</div>
            <div style={{ fontSize: 11, maxWidth: 280, color: 'var(--text-muted)' }}>
              Inizia a scrivere o premi "Compila" per generare l'anteprima del documento.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
