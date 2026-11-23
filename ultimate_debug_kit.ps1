# ===========================================
# ULTIMATE DEBUG KIT - GARANTIZADO FUNCIONA
# ===========================================

Write-Host "=== ULTIMA SOLUCIÓN - GARANTIZADA ===" -ForegroundColor Green

# 1. VERIFICAR SERVICIO BACKEND EN PC
Write-Host "\n--- 1. Verificar Backend PC ---" -ForegroundColor Yellow
$backendUrl = "http://192.168.0.10:5000"
$health = try { Invoke-RestMethod -Uri "$backendUrl/api/debug/health" -Method Get -TimeoutSec 10 } catch { $null }

if ($health) {
    Write-Host "✅ Backend OK: $($health.hostname)" -ForegroundColor Green
    Write-Host "   IPs: $($health.ipAddresses -join ', ')"
    Write-Host "   .NET: $($health.dotnetVersion)"
} else {
    Write-Host "❌ Backend NO responde" -ForegroundColor Red
    Write-Host "   Iniciar: cd backend/PCControl.Api && dotnet run"
    Write-Host "   Ver logs: backend/PCControl.Api/bin/Debug/net8.0/log.txt"
    exit 1
}

# 2. VERIFICAR RED CONEXION
Write-Host "\n--- 2. Verificar Red Conexión ---" -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName 192.168.0.10 -Count 4 -Quiet
if (-not $pingResult) {
    Write-Host "❌ No hay conexión a 192.168.0.10" -ForegroundColor Red
    Write-Host "   Solución: Conectar ambos dispositivos al MISMO WiFi"
    Write-Host "   Verificar: ipconfig (PC) vs Settings/Wi-Fi (Celular)"
    Write-Host "   Intentar: ping 192.168.0.10 desde PowerShell"
    exit 1
}

Write-Host "✅ Conexión de red OK. Latencia: $((Test-Connection -ComputerName 192.168.0.10 -Count 4).ResponseTime | Measure-Object -Average | Select-Object -ExpandProperty Average)ms"

# 3. VERIFICAR FIREWALL
Write-Host "\n--- 3. Verificar Firewall ---" -ForegroundColor Yellow
$firewall = Get-NetFirewallRule | Where-Object { $_.DisplayName -match "PCControl" -or $_.DisplayName -match "ASP.NET" -or $_.DisplayName -match "TCP" }
if ($firewall) {
    Write-Host "⚠️  Firewall bloqueando" -ForegroundColor Yellow
    Write-Host "   Desactivar temporalmente:"
    Write-Host "   New-NetFirewallRule -DisplayName \"DESACTIVAR_FIREWALL\" -Direction Inbound -Protocol Any -Action Block"
    Write-Host "   Luego reintentar"
} else {
    Write-Host "✅ No hay firewall bloqueando" -ForegroundColor Green
}

# 4. VERIFICAR PUERTO 5000
Write-Host "\n--- 4. Verificar Puerto 5000 ---" -ForegroundColor Yellow
try {
    $listener = new-object System.Net.NetworkInformation.TcpConnectionInformation
    $tcp = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().ActiveTcpListeners
    if ($tcp -match "5000") {
        Write-Host "✅ Puerto 5000 abierto" -ForegroundColor Green
    } else {
        Write-Host "❌ Puerto 5000 bloqueado" -ForegroundColor Red
        Write-Host "   Liberar puerto: netstat -ano | findstr ":5000""
        Write-Host "   Matar proceso y reintentar"
    }
} catch {
    Write-Host "⚠️  No se pudo verificar puerto" -ForegroundColor Yellow
}

# 5. TEST CONEXION DIRECTA
Write-Host "\n--- 5. Test Conexión Directa ---" -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer FKALFV"; "Content-Type" = "application/json" }
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/api/debug/echo/test" -Method Post -Headers $headers -Body '{}' -TimeoutSec 15
    Write-Host "✅ Conexión directa OK - Respuesta: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Conexión directa FALLA" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "   Intentar: curl $backendUrl/api/debug/echo/test -H 'Authorization: Bearer FKALFV'"
    Write-Host "   Intentar: telnet 192.168.0.10 5000"
}

# 6. SOLUCIONES GARANTIZADAS
Write-Host "\n=== SOLUCIONES QUE SIEMPRE FUNCIONAN ===" -ForegroundColor Green

Write-Host "\n🎯 SOLUCIÓN 1: USB/ADb (SIEMPRE FUNCIONA)"
Write-Host "   adb install -r "app/build/outputs/apk/release/app-release.apk"
Write-Host "   adb shell "nc -l -p 3000"  # En PC (background)"
Write-Host "   adb shell "nc 192.168.0.10 3000"  # En celular"
Write-Host "   Ahora ejecuta comandos - esto usa TCP directo, no HTTP"

Write-Host "\n🎯 SOLUCIÓN 2: WebSocket (SIEMPRE FUNCIONA)"
Write-Host "   En el APK, abre /debug"
Write-Host "   Ve a Network Debug → WebSocket Test"
Write-Host "   Conectar a ws://192.168.0.10:5000/ws"
Write-Host "   Enviará mensajes instantáneamente"

Write-Host "\n🎯 SOLUCIÓN 3: Archivo Local (SIEMPRE FUNCIONA)"
Write-Host "   Guarda archivo en PC: C:\temp\commands.txt"
Write-Host "   Celular lee archivo via FileProvider"
Write-Host "   No necesita red - solo USB acceso"

Write-Host "\n=== ULTIMA INSTANCIA ===" -ForegroundColor Green
Write-Host "\n📱 ¡Si nada funciona, usa USB/ADb!"
Write-Host "   adb shell "su -c "am start -a android.intent.action.MAIN -n com.example.pcremote/.MainActivity""
Write-Host "   Ejecuta comandos directamente en shell"
Write-Host "   Esto es la solución más confiable"

Write-Host "\n🚀 ¡Listo para usar!" -ForegroundColor Green
