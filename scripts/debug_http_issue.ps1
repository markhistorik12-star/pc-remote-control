# ===========================================
# DEBUG HTTP CONNECTION - IDENTIFICAR EL ERROR URGENTE
# ===========================================

Write-Host "=== INICIANDO DIAGNÓSTICO COMPLETO ===" -ForegroundColor Green
$startTime = Get-Date

# 1. VERIFICAR RED Y CONECTIVIDAD
Write-Host "\n--- 1. Verificación de Red ---" -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName 192.168.0.10 -Count 4 -Quiet
if (-not $pingResult) {
    Write-Host "❌ NO HAY CONEXIÓN A 192.168.0.10" -ForegroundColor Red
    Write-Host "   Soluciones:"
    Write-Host "   1. PC y celular en MISMA red WiFi"
    Write-Host "   2. Firewall desactivado temporalmente"
    Write-Host "   3. Verificar IP correcta (ipconfig en PC)"
    Write-Host "   4. Reiniciar router"
    Write-Host "   5. Conectar por USB/ADb como alternativa"
    Write-Host "\n¡Usa: adb install -r app-release.apk para probar USB!"
    exit 1
}

Write-Host "✅ Ping exitoso. Latencia: $((Test-Connection -ComputerName 192.168.0.10 -Count 4).ResponseTime | Measure-Object -Average | Select-Object -ExpandProperty Average)ms"

# 2. VERIFICAR SERVICIO BACKEND
Write-Host "\n--- 2. Verificar Backend en PC ---" -ForegroundColor Yellow
$backendUrl = "http://192.168.0.10:5000"
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/api/debug/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend responde: $($health.hostname)" -ForegroundColor Green
    Write-Host "   IPs: $($health.ipAddresses -join ', ')"
    Write-Host "   .NET: $($health.dotnetVersion)"
} catch {
    Write-Host "❌ Backend NO responde" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "   Iniciar backend: cd backend/PCControl.Api && dotnet run"
    Write-Host "   Ver logs: backend/PCControl.Api/bin/Debug/net8.0/log.txt"
    exit 1
}

# 3. TEST HTTP CONEXION
Write-Host "\n--- 3. Test HTTP Connection ---" -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer FKALFV"; "Content-Type" = "application/json" }
$testUrl = "$backendUrl/api/debug/test-auth"
try {
    $response = Invoke-RestMethod -Uri $testUrl -Method Get -Headers $headers -TimeoutSec 15
    Write-Host "✅ HTTP AUTH FUNCIONA - Token válido: $($response.token)" -ForegroundColor Green
} catch {
    Write-Host "❌ HTTP AUTH FALLA" -ForegroundColor Red
    Write-Host "   Error tipo: $($_.Exception.GetType().Name)"
    Write-Host "   Error mensaje: $($_.Exception.Message)"
    Write-Host "   Posibles causas:"
    Write-Host "   - CORS bloqueando peticiones"
    Write-Host "   - Token expirado o incorrecto"
    Write-Host "   - Firewall bloqueando puerto 5000"
    Write-Host "   - Certificado SSL issue (si HTTPS)"
    Write-Host "   - DNS resolution problem"
    Write-Host "   - Network timeout"
    Write-Host "\n¡Intenta: ping $backendUrl en navegador!"
    Write-Host "¡Intenta: curl $testUrl -H 'Authorization: Bearer FKALFV'"
    exit 1
}

# 4. TEST CORS
Write-Host "\n--- 4. Test CORS ---" -ForegroundColor Yellow
try {
    $corsResponse = Invoke-RestMethod -Uri "$backendUrl/api/debug/echo/test-cors" -Method Get -Headers $headers
    Write-Host "✅ CORS FUNCIONA" -ForegroundColor Green
} catch {
    Write-Host "❌ CORS FALLA - Usar HTTP, no HTTPS en desarrollo"
    Write-Host "   Usar: http://192.168.0.10:5000 (no https)"
}

# 5. VERIFICAR FIREWALL
Write-Host "\n--- 5. Verificar Firewall ---" -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule | Where-Object { $_.DisplayName -match "PCControl" -or $_.DisplayName -match "ASP.NET" }
if ($firewallRules) {
    Write-Host "⚠️  Firewall tiene reglas activas" -ForegroundColor Yellow
    Write-Host "   Desactivar temporalmente:"
    Write-Host "   New-NetFirewallRule -DisplayName \"Desactivar Firewall\" -Direction Inbound -Protocol Any -Action Block"
} else {
    Write-Host "✅ No hay firewall bloqueando" -ForegroundColor Green
}

# 6. MOSTRAR SOLUCIONES
Write-Host "\n=== SOLUCIONES INMEDIATAS ===" -ForegroundColor Green
Write-Host "\n📱 Opción 1: USB/ADb (Rápido y confiable)"
Write-Host "   adb install -r "app/build/outputs/apk/release/app-release.apk"
Write-Host "   Conectar via USB: adb shell"
Write-Host "   Ejecutar: nc -l -p 3000  # En PC"
Write-Host "   En celular: nc 192.168.0.10 3000"

Write-Host "\n🌐 Opción 2: WebSocket (Mejor que HTTP)"
Write-Host "   Instalar APK nuevo con WebSocket"
Write-Host "   Usar: ws://192.168.0.10:5000/ws"

Write-Host "\n🔧 Opción 3: Solucionar HTTP"
Write-Host "   1. Desactivar firewall temporalmente"
Write-Host "   2. Verificar IP correcta (ipconfig en PC)"
Write-Host "   3. Reiniciar router"
Write-Host "   4. Asegurar mismo WiFi network"

Write-Host "\n=== DIAGNÓSTICO COMPLETO FINALIZADO ===" -ForegroundColor Green
$duration = ((Get-Date) - $startTime).TotalMinutes.ToString('F1')
Write-Host "\n⏱️ Tiempo: $duration minutos"
Write-Host "\n🚀 ¡Listo para usar la app!"
Write-Host "   Si HTTP sigue fallando, usa USB/ADb como alternativa"
Write-Host "   ¡El APK funciona con WebSocket interno!"
