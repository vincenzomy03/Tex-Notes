use base64::{engine::general_purpose::STANDARD, Engine as _};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Instant;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Windows creation flag to completely suppress any console / cmd window popup
#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Create a child process command that runs silently without popping up a console window on Windows
pub fn create_hidden_command<P: AsRef<std::ffi::OsStr>>(program: P) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompileError {
    pub line: usize,
    pub message: String,
    pub file: Option<String>,
    pub raw: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResponse {
    pub success: bool,
    pub pdf_base64: Option<String>,
    pub errors: Vec<CompileError>,
    pub raw_log: String,
    pub duration_ms: u64,
}

/// Helper to locate the Tectonic executable.
/// Searches in ./bin, ../bin, next to executable, parent directories, resources, or in PATH.
pub fn find_tectonic_binary() -> Option<PathBuf> {
    let bin_names = if cfg!(windows) {
        vec!["tectonic.exe", "tectonic"]
    } else {
        vec!["tectonic"]
    };

    let subdirs = [
        "bin",
        "resources/bin",
        "resources",
        "_up_/bin",
        "resources/_up_/bin",
        "_up_",
        "resources/_up_",
        "",
    ];

    // 1. Check relative candidate paths from current working directory
    if let Ok(cwd) = std::env::current_dir() {
        for prefix in &["", "..", "../.."] {
            for sub in &subdirs {
                for name in &bin_names {
                    let mut candidate = cwd.clone();
                    if !prefix.is_empty() {
                        candidate = candidate.join(prefix);
                    }
                    if !sub.is_empty() {
                        candidate = candidate.join(sub);
                    }
                    candidate = candidate.join(name);
                    if candidate.is_file() {
                        return Some(candidate);
                    }
                }
            }
        }
    }

    // 2. Search around current_exe walking up parent directories (dev & production bundle)
    if let Ok(exe_path) = std::env::current_exe() {
        let mut curr = exe_path.parent();
        let mut depth = 0;
        while let Some(dir) = curr {
            if depth > 6 {
                break;
            }
            for sub in &subdirs {
                for name in &bin_names {
                    let candidate = if sub.is_empty() {
                        dir.join(name)
                    } else {
                        dir.join(sub).join(name)
                    };
                    if candidate.is_file() {
                        return Some(candidate);
                    }
                }
            }
            curr = dir.parent();
            depth += 1;
        }
    }

    // 3. Search in standard install locations on Windows (NSIS AppData)
    #[cfg(windows)]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let p = PathBuf::from(local_app_data).join("Programs").join("Tex-Notes");
            for sub in &subdirs {
                for name in &bin_names {
                    let candidate = if sub.is_empty() {
                        p.join(name)
                    } else {
                        p.join(sub).join(name)
                    };
                    if candidate.is_file() {
                        return Some(candidate);
                    }
                }
            }
        }
    }

    // 4. Check system PATH
    if create_hidden_command("tectonic").arg("--version").output().is_ok() {
        return Some(PathBuf::from("tectonic"));
    }

    None
}

/// Parse LaTeX log output to extract line numbers and error descriptions
pub fn parse_latex_errors(log_text: &str) -> Vec<CompileError> {
    let mut errors = Vec::new();

    // Regex for standard TeX error format:
    // ! Undefined control sequence.
    // l.14 \foo
    let tex_err_re = Regex::new(r"(?m)^!\s*(.*?)\r?\n(?:[\s\S]*?)l\.(\d+)(.*?)$").unwrap();
    for cap in tex_err_re.captures_iter(log_text) {
        let msg = cap.get(1).map_or("", |m| m.as_str()).trim();
        let line_num: usize = cap.get(2).map_or("0", |m| m.as_str()).parse().unwrap_or(0);
        let snippet = cap.get(3).map_or("", |m| m.as_str()).trim();

        let full_msg = if snippet.is_empty() {
            msg.to_string()
        } else {
            format!("{}: {}", msg, snippet)
        };

        errors.push(CompileError {
            line: line_num,
            message: full_msg,
            file: None,
            raw: Some(cap.get(0).map_or("", |m| m.as_str()).to_string()),
        });
    }

    // Regex for Tectonic/rust-style errors:
    // error: ... (main.tex:14)
    let tectonic_re = Regex::new(r"(?i)error:\s*(.*?)(?:\((?:.*?:)?(\d+)\)|line\s+(\d+))").unwrap();
    for cap in tectonic_re.captures_iter(log_text) {
        let msg = cap.get(1).map_or("", |m| m.as_str()).trim();
        let line_num: usize = cap
            .get(2)
            .or_else(|| cap.get(3))
            .map_or("0", |m| m.as_str())
            .parse()
            .unwrap_or(0);

        if !errors.iter().any(|e| e.line == line_num && e.message.contains(msg)) {
            errors.push(CompileError {
                line: line_num,
                message: msg.to_string(),
                file: None,
                raw: Some(cap.get(0).map_or("", |m| m.as_str()).to_string()),
            });
        }
    }

    errors
}

