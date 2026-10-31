$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

Write-Host "==> Compilazione app con Tauri CLI (Debug con frontend integrato)..." -ForegroundColor Cyan
npx tauri build --debug --no-bundle

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
