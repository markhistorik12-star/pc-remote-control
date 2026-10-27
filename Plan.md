# Remote PC Control Implementation Plan

> **For agentic workers:** REQUIRED SUB‑SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal‑API C# backend that runs on the PC and a React + Capacitor mobile app that can securely send HTTP commands (shutdown, restart, lock, open/close apps) to that backend.

**Architecture:**  
- **Backend** – .NET 8 Minimal API, self‑hosted as a background Windows service (or console app kept alive). Exposes a few POST endpoints protected by a shared PIN/token.  
- **Frontend** – React 18 + Vite + Tailwind CSS, wrapped with Capacitor to produce an Android APK. The app stores the PC’s LAN IP and the PIN in local storage, then calls the backend via `fetch`.  
- **Security** – Very small “shared secret” (4‑digit PIN or random token) sent as `Authorization: Bearer <token>` header; backend validates on every request.

**Tech Stack:**  
- Backend: .NET 8, `Microsoft.AspNetCore.Builder`, `System.Diagnostics.Process`, `Microsoft.Extensions.Hosting.WindowsServices` (optional).  
- Frontend: React 18, Vite 5, Tailwind 3, Capacitor 5, `@capacitor/android`, `axios`/`fetch`.  
- Build: `dotnet publish -c Release`, `npm run build && npx cap sync android && ./gradlew assembleRelease`.

**Spec:** This plan itself is the spec; no external document.

---

## Global Constraints
| # | Constraint |
|---|------------|
| 1 | Target .NET 8 LTS, C# 12. |
| 2 | Backend must run on Windows 10/11, listen on `0.0.0.0:5000` (configurable). |
| 3 | Mobile app must target Android API 33+ (compileSdk 34). |
| 4 | All HTTP traffic is **plain HTTP** on the trusted LAN (no TLS required). |
| 5 | Shared secret = 6‑character alphanumeric token generated once on first backend start and shown in console; user copies it into the phone app settings. |
| 6 | No external databases – token stored in a local `appsettings.json` (backend) and `localStorage` (frontend). |
| 7 | UI must be responsive, single‑hand usable; Tailwind utility classes only. |
| 8 | Code style: `dotnet format` / `eslint --fix` + `prettier` on every commit. |
| 9 | All endpoints return JSON `{ "success": true|false, "message": "..." }`. |
|10 | Every task ends with a **git commit** (`git add … && git commit -m "…"`) and passes the project’s lint/test suite. |

---

## Review Focus (uncovered failure modes)
| # | Input / Condition | Expected Behaviour |
|---|-------------------|--------------------|
| 1 | Wrong / missing token in request | HTTP 401 + JSON error, no action executed |
| 2 | PC IP changes (DHCP) | App shows “Connection failed”, user can update IP in settings |
| 3 | Malformed JSON body (e.g., missing `appName`) | HTTP 400, clear error message |
| 4 | Request to open non‑existent app | HTTP 404, message “Application not found” |
| 5 | Multiple rapid commands (spam) | Backend processes sequentially, returns proper status for each |

*Each of the above will be exercised by a unit/integration test in the owning task.*

---

## File‑Structure Overview (decided up‑front)

```
├─ backend/
│   ├─ PCControl.Api/
│   │   ├─ Program.cs                     // Minimal API bootstrap
│   │   ├─ Endpoints/
│   │   │   ├─ PowerEndpoints.cs          // /api/shutdown, /api/restart, /api/lock
│   │   │   └─ AppEndpoints.cs            // /api/apps/open, /api/apps/close
│   │   ├─ Services/
│   │   │   ├─ TokenService.cs            // load / validate shared token
│   │   │   └─ ProcessService.cs          // wrappers around Process.Start / WMI
│   │   ├─ Models/
│   │   │   └─ ApiResponse.cs
│   │   └─ appsettings.json               // "Token": "...", "Port": 5000
│   └─ PCControl.Api.csproj
├─ frontend/
│   ├─ src/
│   │   ├─ main.tsx
│   │   ├─ App.tsx
│   │   ├─ components/
│   │   │   ├─ Header.tsx
│   │   │   ├─ PowerButtons.tsx
│   │   │   ├─ AppList.tsx
│   │   │   └─ SettingsModal.tsx
│   │   ├─ services/
│   │   │   └─ api.ts                     // fetch wrapper with token header
│   │   ├─ hooks/
│   │   │   └─ useSettings.ts             // IP + token persisted in localStorage
│   │   └─ styles/
│   │       └─ tailwind.css
│   ├─ index.html
│   ├─ vite.config.ts
│   ├─ tailwind.config.js
│   ├─ capacitor.config.ts
│   └─ package.json
└─ docs/
    └─ superpowers/
        └─ plans/
            └─ 2026-10-27-remote-pc-control.md   ← this file
```

