use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::fs;

/// Read text file content safely
pub fn read_file(path_str: &str) -> Result<String, String> {
    fs::read_to_string(path_str).map_err(|e| format!("Failed to read file '{}': {}", path_str, e))
}

/// Write text file content safely
pub fn write_file(path_str: &str, content: &str) -> Result<(), String> {
    fs::write(path_str, content).map_err(|e| format!("Failed to write file '{}': {}", path_str, e))
}

/// Save decoded base64 PDF bytes to target file
pub fn save_pdf(target_path: &str, base64_data: &str) -> Result<(), String> {
    let clean_b64 = if let Some(idx) = base64_data.find("base64,") {
        &base64_data[idx + 7..]
    } else {
        base64_data
    };

    let bytes = STANDARD
        .decode(clean_b64.trim())
        .map_err(|e| format!("Failed to decode PDF base64 data: {}", e))?;

    fs::write(target_path, bytes).map_err(|e| format!("Failed to save PDF to '{}': {}", target_path, e))
}
