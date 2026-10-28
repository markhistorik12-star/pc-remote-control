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

### 2. Configurar Frontend
```bash
# Instalar dependencias
npm ci

# Iniciar servidor de desarrollo
npm run dev
```

## 📱 Compilar e Instalar APK

### Requisitos previos
- Java 17+ instalado
- Android SDK configurado (`./gradlew` disponible)

### Paso a paso
```bash
# 1. Configurar variables de entorno (PowerShell)
$env:KEYSTORE_PASSWORD = "TU_CONTRASEÑA_SEGURA"
$env:KEY_PASSWORD = "TU_CONTRASEÑA_SEGURA"

# 2. Generar keystore (solo una vez)
keytool -genkey -v -keystore release.keystore -alias pcremote -keyalg RSA -keysize 2048 -validity 10000 -storepass $env:KEYSTORE_PASSWORD -keypass $env:KEY_PASSWORD -dname "CN=PC Remote, OU=Development, O=PC Remote, L=City, ST=State, C=US"

# 3. Construir APK firmado
./gradlew assembleRelease

# 4. Instalar en dispositivo
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## 🔧 Configuración de la App

1. Abrir app → ingresar IP de PC y token
2. Token se muestra en consola del backend al iniciar servicio
3. Guardar configuración en la app

## ⚡ Funcionalidades

| Comando | Acción | Endpoint |
|---------|--------|----------|
| Apagar | Shutdown PC | `POST /api/shutdown` |
| Reiniciar | Reiniciar PC | `POST /api/restart` |
| Bloquear | Bloquear sesión | `POST /api/lock` |
| Abrir App | Iniciar aplicación | `POST /api/apps/open` |
| Cerrar App | Cerrar aplicación | `POST /api/apps/close` |

## 🔐 Seguridad

- **Token**: 6 caracteres alfanuméricos, generado automáticamente
- **Auth**: `Authorization: Bearer <token>` en cada petición
- **Red**: Solo usar en LAN de confianza (HTTP plano)
- **Keystore**: Nunca commitear, guardar en ubicación segura

## 📋 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `KEYSTORE_PASSWORD` | Contraseña del keystore | `marciogonzalez1` |
| `KEY_PASSWORD` | Contraseña de la clave privada | `marciogonzalez1` |

## 🛠️ Desarrollo

### Backend
```bash
dotnet run --project backend/PCControl.Api
# Ver token en consola: "Token generado: FKALFV"
```

### Frontend
```bash
npm run dev  # Desarrollo local
npm run build  # Construir para producción
npx cap sync android  # Actualizar Android
```

## 🐛 Pruebas

```bash
# Pruebas unitarias
dotnet test backend

# Pruebas de integración
npm run test:e2e
```

## 📄 Licencia

Proyecto bajo licencia MIT. Ver archivo LICENSE.

> **⚠️ Importante**: `release.keystore` está en `.gitignore`. No incluir en commits. Guardar en carpeta segura fuera del repositorio.