---

## Task Breakdown

### Task 1 – Backend scaffold & token generation
**Files**  
- Create: `backend/PCControl.Api/Program.cs`  
- Create: `backend/PCControl.Api/appsettings.json` (template)  
- Create: `backend/PCControl.Api/Services/TokenService.cs`  
- Test: `backend/PCControl.Api.Tests/TokenServiceTests.cs`

**Interfaces**  
- Consumes: none  
- Produces: `TokenService.GetToken(): string`, `TokenService.Validate(string): bool`

- [ ] **Step 1: Write failing test** – `TokenService_GeneratesAndPersistsToken` asserts a 6‑char token is written to `appsettings.json` on first run and reused thereafter.  
- [ ] **Step 2: Run test** – `dotnet test backend/PCControl.Api.Tests` → FAIL.  
- [ ] **Step 3: Implement `TokenService`** – on constructor read `appsettings.json`; if `Token` missing, generate `RandomString(6)`, persist, log to console.  
- [ ] **Step 4: Run test** → PASS.  
- [ ] **Step 5: Commit** – `git add backend/PCControl.Api/** backend/PCControl.Api.Tests/** && git commit -m "feat: token generation & persistence"`.

---

### Task 2 – Minimal API host & middleware for auth
**Files**  
- Modify: `backend/PCControl.Api/Program.cs` (add auth middleware)  
- Create: `backend/PCControl.Api/Middleware/TokenAuthMiddleware.cs`  
- Test: `backend/PCControl.Api.Tests/AuthMiddlewareTests.cs`

**Interfaces**  
- Consumes: `TokenService.Validate`  
- Produces: middleware that short‑circuits with 401 when header missing/invalid.

- [ ] **Step 1: Write failing test** – `AuthMiddleware_RejectsMissingToken` and `AuthMiddleware_AllowsValidToken`.  
- [ ] **Step 2: Run test** → FAIL.  
- [ ] **Step 3: Implement middleware** – read `Authorization: Bearer <token>` header, call `TokenService.Validate`.  
- [ ] **Step 4: Wire middleware in `Program.cs`** (`app.UseMiddleware<TokenAuthMiddleware>();`).  
- [ ] **Step 5: Run test** → PASS.  
- [ ] **Step 6: Commit**.

---

### Task 3 – Power endpoints (shutdown, restart, lock)
**Files**  
- Create: `backend/PCControl.Api/Endpoints/PowerEndpoints.cs`  
- Create: `backend/PCControl.Api/Services/ProcessService.cs` (methods `Shutdown()`, `Restart()`, `LockWorkstation()`)  
- Test: `backend/PCControl.Api.Tests/PowerEndpointsTests.cs`

**Interfaces**  
- Consumes: `ProcessService` (wraps `shutdown.exe`, `rundll32.exe user32.dll,LockWorkStation`)  
- Produces: POST `/api/shutdown`, `/api/restart`, `/api/lock` → `ApiResponse`

- [ ] **Step 1: Write failing tests** – three tests, each calls endpoint with valid token, expects `success:true`.  
- [ ] **Step 2: Run tests** → FAIL.  
- [ ] **Step 3: Implement `ProcessService`** using `Process.Start` with appropriate args (`shutdown /s /t 0`, `/r /t 0`, `rundll32.exe user32.dll,LockWorkStation`).  
- [ ] **Step 4: Implement endpoints** – minimal API `MapPost` delegating to service, returning JSON.  
- [ ] **Step 5: Run tests** → PASS.  
- [ ] **Step 6: Commit**.

