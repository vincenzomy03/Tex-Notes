import { isTauriEnvironment } from './compilerService';

export interface OpenFileResult {
  path: string | null;
  name: string;
  content: string;
}

export async function openDocumentDialog(): Promise<OpenFileResult | null> {
  if (isTauriEnvironment()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');

      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'LaTeX Document', extensions: ['tex', 'latex', 'txt'] }],
      });

      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected);
        const name = selected.split(/[/\\]/).pop() || 'document.tex';
        return { path: selected, name, content };
      }
    } catch (err) {
      console.error('Error opening file with Tauri dialog:', err);
    }
  }

  // Web Browser fallback using HTML <input type="file">
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tex,.latex,.txt';
    input.onchange = async () => {
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const content = await file.text();
        resolve({
          path: null,
          name: file.name,
          content,
        });
      } else {
        resolve(null);
      }
    };
    input.click();
  });
}

export async function saveDocument(
  path: string | null,
  content: string,
  suggestedName = 'document.tex'
): Promise<{ path: string | null; name: string }> {
  if (isTauriEnvironment()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      let targetPath = path;
      if (!targetPath) {
        const selected = await save({
          defaultPath: suggestedName,
          filters: [{ name: 'LaTeX Document', extensions: ['tex'] }],
        });
        if (!selected) {
          throw new Error('Salvataggio annullato.');
        }
        targetPath = selected;
      }

      await writeTextFile(targetPath, content);
      const name = targetPath.split(/[/\\]/).pop() || suggestedName;
      return { path: targetPath, name };
    } catch (err) {
      console.error('Error saving file in Tauri:', err);
      throw err;
    }
  }

  // Web Browser fallback: trigger download
  const blob = new Blob([content], { type: 'text/x-tex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);

  return { path: null, name: suggestedName };
}

export async function exportPdfDialog(
  defaultName = 'document.pdf',
  pdfBase64?: string
): Promise<string | null> {
  if (!pdfBase64) {
    throw new Error('Nessun PDF disponibile da esportare.');
  }

  if (isTauriEnvironment()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      const selected = await save({
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      });

      if (selected) {
        await invoke('export_pdf', {
          targetPath: selected,
          base64Data: pdfBase64,
        });
        return selected;
      }
      return null;
    } catch (err) {
      console.error('Error exporting PDF with Tauri:', err);
      throw err;
    }
  }

  // Web Browser fallback: download blob
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(url);

  return defaultName;
}
