# ============================================================
# Detener PC Remote Control en segundo plano
# ============================================================

$processes = Get-Process -Name "PCControl.Api" -ErrorAction SilentlyContinue

if ($processes) {
    foreach ($p in $processes) {
        Stop-Process -Id $p.Id -Force
        Write-Host "✅ Proceso PCControl.Api (PID: $($p.Id)) detenido con éxito." -ForegroundColor Green
    }
} else {
    Write-Host "ℹ️ PCControl.Api no está en ejecución actualmente." -ForegroundColor Yellow
}