---

### Task 4 – Application open/close endpoints
**Files**  
- Create: `backend/PCControl.Api/Endpoints/AppEndpoints.cs`  
- Extend: `ProcessService` with `StartApp(string name)` and `CloseApp(string name)` (uses `Process.GetProcessesByName`).  
- Test: `backend/PCControl.Api.Tests/AppEndpointsTests.cs`

**Interfaces**  
- Consumes: `ProcessService`  
- Produces: POST `/api/apps/open` `{ "appName": "notepad" }`, POST `/api/apps/close` `{ "appName": "notepad" }`.

- [ ] **Step 1: Write failing tests** – open known app (notepad) → success; close same → success; unknown app → 404.  
- [ ] **Step 2: Run tests** → FAIL.  
- [ ] **Step 3: Implement `StartApp`** – `Process.Start(new ProcessStartInfo(appName) { UseShellExecute = true })`.  
- [ ] **Step 4: Implement `CloseApp`** – `foreach(p in Process.GetProcessesByName(name)) p.CloseMainWindow();`.  
- [ ] **Step 5: Wire endpoints** – validate JSON body, call service, return `ApiResponse`.  
- [ ] **Step 6: Run tests** → PASS.  
- [ ] **Step 7: Commit**.

---

### Task 5 – Backend packaging & Windows‑service install script
**Files**  
- Create: `backend/PCControl.Api/InstallService.ps1` (creates a Windows service via `sc create`)  
- Modify: `backend/PCControl.Api/PCControl.Api.csproj` – `<OutputType>exe</OutputType>`, enable `PublishSingleFile`  
- Test: manual smoke‑test (run service, hit endpoints with curl).

- [ ] **Step 1: Add `Microsoft.Extensions.Hosting.WindowsServices` nuget** and `UseWindowsService()` in `Program.cs`.  
- [ ] **Step 2: Write PowerShell installer** – publish `dotnet publish -c Release -r win-x64 --self-contained true`, then `sc create PCControl binPath= "…\PCControl.Api.exe" start= auto`.  
- [ ] **Step 3: Verify service starts, logs token to Event Viewer / console**.  
- [ ] **Step 4: Commit**.

---

### Task 6 – Frontend scaffold (Vite + React + Tailwind + Capacitor)
**Files**  
- Create: `frontend/` via `npm create vite@latest frontend -- --template react-ts`  
- Add Tailwind: `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`  
- Add Capacitor: `npm i @capacitor/core @capacitor/cli && npx cap init "PC Remote" com.example.pcremote --web-dir=dist`  
- Add Android platform: `npm i @capacitor/android && npx cap add android`  
- Config files: `vite.config.ts`, `tailwind.config.js`, `capacitor.config.ts`  

**Test** – `npm run dev` shows “PC Remote” page; `npx cap open android` opens Android Studio.

- [ ] **Step 1: Run scaffold commands** (scripted in `setup-frontend.sh`).  
- [ ] **Step 2: Verify dev server & Android project builds** (`./gradlew assembleDebug`).  
- [ ] **Step 3: Commit**.

---

### Task 7 – Settings persistence hook (`useSettings`)
**Files**  
- Create: `frontend/src/hooks/useSettings.ts`  
- Test: `frontend/src/hooks/__tests__/useSettings.test.ts` (Vitest + `@testing-library/react`)

**Interfaces**  
- Produces: `{ ip: string, token: string, save(ip, token), clear() }` persisted in `localStorage`.

- [ ] **Step 1: Write failing test** – render hook, act `save('192.168.1.10','abc123')`, expect values returned & stored.  
- [ ] **Step 2: Run test** → FAIL.  
- [ ] **Step 3: Implement hook** – read/write `localStorage['pcRemoteSettings']`.  
- [ ] **Step 4: Run test** → PASS.  
- [ ] **Step 5: Commit**.

---

### Task 8 – API service layer (`api.ts`)
**Files**  
- Create: `frontend/src/services/api.ts`  
- Test: `frontend/src/services/__tests__/api.test.ts` (msw mock server)

