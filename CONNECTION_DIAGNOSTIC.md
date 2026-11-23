# CONNECTION DIAGNOSTIC LOG
## PC Remote Control - APK Connection Issues

**Date:** 2026-11-18  
**Status:** Issues identified, fixes required

---

## 1. SUMMARY

The Android APK cannot connect to the PC backend due to multiple configuration mismatches between the frontend (mobile app), backend (.NET API), and build scripts.

---

## 2. ISSUES IDENTIFIED

### Issue 1: Token Mismatch (CRITICAL)

- **Backend `appsettings.json`**: `"Token": "FUMKMR"`
- **Frontend `DebugPanel.tsx`**: hardcodes `Bearer FKALFV`
- **Frontend `NetworkDebug.tsx`**: hardcodes `Bearer FKALFV`
- **Backend `TokenService.cs`**: reads token from config first (`FUMKMR`), falls back to generated token only if config missing

**Result:** All authenticated API calls from the app return HTTP 401 Unauthorized because the token `FKALFV` does not match `FUMKMR`.

**Fix:** Either:
- Change `appsettings.json` token to `FKALFV`, OR
- Update all frontend hardcoded tokens to `FUMKMR`, OR  
- Make frontend read token from Settings (already implemented in `useSettings.ts`) and use that instead of hardcoded values.

---

### Issue 2: Hardcoded IP Addresses (CRITICAL)

Debug components use hardcoded `192.168.0.10` instead of the IP saved in Settings:

- `DebugPanel.tsx:26` - `http://192.168.0.10:5000/api/debug/health`
- `DebugPanel.tsx:35` - `http://192.168.0.10:5000/api/debug/test-auth`
- `DebugPanel.tsx:47` - `http://192.168.0.10:5000/api/debug/echo/test-message`
- `DebugPanel.tsx:64` - `ws://192.168.0.10:5000/ws`
- `NetworkDebug.tsx:22` - `http://192.168.0.10:5000/api/ping`
- `NetworkDebug.tsx:28` - `http://192.168.0.10:5000/api/debug/test-auth`
- `NetworkDebug.tsx:35` - `http://192.168.0.10:5000/api/slow`
- `NetworkDebug.tsx:40` - `http://192.168.0.10:5000/api/debug/echo/test-cors`

**Fix:** Replace hardcoded IPs with the IP from `useSettings()` state.

---

### Issue 3: Incorrect API Usage in DebugPanel

`DebugPanel.tsx:53` calls:
```ts
const realResponse = await api.post('/api/shutdown', { token: 'FKALFV' });
```

But `api.ts` does NOT export a `.post()` method. It exports named functions:
```ts
shutdown(ip, token)
restart(ip, token)
lock(ip, token)
openApp(ip, token, appName)
closeApp(ip, token, appName)
testConnection(ip, token)
```

**Fix:** Use `api.shutdown(ip, token)` instead of `api.post(...)`.

---

### Issue 4: Non-existent Backend Endpoints

`NetworkDebug.tsx` tests these endpoints that do NOT exist on the backend:

- `/api/ping` - **does not exist**
- `/api/slow` - **does not exist**

Existing backend endpoints:
- `GET /` - root
- `GET /health` - health (no auth)
- `GET /api/debug/health` - debug health (requires auth)
- `GET /api/debug/echo/{message}` - echo (requires auth)
- `GET /api/debug/test-auth` - auth test (requires auth)
- `POST /api/shutdown` - power (requires auth)
- `POST /api/restart` - power (requires auth)
- `POST /api/lock` - power (requires auth)
- `POST /api/apps/open` - apps (requires auth)
- `POST /api/apps/close` - apps (requires auth)

**Fix:** Remove tests for `/api/ping` and `/api/slow`, or add those endpoints to the backend.

---

### Issue 5: WebSocket Endpoint Missing

`DebugPanel.tsx:64` creates a WebSocket connection:
```ts
const ws = new WebSocket('ws://192.168.0.10:5000/ws');
```

The backend (`Program.cs`) has no WebSocket middleware or `/ws` endpoint configured.

**Fix:** Either remove the WebSocket code from DebugPanel, or add WebSocket support to the backend.

---

