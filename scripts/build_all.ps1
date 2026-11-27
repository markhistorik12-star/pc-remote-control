# ===========================================
# BUILD COMPLETO: Backend + Android APK
# ===========================================

Write-Host "=== INICIANDO BUILD COMPLETO ===" -ForegroundColor Green

# 1. SOLUCION .NET BACKEND
Write-Host "\n--- 1. Solucionando .NET Compatibility ---" -ForegroundColor Yellow
Set-Location "backend/PCControl.Api"
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = "1"
dotnet restore
./InstallService.ps1
Write-Host "✅ Backend .NET 8.0 listo"

# 2. CONSTRUIR APK ANDROID
Write-Host "\n--- 2. Construyendo APK Android ---" -ForegroundColor Yellow
Set-Location "../frontend/android"
Remove-Item -Recurse -Force "app/build" -ErrorAction SilentlyContinue
./gradlew --stop
if (-not $env:KEYSTORE_PASSWORD) { $env:KEYSTORE_PASSWORD = Read-Host 'Clave del keystore' }
if (-not $env:KEY_PASSWORD) { $env:KEY_PASSWORD = $env:KEYSTORE_PASSWORD }
./gradlew clean
./gradlew assembleRelease --stacktrace

# 3. VERIFICAR RESULTADOS
Write-Host "\n--- 3. Verificando resultados ---" -ForegroundColor Yellow
$apkPath = "app/build/outputs/apk/release/app-release.apk"
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    Write-Host "📱 APK: $($apk.Name)" -ForegroundColor Cyan
    Write-Host "📅 Fecha creación: $($apk.LastWriteTimeUtc)" -ForegroundColor Cyan
    Write-Host "📏 Tamaño: $($apk.Length) bytes" -ForegroundColor Cyan
    
    # Verificar firma
    $verify = jarsigner -verify -verbose $apkPath
    if ($verify -match "Verified:" ) {
        Write-Host "🔐 Firma VERIFICADA" -ForegroundColor Green
    } else {
        Write-Host "❌ Firma NO verificada" -ForegroundColor Red
    }
} else {
    Write-Host "❌ APK no encontrado en $apkPath" -ForegroundColor Red
    Write-Host "Revisar logs de build en build/reports/problems/"
}

Write-Host "\n=== BUILD COMPLETO FINALIZADO ===" -ForegroundColor Green
Write-Host "\n📱 ¡Listo para instalar en tu celular!" -ForegroundColor Green
Write-Host "🔗 $apkPath" -ForegroundColor Yellow
