# ============================================================
# Instalador de Inicio Automático en Segundo Plano (versión 2)
# ============================================================
Write-Host "=== Configurando Inicio Automático en Segundo Plano ===" -ForegroundColor Green

# Ruta del proyecto y publicación
$projectRoot = "g:\\Programacion\\Remote control PC"
$publishDir = "$projectRoot\\backend\\PCControl.Api\\publish"
$exePath = "$publishDir\\PCControl.Api.exe"

# 1. Compilar / publicar backend si falta el ejecutable
if (-not (Test-Path $exePath)) {
    Write-Host "Compilando backend..." -ForegroundColor Yellow
    dotnet publish "$projectRoot\\backend\\PCControl.Api" -c Release -o $publishDir -p:PublishTrimmed=true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:PublishReadyToRun=true -p:StripSymbols=true
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al compilar el backend." -ForegroundColor Red
        exit 1
    }
}

# 2. Definir rutas de logs para capturar salida del backend
$outLog = "$publishDir\\api_stdout.log"
$errLog = "$publishDir\\api_stderr.log"

# 3. Configurar puerto y variables de entorno
$port = 5001
$env:ASPNETCORE_URLS = "http://localhost:$port"
# Iniciar el proceso del backend (una sola vez) con redirección de logs
$env:COMPlus_GCHeapHardLimit = 52428800
if (-not (Get-Process -Name "PCControl.Api" -ErrorAction SilentlyContinue)) {
    Write-Host "Iniciando servidor en segundo plano..." -ForegroundColor Yellow
    Start-Process -FilePath $exePath -WindowStyle Hidden -WorkingDirectory $publishDir `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog
} else {
    Write-Host "El proceso ya está corriendo." -ForegroundColor Green
}

# 4. Esperar a que el servidor responda (máx 20 s)
$maxAttempts = 10
$delay = 2
$ok = $false
for ($i = 0; $i -lt $maxAttempts; $i++) {
    Start-Sleep -Seconds $delay
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:$port/health" -Method Get -TimeoutSec 3
        $ok = $true
        break
    } catch { }
}
if (-not $ok) {
    Write-Host "⚠️ El servidor no respondió a /health después de iniciar." -ForegroundColor Yellow
    Write-Host "Revisa los logs en $outLog y $errLog para más detalles." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Servidor respondió a /health, probando autenticación..." -ForegroundColor Green
    try {
        $authRes = Invoke-RestMethod -Uri "http://localhost:$port/api/debug/test-auth" -Headers @{Authorization = 'Bearer FKALFV'} -Method Get -TimeoutSec 5
        Write-Host "✅ Autenticación OK: $($authRes | ConvertTo-Json -Compress)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Autenticación falló: $_" -ForegroundColor Yellow
    }
}

Write-Host "\n============================================================" -ForegroundColor Cyan
Write-Host "¡TODO LISTO!" -ForegroundColor Green
Write-Host "• El servidor se iniciará automáticamente cada vez que prendas el PC (ejecuta este script al iniciar)."
Write-Host "• Consumo estimado: ~15 MB de RAM y 0% CPU en reposo."
Write-Host "• Para detenerlo cuando quieras: ejecuta .\\detener_servicio.ps1"
Write-Host "============================================================" -ForegroundColor Cyan
