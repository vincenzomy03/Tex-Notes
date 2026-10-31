$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "==> Compilazione frontend React..." -ForegroundColor Cyan
npm run build

Write-Host "==> Compilazione backend Rust (Debug)..." -ForegroundColor Cyan
& "$env:USERPROFILE\.cargo\bin\cargo.exe" build --manifest-path src-tauri/Cargo.toml

Write-Host "==> Preparazione cartella debug/..." -ForegroundColor Cyan
$debugDir = "debug"
if (Test-Path $debugDir) {
    Remove-Item -Recurse -Force $debugDir
}
New-Item -ItemType Directory -Force -Path "$debugDir/bin" | Out-Null

Copy-Item "src-tauri/target/debug/tex-notes.exe" "$debugDir/Tex-Notes-Debug.exe" -Force
Get-ChildItem -Path "src-tauri/target/debug" -Filter "*.dll" | Copy-Item -Destination $debugDir -Force
if (Test-Path "bin/tectonic.exe") {
    Copy-Item "bin/tectonic.exe" "$debugDir/tectonic.exe" -Force
    Copy-Item "bin/tectonic.exe" "$debugDir/bin/tectonic.exe" -Force
}

Write-Host "`n[OK] Cartella debug/ creata con successo!" -ForegroundColor Green
Write-Host "Puoi avviare l'app di prova facendo doppio clic su: debug\Tex-Notes-Debug.exe`n"
