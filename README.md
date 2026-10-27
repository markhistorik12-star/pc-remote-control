# PC Remote Control

A minimal-architecture solution for remotely controlling a Windows PC from an Android device over the local network.

## Architecture

- **Backend**: .NET 8 Minimal API running as a Windows Service
- **Frontend**: React 18 + Vite + Tailwind CSS, wrapped with Capacitor for Android

## Features

- Shutdown / Restart / Lock workstation
- Open / Close applications by name
- Secure token-based authentication
- Works on local network (LAN) - no internet required

## Prerequisites

### Backend (Windows PC)
- Windows 10/11
- .NET 8 SDK (for building) or .NET 8 Runtime (for running published app)

### Frontend (Development)
- Node.js 20+
- Android Studio (for building APK)

### Frontend (End User)
- Android 13+ (API 33+)

---

## Quick Start

### 1. Backend Setup (on the PC you want to control)

```powershell
# Clone and navigate to backend
cd backend/PCControl.Api

# Install as Windows Service (run as Administrator)
.\InstallService.ps1
```

The script will:
- Publish the app as a self-contained executable
- Create and start a Windows service named "PCControl"
- Output a **6-character token** - save this!

The API will be available at `http://<PC-IP>:5000`

### 2. Find your PC's IP address

```powershell
ipconfig | findstr IPv4
```

### 3. Frontend Setup (for development)

```bash
cd frontend
npm install
npm run dev
```

### 4. Configure the mobile app

1. Open the app (or visit `http://localhost:5173` in browser)
2. Tap the ⚙️ settings icon
3. Enter:
   - **PC IP Address**: Your PC's LAN IP (e.g., `192.168.1.100`)
   - **Token**: The 6-character token from backend startup
4. Tap Save

### 5. Build Android APK

```bash
cd frontend
npm run build
npx cap sync android
# Open in Android Studio to build APK, or:
cd android && ./gradlew assembleRelease
```

The APK will be at `frontend/android/app/build/outputs/apk/release/app-release.apk`

---

## Backend Details

### API Endpoints

All endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shutdown` | Shutdown the PC |
| POST | `/api/restart` | Restart the PC |
| POST | `/api/lock` | Lock workstation |
| POST | `/api/apps/open` | Open app (body: `{ "appName": "notepad" }`) |
| POST | `/api/apps/close` | Close app (body: `{ "appName": "notepad" }`) |
| GET | `/health` | Health check (no auth) |

### Response Format

```json
{ "success": true, "message": "Shutdown initiated" }
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing appName in request body |
| 401 | Missing or invalid token |
| 404 | Application not found |
| 500 | Internal server error |

### Configuration

Edit `backend/PCControl.Api/appsettings.json`:

```json
{
  "Token": "A1B2C3",
  "Port": 5000
}
```

Token is auto-generated on first run if empty.

### Manual Service Management

```powershell
# Start
Start-Service -Name PCControl

# Stop
Stop-Service -Name PCControl

# Restart
Restart-Service -Name PCControl

# Uninstall
sc.exe delete PCControl
```

### View Logs

```powershell
# Event Viewer
Get-WinEvent -LogName Application -ProviderName "PCControl.Api" -MaxEvents 20

# Or check console output if running directly
dotnet run --project backend/PCControl.Api
```

---

## Frontend Details

### Project Structure

```
frontend/
├── src/
│   ├── components/     # Header, PowerButtons, AppList, SettingsModal
│   ├── hooks/          # useSettings (localStorage persistence)
│   ├── services/       # api.ts (fetch wrapper with auth)
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── android/            # Capacitor Android project
├── cypress/            # E2E tests
├── capacitor.config.ts
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run E2E tests (requires backend running)
npm run test:e2e

# Open Android Studio
npx cap open android

# Sync web assets to Android
npx cap sync android
```

### Settings Persistence

Settings (IP + token) are stored in `localStorage` under key `pcRemoteSettings`.

---

## Security Considerations

- **Plain HTTP** - Only use on trusted LAN
- **Token auth** - 6-char alphanumeric token, sent as Bearer token
- **No encryption** - Traffic is visible on network
- **No rate limiting** - Consider adding if exposed beyond LAN

### For production use:
- Add TLS with self-signed certs
- Implement rate limiting
- Consider VPN (Tailscale, WireGuard) for remote access

---

## Troubleshooting

### Backend won't start
- Check port 5000 isn't in use: `netstat -ano | findstr :5000`
- Run as Administrator (required for shutdown/restart)
- Check Windows Firewall allows inbound on port 5000

### Mobile app can't connect
- Verify PC IP is correct (use `ipconfig`)
- Ensure both devices on same network
- Check Windows Firewall: `New-NetFirewallRule -DisplayName "PCControl" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow`

### Token issues
- Token is in `appsettings.json` and logged on startup
- Regenerate by deleting `Token` value in `appsettings.json` and restarting service

### Android build fails
- Ensure Android SDK installed (API 34)
- Set `ANDROID_HOME` environment variable
- Accept licenses: `yes | sdkmanager --licenses`

---

## License

MIT License - feel free to use and modify.