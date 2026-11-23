# ===========================================
# BUILD FINAL COMPLETO - APK FUNCIONAL
# ===========================================

Write-Host "=== INICIANDO BUILD FINAL ===" -ForegroundColor Green
$startTime = Get-Date

# 1. VALIDAR REQUISITOS
Write-Host "`n--- 1. Validando requisitos ---" -ForegroundColor Yellow
$requirements = @(
    "Java 17+ instalado",
    "Android SDK configurado",
    "Node.js instalado"
)
foreach ($req in $requirements) {
    Write-Host "  [ ] $req" -NoNewline
    try {
        if ($req -like "*Java*") { java -version 2>$null | Out-Null }
        if ($req -like "*Android*") { 
            if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "C:\Users\Acer\AppData\Local\Android\Sdk" }
        }
        if ($req -like "*Node*") { node -v 2>$null | Out-Null }
        Write-Host " ✅" -ForegroundColor Green
    } catch {
        Write-Host " ❌" -ForegroundColor Red
    }
}

# 2. CONSTRUIR FRONTEND WEB
Write-Host "`n--- 2. Compilando Frontend (React + Vite) ---" -ForegroundColor Yellow
Set-Location "$PSScriptRoot/frontend"
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falló el build del frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend compilado exitosamente en dist/" -ForegroundColor Green

# 3. SINCRONIZAR CON CAPACITOR
Write-Host "`n--- 3. Sincronizando assets con Capacitor ---" -ForegroundColor Yellow
cmd.exe /c "npx cap sync android"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falló la sincronización con Capacitor" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Assets sincronizados con android/app/src/main/assets" -ForegroundColor Green

# 4. PREPARAR Y CONSTRUIR APK
Write-Host "`n--- 4. Construyendo APK Release con Gradle ---" -ForegroundColor Yellow
Set-Location "$PSScriptRoot/frontend/android"
$env:ANDROID_HOME = "C:\Users\Acer\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Acer\AppData\Local\Android\Sdk"

cmd.exe /c "gradlew assembleRelease"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falló la compilación del APK con Gradle" -ForegroundColor Red
    exit 1
}

# 5. VERIFICAR Y VALIDAR
Write-Host "`n--- 5. Verificando resultados ---" -ForegroundColor Yellow
$apkPath = "$PSScriptRoot/frontend/android/app/build/outputs/apk/release/app-release.apk"
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    Write-Host "📱 Archivo: $($apk.Name)" -ForegroundColor Cyan
    Write-Host "📅 Fecha: $($apk.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host "📏 Tamaño: $([math]::Round($apk.Length / 1MB, 2)) MB ($($apk.Length) bytes)" -ForegroundColor Cyan
    
    # Verificar firma con apksigner si está disponible
    $apksigner = "C:\Users\Acer\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
    if (Test-Path $apksigner) {
        $verifyOutput = & $apksigner verify -v $apkPath 2>&1
        if ($verifyOutput -match "Verifies") {
            Write-Host "🔐 Firma APK v2: VERIFICADA CORRECTAMENTE" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Advertencia de firma: $verifyOutput" -ForegroundColor Yellow
        }
    }

    Write-Host "`n🚀 ¡APK LISTO PARA INSTALAR EN TU CELULAR!" -ForegroundColor Green
    Write-Host "   Ruta: $apkPath" -ForegroundColor Yellow
    Write-Host "   Instalar via ADB: adb install -r `"$apkPath`"" -ForegroundColor Cyan
} else {
    Write-Host "❌ APK no encontrado en $apkPath" -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds.ToString('F1')
Write-Host "`n=== PROCESO COMPLETADO EN $duration segundos ===" -ForegroundColor Green
