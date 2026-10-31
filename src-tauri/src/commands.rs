use crate::compiler::{self, create_hidden_command, run_compilation, CompileResponse};
use crate::file_ops;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompilerInfo {
    pub id: String,
    pub name: String,
    pub available: bool,
    pub path: Option<String>,
}

#[tauri::command]
pub async fn compile_latex(
    source: String,
    working_dir: Option<String>,
    engine: Option<String>,
) -> Result<CompileResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_compilation(&source, working_dir.as_deref(), engine.as_deref())
    })
    .await
    .map_err(|e| format!("Background thread error: {}", e))?
}

#[tauri::command]
pub fn read_document_file(path: String) -> Result<String, String> {
    file_ops::read_file(&path)
}

#[tauri::command]
pub fn save_document_file(path: String, content: String) -> Result<(), String> {
    file_ops::write_file(&path, &content)
}

#[tauri::command]
pub fn export_pdf(target_path: String, base64_data: String) -> Result<(), String> {
    file_ops::save_pdf(&target_path, &base64_data)
}

#[tauri::command]
pub async fn get_available_compilers() -> Vec<CompilerInfo> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut compilers = Vec::new();

        // Check Tectonic
        let tectonic_path = compiler::find_tectonic_binary();
        compilers.push(CompilerInfo {
            id: "tectonic".to_string(),
            name: "Tectonic (Offline Bundled)".to_string(),
            available: tectonic_path.is_some(),
            path: tectonic_path.map(|p| p.to_string_lossy().to_string()),
        });

        // Check pdflatex (hidden command, no console window)
        let pdflatex_avail = create_hidden_command("pdflatex")
            .arg("--version")
            .output()
            .is_ok();
        compilers.push(CompilerInfo {
            id: "pdflatex".to_string(),
            name: "pdfLaTeX (Sistema MiKTeX/TeXLive)".to_string(),
            available: pdflatex_avail,
            path: if pdflatex_avail {
                Some("pdflatex".to_string())
            } else {
                None
            },
        });

        compilers
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub fn copy_media_to_images(src_path: String, doc_dir: String) -> Result<String, String> {
    file_ops::copy_media_to_document_images(&src_path, &doc_dir)
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("cmd")
            .args(&["/C", "start", "", &url])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Impossibile aprire il browser: {}", e))?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = url;
        Ok(())
    }
}

#[tauri::command]
pub async fn download_and_install_update(
    app_handle: tauri::AppHandle,
    download_url: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let temp_installer = std::env::temp_dir().join("Tex-Notes-Setup-Update.exe");
        let temp_installer_str = temp_installer.to_string_lossy().to_string();

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            // Download installer using Windows built-in curl.exe with -L for redirects
            let mut curl_cmd = std::process::Command::new("curl.exe");
            curl_cmd.creation_flags(0x08000000);
            curl_cmd
                .arg("-L")
                .arg("-f")
                .arg("-s")
                .arg("-S")
                .arg("-o")
                .arg(&temp_installer_str)
                .arg(&download_url);

            let status = curl_cmd.status().map_err(|e| format!("Errore di rete: {}", e))?;
            if !status.success() || !temp_installer.exists() {
                return Err("Download dell'aggiornamento non riuscito".to_string());
            }

            // Launch the setup executable
            let mut run_cmd = std::process::Command::new("cmd");
            run_cmd.creation_flags(0x08000000);
            run_cmd.args(&["/C", "start", "", &temp_installer_str]);
            run_cmd.spawn().map_err(|e| format!("Impossibile avviare l'installer: {}", e))?;

            // Close current application so installer can overwrite files cleanly
            app_handle.exit(0);
            Ok(())
        }
        #[cfg(not(windows))]
        {
            Err("Aggiornamento supportato solo su Windows".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
