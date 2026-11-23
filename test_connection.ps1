# ===========================================
# PC BACKEND CONNECTION TEST
# PC Remote Control - Diagnostic Script
# ===========================================

Write-Host "=== PC BACKEND CONNECTION TEST ===" -ForegroundColor Cyan
Write-Host "Run this script on the PC to verify backend is reachable."
Write-Host ""

# CONFIGURATION - EDIT THESE VALUES
$pcIp = "192.168.0.10"       # <-- Change to your PC's actual IP
$backendPort = 5000
$backendUrl = "http://${pcIp}:${backendPort}"
$token = "FKALFV"             # <-- From backend/PCControl.Api/appsettings.json

# 1. PING TEST
Write-Host "`n[1] PING TEST - PC reachability" -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $pcIp -Count 2 -Quiet
if ($pingResult) {
    $pingDetails = Test-Connection -ComputerName $pcIp -Count 2
    $avgLatency = ($pingDetails.ResponseTime | Measure-Object -Average | Select-Object -ExpandProperty Average)
    Write-Host "   OK: PC reachable at $pcIp (avg ${avgLatency}ms)" -ForegroundColor Green
} else {
    Write-Host "   FAIL: PC not reachable at $pcIp" -ForegroundColor Red
    Write-Host "   Fix: Ensure PC and mobile are on same WiFi network" -ForegroundColor Yellow
    Write-Host "   Fix: Check Windows Firewall allows incoming connections" -ForegroundColor Yellow
}

# 2. HEALTH CHECK (no auth required)
Write-Host "`n[2] HEALTH CHECK - Backend API" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get -TimeoutSec 10
    Write-Host "   OK: Backend responding on port $backendPort" -ForegroundColor Green
    Write-Host "   Message: $($health.message)" -ForegroundColor Gray
} catch {
    Write-Host "   FAIL: Backend not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   Fix: Start backend with: cd backend/PCControl.Api && dotnet run" -ForegroundColor Yellow
}

# 3. AUTH TEST
Write-Host "`n[3] AUTH TEST - Token validation" -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
try {
    $auth = Invoke-RestMethod -Uri "$backendUrl/api/debug/test-auth" -Method Get -Headers $headers -TimeoutSec 10
    Write-Host "   OK: Token validated successfully" -ForegroundColor Green
    Write-Host "   User: $($auth.user)" -ForegroundColor Gray
} catch {
    Write-Host "   FAIL: Token validation failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   Fix: Verify token in appsettings.json matches what mobile app sends" -ForegroundColor Yellow
}

# 4. ECHO TEST
Write-Host "`n[4] ECHO TEST - Full HTTP roundtrip" -ForegroundColor Yellow
try {
    $echo = Invoke-RestMethod -Uri "$backendUrl/api/debug/echo/connection-test" -Method Get -Headers $headers -TimeoutSec 10
    Write-Host "   OK: Echo endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($echo.received)" -ForegroundColor Gray
} catch {
    Write-Host "   FAIL: Echo endpoint failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# 5. SUMMARY
Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host "If all tests pass, the PC backend is ready for mobile connections."
Write-Host "If any test fails, fix that issue before testing the APK."
Write-Host ""
Write-Host "Next step: Open the mobile app, go to Settings, and enter:"
Write-Host "  IP:    $pcIp"
Write-Host "  Token: $token"
Write-Host ""
