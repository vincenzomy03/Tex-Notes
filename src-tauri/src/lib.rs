pub mod commands;
pub mod compiler;
pub mod file_ops;



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::compile_latex,
            commands::read_document_file,
            commands::save_document_file,
            commands::export_pdf,
            commands::get_available_compilers,
            commands::open_external_url,
            commands::download_and_install_update,
            commands::copy_media_to_images,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tex-Notes application");
}
