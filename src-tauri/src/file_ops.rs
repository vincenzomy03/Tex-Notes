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

/// Copy external media file into document's images directory
pub fn copy_media_to_document_images(src_path_str: &str, doc_dir_str: &str) -> Result<String, String> {
    let src_path = std::path::Path::new(src_path_str);
    let original_name = src_path
        .file_name()
        .ok_or_else(|| "Nome file media non valido".to_string())?
        .to_string_lossy();

    // Sanitize filename: replace spaces with underscores to prevent LaTeX graphicx parse errors
    let sanitized_name = original_name.replace(' ', "_");

    let images_dir = std::path::Path::new(doc_dir_str).join("images");
    fs::create_dir_all(&images_dir).map_err(|e| format!("Impossibile creare la cartella 'images': {}", e))?;

    let dest_path = images_dir.join(&sanitized_name);
    fs::copy(src_path, &dest_path).map_err(|e| format!("Impossibile copiare il file: {}", e))?;

    Ok(sanitized_name)
}