/// Compile LaTeX source code to PDF
pub fn run_compilation(
    source: &str,
    working_dir: Option<&str>,
    engine: Option<&str>,
) -> Result<CompileResponse, String> {
    let start_time = Instant::now();

    // Choose temporary compile directory
    let temp_dir_holder = if working_dir.is_none() {
        Some(tempfile::Builder::new().prefix("texnotes_").tempdir().map_err(|e| e.to_string())?)
    } else {
        None
    };

    let compile_dir: PathBuf = if let Some(ref dir) = working_dir {
        PathBuf::from(dir)
    } else {
        temp_dir_holder.as_ref().unwrap().path().to_path_buf()
    };

    let tex_file_path = compile_dir.join("_texnotes_main.tex");
    let pdf_file_path = compile_dir.join("_texnotes_main.pdf");
    let log_file_path = compile_dir.join("_texnotes_main.log");

    // Write source to file
    fs::write(&tex_file_path, source).map_err(|e| format!("Failed to write source: {}", e))?;

    let selected_engine = engine.unwrap_or("tectonic");
    let mut raw_log = String::new();
    let mut success = false;

    if selected_engine == "tectonic" {
        let tectonic_bin = find_tectonic_binary().unwrap_or_else(|| PathBuf::from("tectonic"));

        let output = create_hidden_command(&tectonic_bin)
            .current_dir(&compile_dir)
            .arg("--outdir")
            .arg(&compile_dir)
            .arg(&tex_file_path)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                raw_log = format!("STDOUT:\n{}\n\nSTDERR:\n{}", stdout, stderr);
                success = out.status.success() && pdf_file_path.exists();
            }
            Err(e) => {
                raw_log = format!("Failed to execute Tectonic: {}. Trying fallback pdflatex...", e);
            }
        }
    }

    // Fallback to pdflatex if tectonic failed or if pdflatex engine selected
    if !success && (selected_engine == "pdflatex" || !pdf_file_path.exists()) {
        let pdflatex_cmd = create_hidden_command("pdflatex")
            .current_dir(&compile_dir)
            .arg("-interaction=nonstopmode")
            .arg("-output-directory")
            .arg(&compile_dir)
            .arg(&tex_file_path)
            .output();

        if let Ok(out) = pdflatex_cmd {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            raw_log.push_str(&format!("\n\n--- PDFLATEX ATTEMPT ---\nSTDOUT:\n{}\n\nSTDERR:\n{}", stdout, stderr));
            success = pdf_file_path.exists();
        }
    }

    // Append log file contents if present
    if log_file_path.exists() {
        if let Ok(log_content) = fs::read_to_string(&log_file_path) {
            raw_log.push_str("\n\n--- TEX LOG FILE ---\n");
            raw_log.push_str(&log_content);
        }
    }

    let errors = parse_latex_errors(&raw_log);

    let pdf_base64 = if pdf_file_path.exists() {
        match fs::read(&pdf_file_path) {
            Ok(bytes) => Some(STANDARD.encode(bytes)),
            Err(_) => None,
        }
    } else {
        None
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    // Cleanup auxiliary files
    let _ = fs::remove_file(&tex_file_path);
    let _ = fs::remove_file(compile_dir.join("_texnotes_main.aux"));
    let _ = fs::remove_file(compile_dir.join("_texnotes_main.out"));

    // In temp directory mode, the tempdir is automatically dropped here
    Ok(CompileResponse {
        success: success && pdf_base64.is_some(),
        pdf_base64,
        errors,
        raw_log,
        duration_ms,
    })
}
