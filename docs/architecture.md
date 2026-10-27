# Architecture Documentation

## System Overview

```
┌─────────────────┐     HTTP/JSON      ┌──────────────────┐
│  Android App    │ ◄─────────────────► │  .NET 8 Backend  │
│  (Capacitor)    │   Port 5000        │  (Windows Svc)   │
└─────────────────┘                    └──────────────────┘
                                             │
                                    ┌────────┴────────┐
                                    ▼                 ▼
                              ┌───────────┐    ┌─────────────┐
                              │  Power    │    │   Apps      │
                              │  cmds     │    │  (Process)  │
                              └───────────┘    └─────────────┘
```

## Components

### Backend (.NET 8 Minimal API)

**Location**: `backend/PCControl.Api/`

| File | Responsibility |
|------|----------------|
| `Program.cs` | App bootstrap, DI, middleware pipeline, endpoint routing |
| `Middleware/TokenAuthMiddleware.cs` | Validates `Authorization: Bearer <token>` on all API routes |
| `Services/TokenService.cs` | Generates/loads 6-char token from `appsettings.json` |
| `Services/ProcessService.cs` | Wraps `Process.Start` for shutdown/restart/lock/app control |
| `Endpoints/PowerEndpoints.cs` | `/api/shutdown`, `/api/restart`, `/api/lock` |
| `Endpoints/AppEndpoints.cs` | `/api/apps/open`, `/api/apps/close` |
| `Models/ApiResponse.cs` | Standard JSON response wrapper |

**Configuration**: `appsettings.json`
```json
{ "Token": "A1B2C3", "Port": 5000 }
```

**Windows Service**: Installed via `InstallService.ps1` using `sc.exe`

### Frontend (React + Capacitor)

**Location**: `frontend/`

| File | Responsibility |
|------|----------------|
| `src/App.tsx` | Root component, orchestrates UI state |
| `src/hooks/useSettings.ts` | Persists IP/token in `localStorage` |
| `src/services/api.ts` | `fetch` wrapper adding auth header |
| `src/components/Header.tsx` | Title + settings button |
| `src/components/PowerButtons.tsx` | Shutdown/Restart/Lock buttons |
| `src/components/AppList.tsx` | Common apps + custom app input |
| `src/components/SettingsModal.tsx` | IP/token configuration modal |

**Build**: `npm run build` → `dist/` → `npx cap sync android`

## Data Flow

### Command Execution (e.g., Shutdown)

```
1. User taps "Shutdown" button
2. PowerButtons.onAction('shutdown')
3. App.tsx → shutdown(ip, token)
4. api.ts → fetch('http://ip:5000/api/shutdown', { 
       method: 'POST', 
       headers: { 'Authorization': 'Bearer token' }
   })
5. Backend TokenAuthMiddleware validates token
6. PowerEndpoints.shutdown → ProcessService.Shutdown()
7. Process.Start("shutdown", "/s /t 0")
8. Response: { success: true, message: "Shutdown initiated" }
9. Frontend shows alert with message
```

### Settings Persistence

```
localStorage['pcRemoteSettings'] = { "ip": "192.168.1.100", "token": "A1B2C3" }
```

Loaded on app start via `useSettings` hook.

## Security Model

```
Threat                    Mitigation
─────────────────────────────────────────────────
Token interception        LAN-only, short token, rotate on reinstall
Replay attacks            Stateless, no nonce (acceptable for LAN)
Unauthorized access       Bearer token required on all mutating endpoints
Command injection         No shell=True, fixed command args
```

**Token**: 6-char alphanumeric (36^6 ≈ 2.1B combinations)

## Deployment

### Backend
```
dotnet publish -c Release -r win-x64 --self-contained true
sc.exe create PCControl binPath="path\PCControl.Api.exe" start=auto
```

### Frontend (Android)
```
npm run build
npx cap sync android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

Signing configured via `capacitor.config.ts` + `release.keystore` (CI secrets).

## Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Backend Unit | xUnit + WebApplicationFactory | Auth, Power, App endpoints |
| Frontend Unit | Vitest + React Testing Library | Hooks, API service |
| Frontend E2E | Cypress | Settings flow, API integration |
| Integration | start-server-and-test | Full stack (backend + frontend) |

## Extensibility Points

1. **New Commands**: Add method to `IProcessService` + endpoint in `Endpoints/`
2. **Auth Upgrade**: Replace `TokenAuthMiddleware` with JWT/OAuth
3. **Transport**: Add SignalR for real-time status updates
4. **Platform**: Capacitor supports iOS/Electron with same web code