### Issue 6: Network Security Config Hardcodes IP

`build_final.ps1` generates `network_security_config.xml` with domain `192.168.0.10` hardcoded:

```xml
<domain includeSubdomains="true">192.168.0.10</domain>
```

If the PC IP changes, cleartext HTTP traffic will be blocked for that IP.

**Fix:** Make the network security config use a wildcard or allow all local IPs, or generate it dynamically based on the actual PC IP.

---

### Issue 7: TokenAuthMiddleware Scope

`TokenAuthMiddleware.cs:23` skips auth only for:
- `/`
- `/health`

But `Program.cs:55` maps `/api/debug/health` which IS under `/api/` and WILL require auth. The `api.ts` `testConnection()` function calls `/health` (line 64), which is correctly skipped. However, if any code calls `/api/debug/health` without a token, it will get 401.

**Fix:** Add `/api/debug/health` to the skip list in `TokenAuthMiddleware.cs`, or ensure all calls include the auth header.

---

## 3. BACKEND ENDPOINTS (for reference)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/` | GET | No | Root info |
| `/health` | GET/HEAD/POST | No | Health check |
| `/api/debug/health` | GET | Yes | Debug health info |
| `/api/debug/echo/{message}` | GET | Yes | Echo test |
| `/api/debug/test-auth` | GET | Yes | Auth validation |
| `/api/shutdown` | POST | Yes | Shutdown PC |
| `/api/restart` | POST | Yes | Restart PC |
| `/api/lock` | POST | Yes | Lock workstation |
| `/api/apps/open` | POST | Yes | Open application |
| `/api/apps/close` | POST | Yes | Close application |

---

## 4. TEST SCRIPT (PC Side)

Run this PowerShell script on the PC to verify backend connectivity:

```powershell
# test_connection.ps1
$backendUrl = "http://192.168.0.10:5000"
$token = "FUMKMR"  # From appsettings.json

Write-Host "=== PC BACKEND CONNECTION TEST ===" -ForegroundColor Cyan

# 1. Ping
Write-Host "`n[1] Ping test..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName "192.168.0.10" -Count 2 -Quiet
if ($ping) { Write-Host "   OK: PC reachable" -ForegroundColor Green }
else { Write-Host "   FAIL: PC not reachable" -ForegroundColor Red }

# 2. Health (no auth)
Write-Host "`n[2] Health check (no auth)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get -TimeoutSec 10
    Write-Host "   OK: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Auth test
Write-Host "`n[3] Auth test (token: $token)..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
try {
    $auth = Invoke-RestMethod -Uri "$backendUrl/api/debug/test-auth" -Method Get -Headers $headers -TimeoutSec 10
    Write-Host "   OK: Authenticated as $($auth.user)" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Echo test
Write-Host "`n[4] Echo test..." -ForegroundColor Yellow
try {
    $echo = Invoke-RestMethod -Uri "$backendUrl/api/debug/echo/connection-test" -Method Get -Headers $headers -TimeoutSec 10
    Write-Host "   OK: Echo received" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
```

---

## 5. MOBILE SIDE CHECKLIST

Before testing the APK, verify on the mobile device:

- [ ] Device and PC are on the **same WiFi network**
- [ ] PC IP address is known (run `ipconfig` on PC)
- [ ] Backend is running (`dotnet run` in `backend/PCControl.Api`)
- [ ] SettingsModal in the app has the **correct PC IP** entered
- [ ] SettingsModal has the **correct token** (`FUMKMR` from `appsettings.json`)
- [ ] Token is exactly 6 characters, uppercase alphanumeric

---

## 6. IMMEDIATE FIXES REQUIRED

1. **Fix token**: Update `appsettings.json` token to `FKALFV` OR update frontend hardcoded tokens to `FUMKMR`
2. **Fix DebugPanel**: Replace hardcoded IPs with settings IP, fix `api.post()` call to `api.shutdown()`
3. **Fix NetworkDebug**: Remove tests for `/api/ping` and `/api/slow`
4. **Fix WebSocket**: Remove WebSocket connection from DebugPanel or add backend WebSocket support
5. **Fix build script**: Make network_security_config.xml dynamic based on actual PC IP

---
