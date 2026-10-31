use crate::compiler::{self, run_compilation, CompileResponse};
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
pub fn compile_latex(
    source: String,
    working_dir: Option<String>,
    engine: Option<String>,
) -> Result<CompileResponse, String> {
    run_compilation(&source, working_dir.as_deref(), engine.as_deref())
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
pub fn get_available_compilers() -> Vec<CompilerInfo> {
    let mut compilers = Vec::new();

    // Check Tectonic
    let tectonic_path = compiler::find_tectonic_binary();
    compilers.push(CompilerInfo {
        id: "tectonic".to_string(),
        name: "Tectonic (Offline Bundled)".to_string(),
        available: tectonic_path.is_some(),
        path: tectonic_path.map(|p| p.to_string_lossy().to_string()),
    });

    // Check pdflatex
    let pdflatex_avail = std::process::Command::new("pdflatex")
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
}
