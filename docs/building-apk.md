# Building APK (Android)

Build local (sin CI) del APK firmado de PC Remote Control desde el proyecto Capacitor.

## Requisitos

- **JDK 17** instalado y configurado (`JAVA_HOME`)
- **Android SDK** con API 34+ (`ANDROID_HOME`)
- **Gradle wrapper** ejecutable (`frontend/android/gradlew`)

## Variables de entorno (PowerShell)

```powershell
$env:ANDROID_HOME="C:\Users\Acer\AppData\Local\Android\Sdk"
$env:KEYSTORE_PASSWORD="<tu-contraseña-de-keystore>"
$env:KEY_PASSWORD="<tu-contraseña-de-clave>"
```

## Comandos

Desde `frontend/android/`:

### 1. Verificar entorno

```powershell
./gradlew --version
```

### 2. Build APK de depuración (no requiere firma)

```powershell
./gradlew assembleDebug
```

Salida: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Build APK de release (firmado)

```powershell
./gradlew assembleRelease
```

Salida: `frontend/android/app/build/outputs/apk/release/app-release.apk`

La configuración de firma usa `release.keystore` en `frontend/android/` y las variables de entorno `KEYSTORE_PASSWORD` / `KEY_PASSWORD`.

## Archivos modificados

- `frontend/android/app/build.gradle` — ruta corregida del keystore (`../release.keystore`) y bloque `release` duplicado eliminado en `buildTypes`
- `frontend/android/app/capacitor.build.gradle` — `sourceCompatibility`/`targetCompatibility` de `VERSION_21` a `VERSION_17`
- `frontend/node_modules/@capacitor/android/capacitor/build.gradle` — `sourceCompatibility`/`targetCompatibility` de `VERSION_21` a `VERSION_17`
- `frontend/android/gradle.properties` — agregado `android.useAndroidX=true` y `android.enableJetifier=true`

## Notas

- `release.keystore` **no se commitea** (se agrega a `.gitignore` o se maneja por CI secrets).
- Los APKs generados en `build/` **no se commitean** (están en `.gitignore`).
