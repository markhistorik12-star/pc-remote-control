# PC Remote - Control de PC desde Android

Aplicación móvil para controlar una PC de forma remota mediante comandos HTTP seguros.

## 🚀 Inicio Rápido

### 1. Instalar Backend en Windows
```powershell
# Clonar proyecto
git clone <repositorio>
cd backend/PCControl.Api

# Configurar token (se genera automáticamente)
dotnet run --project .

# Instalar como servicio Windows
./InstallService.ps1
```

### 2. Solución .NET Compatibility (IMPORTANTE)
**Problema:** Proyecto backend apunta a .NET 10.0 mientras frontend/android usan .NET 8.0
**Solución:** Cambiamos backend a .NET 8.0 para compatibilidad

```powershell
# En backend/PCControl.Api/PCControl.Api.csproj
cd backend/PCControl.Api
# Reemplazar <TargetFramework>net10.0</TargetFramework> por <TargetFramework>net8.0</TargetFramework>
edit PCControl.Api.csproj  # (usar el archivo editado)

dotnet restore
./InstallService.ps1  # Reinstalar servicio con nuevo framework
```

### 3. Configurar Frontend
```bash
# Instalar dependencias
npm ci

# Iniciar servidor de desarrollo
npm run dev
```

## 📱 Compilar e Instalar APK (Task 11 Completada)

### ✅ Logros alcanzados
- <co>🔐 Keystore `release.keystore` generado con keytool</co: 8:[0]>
- <co>📝 `signingConfigs.release` agregado a `android/app/build.gradle`</co: 33:[0],34:[0]>
- <co>🔒 Keystore en `.gitignore` (no se commiteará)</co: 8:[0]>
- <co>🌐 Capacitor config actualizado con keystore</co: 33:[0],34:[0]>
- <co>🤖 CI/CD workflow creado en `.github/workflows/android.yml`</co: 48:[0]>
- <co>📋 README actualizado en español</co: 63:[0]>
- 🎨 UI rediseñada con modo oscuro profesional
- 🛡️ **Network Security Config dinámico para actualizaciones correctas**
- 🔧 **Backend .NET 8.0 compatible**

### 🔧 Solución Network Security Config
**Problema:** Android no aplica `network_security_config.xml` en actualizaciones, solo instalaciones nuevas.
**Solución:** Config generado dinámicamente con timestamp único por build.

### 🚀 Construir APK (requiere ejecución manual en tu PC)
```powershell
# 1. Setear variables de entorno (PowerShell)
$env:KEYSTORE_PASSWORD = "<TU_CLAVE>"
$env:KEY_PASSWORD = "<TU_CLAVE>"

# 2. Construir APK firmado (desde frontend/android)
cd frontend/android
./gradlew clean
./gradlew assembleRelease --stacktrace

# 3. Verificar firma
jarsigner -verify -verbose app/build/outputs/apk/release/app-release.apk

# 4. Instalar en dispositivo
adb install -r app/build/outputs/apk/release/app-release.apk
```

## ⚡ Funcionalidades
| Comando | Acción | Endpoint |
|---|---|---|
| Apagar | Shutdown PC | `POST /api/shutdown` |
| Reiniciar | Reiniciar PC | `POST /api/restart` |
| Bloquear | Bloquear sesión | `POST /api/lock` |
| Abrir App | Iniciar aplicación | `POST /api/apps/open` |
| Cerrar App | Cerrar aplicación | `POST /api/apps/close` |

## 🔐 Seguridad
- **Token**: <co>6 caracteres alfanuméricos, generado automáticamente</co: 59:[0]>
- **Auth**: <co>`Authorization: Bearer <token>` en cada petición</co: 59:[0]>
- **Keystore**: <co>Nunca commitear, guardar en ubicación segura</co: 59:[0]>
- **Red**: Permite tráfico claro solo para IP local (192.168.0.10)
- **Network Security**: Config dinámico con timestamp para actualizaciones correctas

## 🛠️ Desarrollo
```bash
# Backend
dotnet run --project backend/PCControl.Api

# Frontend
npm run dev  # Desarrollo local
npm run build  # Construir producción
npx cap sync android  # Actualizar Android
```

## 🐛 Pruebas
```bash
dotnet test backend  # Pruebas unitarias
npm run test:e2e     # Pruebas de integración
```

> **⚠️ Importante**: `release.keystore` está en `.gitignore`. No incluir en commits. Guardar en carpeta segura fuera del repositorio.

---
*Documentación actualizada siguiendo las reglas de CLAUDE kharpati.md: cambios quirúrgicos, minimalistas, con éxito verificable.*

## 🔧 Solución Técnica .NET
Se cambió `<TargetFramework>net10.0</TargetFramework>` a `<TargetFramework>net8.0</TargetFramework>` en `backend/PCControl.Api/PCControl.Api.csproj` para resolver conflictos de compatibilidad con otros proyectos que usan .NET 8.0.