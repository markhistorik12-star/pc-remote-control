# Remote PC Control - Documentación Técnica

## 📋 Resumen del Proyecto

Sistema de control remoto para Windows PC desde dispositivos Android a través de red local (LAN). El backend funciona como servicio Windows que expone una API REST, el frontend es una aplicación web móvil empaquetada como APK Android mediante Capacitor.

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **Lenguaje:** .NET 8 (C#)
- **Framework:** ASP.NET Core Minimal API
- **Sistema Operativo:** Windows 10/11 (como servicio)
- **Base de Datos:** Sin base de datos (estado en memoria)
- **Autenticación:** Tokens de 6 caracteres alfanuméricos
- **Comunicación:** HTTP sobre puerto 5000

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Estilos:** Tailwind CSS
- **Mobile Wrapper:** Capacitor (Android)
- **Testing:** Vitest para tests unitarios
- **Comunicación:** Fetch API con autenticación Bearer

### APK
- **Plataforma:** Android 13+ (API 33+)
- **Build:** Gradle wrapper (incluido en repo)
- **Firma:** Keystore personalizado (opcional)
- **Tamaño:** Variable según configuración

---

## 🏗️ Arquitectura del Sistema

### Backend (PCControl.Api)

**Estructura de archivos:**
```
backend/PCControl.Api/
├── PCControl.Api.csproj          # Proyecto .NET
├── Program.cs                     # Punto de entrada
├── Endpoints/                     # Rutas API
│   ├── PowerEndpoints.cs          # Control de PC (apagar/reiniciar/bloquear)
│   └── AppEndpoints.cs            # Gestión de aplicaciones
├── Services/                      # Lógica de negocio
│   ├── TokenService.cs            # Gestión de autenticación
│   ├── ProcessService.cs          # Control de procesos Windows
│   └── ApiResponse.cs             # Modelo de respuesta
├── Middleware/                    # Seguridad
│   └── TokenAuthMiddleware.cs     # Validación de tokens
└── publish/                       # Archivos de despliegue
    └── PCControl.Api.exe          # Ejecutable del servicio
```

**Componentes principales:**
- `TokenService`: Genera y valida tokens de 6 caracteres
- `ProcessService`: Ejecuta comandos en el PC (shutdown, restart, lock, open/close apps)
- `TokenAuthMiddleware`: Valida Bearer token en cada petición

### Frontend (Aplicación Móvil)

**Estructura de archivos:**
```
frontend/
├── src/
│   ├── components/               # Componentes UI
│   │   ├── Header.tsx
│   │   ├── PowerButtons.tsx       # Botones de control
│   │   ├── AppList.tsx           # Lista de aplicaciones
│   │   └── SettingsModal.tsx     # Configuración de conexión
│   ├── hooks/                    # Lógica personalizada
│   │   └── useSettings.ts        # Gestión de IP/token
│   ├── services/                 # Comunicación con backend
│   │   └── api.ts                # Wrapper de fetch con auth
│   ├── App.tsx                   # Componente principal
│   └── main.tsx                  # Punto de entrada
├── android/                      # Proyecto Capacitor Android
├── cypress/                      # Tests E2E
└── package.json                  # Dependencias
```

**Componentes clave:**
- `PowerButtons`: UI para acciones de control
- `AppList`: Gestión de aplicaciones (abrir/cerrar)
- `SettingsModal`: Configuración de IP y token
- `api.ts`: Comunicación con backend mediante fetch

### APK (Aplicación Android)

**Proceso de construcción:**
1. `npm run build` - Construye aplicación web
2. `npx cap sync android` - Copia recursos a proyecto Android
3. `./gradlew assembleRelease` - Genera APK firmado

**Archivos generados:**
- `app-debug.apk` - Versión de desarrollo
- `app-release.apk` - Versión de producción

---

## 🔌 Conexión Backend - Frontend

**Protocolo:** HTTP sobre TCP/IP
**Puerto:** 5000 (configurable en `appsettings.json`)
**Autenticación:** Bearer token en header `Authorization`

**Flujo de comunicación:**
1. Usuario configura IP del PC y token en SettingsModal
2. Frontend guarda configuración en `localStorage`
3. En cada petición, `api.ts` agrega header: `Authorization: Bearer <token>`
4. Backend valida token en `TokenAuthMiddleware`
5. Si válido, procesa petición y devuelve `ApiResponse`

**Ejemplo de petición:**
```javascript
const shutdown = async (ip, token) => {
  const response = await fetch(`http://${ip}:5000/api/shutdown`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

---

## 📱 Conexión APK al PC

**Requisitos previos:**
- Mismo network (LAN) para ambos dispositivos
- IP del PC accesible desde Android
- Puerto 5000 abierto en firewall de Windows

**Proceso de conexión:**
1. Usuario instala APK en Android
2. Abre aplicación móvil
3. Va a Settings y configura:
   - PC IP Address (ej: `192.168.1.100`)
   - Token (6 caracteres obtenidos al iniciar servicio)
4. Guarda configuración
5. App realiza peticiones HTTPS (sin encriptación - solo LAN de confianza)

**Mecanismo de control:**
- **Apagar PC:** `ProcessService.Shutdown()` ejecuta `shutdown /s /t 0`
- **Reiniciar:** `ProcessService.Restart()` ejecuta `shutdown /r /t 0`
- **Bloquear:** `ProcessService.LockWorkstation()` llama a `user32.dll,LockWorkStation`
- **Abrir app:** `ProcessService.StartApp()` ejecuta nombre de archivo
- **Cerrar app:** `ProcessService.CloseApp()` encuentra proceso por nombre y lo cierra

**Seguridad:**
- Token de 6 caracteres alfanuméricos (ej: `A1B2C3`)
- Solo acepta peticiones con Bearer token válido
- No expone información sensible en URLs
- Diseñado para uso en LAN de confianza

---

## 🚀 Despliegue y Uso

### Instalar en PC (Windows)
```powershell
# 1. Clonar y entrar en backend
cd backend/PCControl.Api

# 2. Instalar como servicio (ejecutar como Administrador)
.\InstallService.ps1

# 3. Servicio creado: "PCControl" en Services MMC
# 4. Obtener token (6 caracteres) - se muestra en consola
# 5. Iniciar servicio manualmente si es necesario
Start-Service -Name PCControl
```

### Construir y Ejecutar
```bash
# Frontend development
cd frontend
npm install
npm run dev  # Desarrollo local

# Build APK
cd frontend
npm run build
npx cap sync android
./gradlew assembleDebug  # APK debug
./gradlew assembleRelease # APK release (firmado)
```

### Ejecutar en Android
1. Instalar `app-release.apk` en dispositivo
2. Abrir aplicación
3. Configurar IP y token en Settings
4. Usar los controles

---

## 🔧 Configuración y Personalización

### `appsettings.json` (backend)
```json
{
  "Token": "A1B2C3",
  "Port": 5000
}
```

### Variables de entorno para firma (opcional)
```bash
export KEYSTORE_PASSWORD=your_password_here
```

### Personalización de APK
- Modificar `android/app/build.gradle` para configuración de firma
- Editar `capacitor.config.ts` para ajustes de aplicación
- Agregar permisos en `AndroidManifest.xml` si se necesitan nuevas funciones

---

## 📊 Monitoreo y Debug

### Logs del backend
```powershell
# Ver logs en Event Viewer
Get-WinEvent -LogName Application -ProviderName "PCControl.Api" -MaxEvents 20

# O correr manualmente para ver salida
dotnet run --project backend/PCControl.Api
```

### Tests
```bash
# Tests unitarios frontend
npm test

# Tests de integración backend
dotnet test backend/PCControl.Api.Tests
```

---

## 📝 Licencia

MIT License - Libre para usar, modificar y distribuir.

---

*Documento generado automáticamente - mantiene actualizada la documentación junto con el código.*
