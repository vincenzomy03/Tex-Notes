import { CompileResult, CompileError } from '../types';

// Helper to detect if running inside Tauri 2 environment
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export interface CompilerOption {
  id: string;
  name: string;
  available: boolean;
  path?: string;
}

export async function fetchAvailableCompilers(): Promise<CompilerOption[]> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<CompilerOption[]>('get_available_compilers');
    } catch (err) {
      console.warn('Failed to get compilers from Tauri:', err);
    }
  }

  return [
    { id: 'tectonic', name: 'Tectonic (Offline)', available: true },
    { id: 'pdflatex', name: 'pdfLaTeX (Sistema)', available: true },
  ];
}

export async function compileLatexSource(
  source: string,
  workingDir?: string | null,
  engine: string = 'tectonic'
): Promise<CompileResult> {
  const startTime = Date.now();

  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const response = await invoke<{
        success: boolean;
        pdf_base64?: string;
        errors: { line: number; message: string; file?: string; raw?: string }[];
        raw_log: string;
        duration_ms: number;
      }>('compile_latex', {
        source,
        workingDir: workingDir || null,
        engine,
      });

      return {
        success: response.success,
        pdfBase64: response.pdf_base64,
        errors: response.errors || [],
        rawLog: response.raw_log,
        durationMs: response.duration_ms,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error('Tauri compile error:', err);
      return {
        success: false,
        errors: [{ line: 1, message: String(err) }],
        rawLog: String(err),
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  // Web Browser / Fallback simulation for live dev testing
  // In pure browser environment, check for syntax errors in source
  const simulatedErrors: CompileError[] = [];
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    // Check unmatched braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    if (openBraces !== closeBraces && !line.trim().startsWith('%')) {
      simulatedErrors.push({
        line: index + 1,
        message: `Possibile parentesi graffa non bilanciata: '${line.trim()}'`,
      });
    }

    // Check undefined placeholder commands
    if (line.includes('\\erroreEsempio')) {
      simulatedErrors.push({
        line: index + 1,
        message: `Comando non definito: \\erroreEsempio`,
      });
    }
  });

  const duration = Date.now() - startTime + 400;

  return {
    success: simulatedErrors.length === 0,
    errors: simulatedErrors,
    rawLog: simulatedErrors.length === 0
      ? 'Output simulato browser: compilazione completata con successo.'
      : 'Errori rilevati durante la verifica sintattica del codice.',
    durationMs: duration,
    timestamp: Date.now(),
  };
}
