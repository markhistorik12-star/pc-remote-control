# ============================================================
# Desinstalar Inicio Automático de PC Remote Control
# ============================================================

$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = "$startupFolder\PC Remote Control.lnk"

# 1. Detener proceso
$processes = Get-Process -Name "PCControl.Api" -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($p in $processes) {
        Stop-Process -Id $p.Id -Force
        Write-Host "✅ Proceso detenido." -ForegroundColor Green
    }
}

# 2. Eliminar acceso directo
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "✅ Acceso directo de inicio automático eliminado." -ForegroundColor Green
} else {
    Write-Host "ℹ️ No se encontró el acceso directo en Inicio." -ForegroundColor Yellow
}

Write-Host "Desinstalación completada." -ForegroundColor Green
