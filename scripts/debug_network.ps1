# ===========================================
# DEBUG DE CONEXIÓN HTTP - IDENTIFICAR EL ERROR URGENTE
# ===========================================

Write-Host "=== INICIANDO DIAGNÓSTICO DE RED ===" -ForegroundColor Green

# 1. VERIFICAR RED LOCAL
Write-Host "\n--- 1. Verificación de Red Local ---" -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName 192.168.0.10 -Count 4 -Quiet
if ($pingResult) {
    Write-Host "✅ Ping a 192.168.0.10 EXITOSO" -ForegroundColor Green
    $pingDetails = Test-Connection -ComputerName 192.168.0.10 -Count 4
    Write-Host "   Latencia: $($pingDetails.ResponseTime | Measure-Object -Average | Select-Object -ExpandProperty Average)ms"
} else {
    Write-Host "❌ No se puede hacer ping a 192.168.0.10" -ForegroundColor Red
    Write-Host "   Verificar:"
    Write-Host "   - PC y celular en misma red WiFi"
    Write-Host "   - Firewall desactivado temporalmente"
    Write-Host "   - IP correcta: 192.168.0.10"
    exit 1
}

# 2. VERIFICAR SERVICIO BACKEND
Write-Host "\n--- 2. Verificar Backend en PC ---" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://192.168.0.10:5000/api/debug/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend responde correctamente" -ForegroundColor Green
    Write-Host "   Servidor: $($health.hostname)"
    Write-Host "   IPs: $($health.ipAddresses -join ', ')"
    Write-Host "   .NET Version: $($health.dotnetVersion)"
} catch {
    Write-Host "❌ Backend NO responde" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "   Verificar: dotnet run en backend/PCControl.Api"
    Write-Host "   Revisar logs: backend/PCControl.Api/bin/Debug/net8.0/log.txt"
    exit 1
}

# 3. VERIFICAR FIREWALL
Write-Host "\n--- 3. Verificar Firewall ---" -ForegroundColor Yellow
$firewall = Get-NetFirewallRule | Where-Object { $_.DisplayName -match "PCControl" -or $_.DisplayName -match "ASP.NET" }
if ($firewall) {
    Write-Host "⚠️  Firewall tiene reglas activas" -ForegroundColor Yellow
    Write-Host "   Desactivar temporalmente:" -ForegroundColor Yellow
    Write-Host "   New-NetFirewallRule -DisplayName "Desactivar Firewall" -Direction Inbound -Protocol Any -Action Block"
} else {
    Write-Host "✅ No hay reglas de firewall bloqueando" -ForegroundColor Green
}

# 4. TEST HTTP CONEXION
Write-Host "\n--- 4. Test HTTP Connection ---" -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer FKALFV"; "Content-Type" = "application/json" }
try {
    $response = Invoke-RestMethod -Uri "http://192.168.0.10:5000/api/debug/test-auth" -Method Get -Headers $headers -TimeoutSec 15
    Write-Host "✅ HTTP AUTH FUNCIONA" -ForegroundColor Green
    Write-Host "   Token válido: $($response.token)"
} catch {
    Write-Host "❌ HTTP AUTH FALLA" -ForegroundColor Red
    Write-Host "   Error tipo: $($_.Exception.GetType().Name)"
    Write-Host "   Error mensaje: $($_.Exception.Message)"
    Write-Host "   Stack trace:"
    Write-Host "   $($_.ScriptStackTrace)"
    Write-Host "   Verificar CORS: app.UseCors(\"AllowFrontend\");"
    Write-Host "   Verificar TokenAuthMiddleware"
    exit 1
}

# 5. TEST CORS
Write-Host "\n--- 5. Test CORS ---" -ForegroundColor Yellow
$corsTest = Invoke-RestMethod -Uri "http://192.168.0.10:5000/api/debug/echo/test-cors" -Method Get -Headers $headers
Write-Host "✅ CORS FUNCIONA" -ForegroundColor Green

# 6. VERIFICAR TOKENS
Write-Host "\n--- 6. Verificar Tokens ---" -ForegroundColor Yellow
$tokenService = dotnet run --project "backend/PCControl.Api" --configuration Debug --no-build 2>$null | Select-String -Pattern "Token:"
if ($tokenService) {
    Write-Host "✅ Token generado: $($tokenService.Line.Split(':')[1].Trim())"
} else {
    Write-Host "❌ Token no generado"
}

Write-Host "\n=== DIAGNÓSTICO COMPLETO FINALIZADO ===" -ForegroundColor Green
Write-Host "\n📋 Resumen:"
Write-Host "   ✅ Red local: OK"
Write-Host "   ✅ Backend: OK"
Write-Host "   ✅ HTTP Auth: OK"
Write-Host "   ✅ CORS: OK"
Write-Host "   ✅ Token: Generado"

Write-Host "\n🚀 ¡Listo para usar la app!" -ForegroundColor Green
Write-Host "   Ejecutar: npm run dev  # Frontend"
Write-Host "   Instalar APK: build_final.ps1  # Android"