**Interfaces**  
- Consumes: `useSettings` (via argument)  
- Produces: `shutdown()`, `restart()`, `lock()`, `openApp(name)`, `closeApp(name)` → `Promise<ApiResponse>`.

- [ ] **Step 1: Write failing tests** – each function posts to `${ip}/api/...` with `Authorization: Bearer ${token}`.  
- [ ] **Step 2: Run tests** → FAIL.  
- [ ] **Step 3: Implement `fetch` wrapper** – adds headers, handles non‑2xx, returns typed response.  
- [ ] **Step 4: Run tests** → PASS.  
- [ ] **Step 5: Commit**.

---

### Task 9 – UI components (Header, PowerButtons, AppList, SettingsModal)
**Files**  
- Create component files under `frontend/src/components/`  
- Test: component‑level Vitest + RTL tests for each (render, click → calls api mock).

**Interfaces**  
- Consumes: `api.ts` functions, `useSettings` hook.  
- Produces: interactive UI, Tailwind‑styled.

- [ ] **Step 1: Write failing tests** for each component (e.g., `PowerButtons` fires `shutdown` on click).  
- [ ] **Step 2: Run tests** → FAIL.  
- [ ] **Step 3: Implement components** – simple functional components, `onClick` → `await api.shutdown()`.  
- [ ] **Step 4: Wire in `App.tsx`** – state for modal visibility, pass settings.  
- [ ] **Step 5: Run tests** → PASS.  
- [ ] **Step 6: Commit**.

---

### Task 10 – End‑to‑end integration test (backend + frontend)
**Files**  
- Create: `frontend/cypress/e2e/remote-control.cy.ts` (Cypress + `start-server-and-test`)  
- Scripts: `package.json` `"test:e2e": "start-server-and-test 'dotnet run --project backend/PCControl.Api' http://localhost:5000 'cypress run'"`

**Goal** – Spin up backend, serve built frontend, run Cypress scenario: open settings → enter IP/token → click Shutdown → expect backend log “Shutdown requested”.

- [ ] **Step 1: Write Cypress spec** (fails because backend not running).  
- [ ] **Step 2: Run script** → FAIL.  
- [ ] **Step 3: Verify backend starts, token matches, command succeeds**.  
- [ ] **Step 4: Run again** → PASS.  
- [ ] **Step 5: Commit**.

---

### Task 11 – Release APK build & signing
**Files**  
- Modify: `frontend/capacitor.config.ts` – `android: { buildOptions: { keystorePath: 'release.keystore', … } }`  
- Add: `frontend/release.keystore` (generated once, stored securely)  
- CI snippet (optional): GitHub Actions workflow `.github/workflows/android.yml`

- [ ] **Step 1: Generate keystore** (`keytool -genkey -v -keystore release.keystore -alias pcremote -keyalg RSA -keysize 2048 -validity 10000`).  
- [ ] **Step 2: Configure `signingConfigs.release` in `android/app/build.gradle`** (point to keystore, use env vars for passwords).  
- [ ] **Step 3: Run `npm run build && npx cap sync android && ./gradlew assembleRelease`** – verify `app-release.apk` produced.  
- [ ] **Step 4: Install on test device, run manual sanity check**.  
- [ ] **Step 5: Commit** (keystore **not** committed – add to `.gitignore`; only CI secrets hold passwords).

---

### Task 12 – Documentation & README
**Files**  
- Create: `README.md` (project overview, backend install, frontend build, APK install).  
- Create: `docs/architecture.md` (diagram + data flow).  

- [ ] **Step 1: Write README** with step‑by‑step for non‑dev user.  
- [ ] **Step 2: Write architecture markdown**.  
- [ ] **Step 3: Commit**.

---

## Execution Handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-10-27-remote-pc-control.md`.  
Please review the plan. Which execution approach would you prefer?

- **Subagent‑driven** – A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole‑branch review at the end. Most thorough; costs a fresh context per task and per review.  
- **Native** – I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end.

**For this plan I recommend *Subagent‑driven*, because the backend and frontend tasks are loosely coupled but share a strict contract (token format, API shape). Independent verification after each task prevents contract drift early.**  

Does the plan capture what you want, and which approach should we use?
Tarea 1,2 y 3 hecha