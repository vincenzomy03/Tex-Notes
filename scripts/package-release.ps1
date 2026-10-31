$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "==> Compilazione frontend React..." -ForegroundColor Cyan
npm run build

Write-Host "==> Compilazione backend Rust (Release ottimizzata)..." -ForegroundColor Cyan
& "$env:USERPROFILE\.cargo\bin\cargo.exe" build --release --manifest-path src-tauri/Cargo.toml

Write-Host "==> Preparazione cartella release/..." -ForegroundColor Cyan
$releaseDir = "release"
$portableDir = "$releaseDir/Tex-Notes-Portable"

if (Test-Path $releaseDir) {
    Remove-Item -Recurse -Force $releaseDir
}

New-Item -ItemType Directory -Force -Path "$portableDir/bin" | Out-Null
New-Item -ItemType Directory -Force -Path "$releaseDir/Installers" | Out-Null

Copy-Item "src-tauri/target/release/tex-notes.exe" "$portableDir/Tex-Notes.exe" -Force
if (Test-Path "bin/tectonic.exe") {
    Copy-Item "bin/tectonic.exe" "$portableDir/tectonic.exe" -Force
    Copy-Item "bin/tectonic.exe" "$portableDir/bin/tectonic.exe" -Force
}

# Collect existing installers from target bundle if present
if (Test-Path "src-tauri/target/release/bundle") {
    Get-ChildItem -Path "src-tauri/target/release/bundle" -Recurse -Include "*.exe", "*.msi" | Copy-Item -Destination "$releaseDir/Installers" -Force
}

Write-Host "==> Creazione archivio ZIP portatile..." -ForegroundColor Cyan
Compress-Archive -Path $portableDir -DestinationPath "$releaseDir/Tex-Notes-windows-portable.zip" -Force

Write-Host "`n[OK] Cartella release/ creata con successo!" -ForegroundColor Green
Write-Host "File pronti in release/:"
Write-Host " - release\Tex-Notes-Portable\Tex-Notes.exe (App portatile pronta all'uso)"
Write-Host " - release\Tex-Notes-windows-portable.zip (Archivio zip come quello su GitHub)"
Write-Host " - release\Installers\ (Installer di installazione Windows)`n"
