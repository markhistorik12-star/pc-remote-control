# PC Remote Hub — Edición Producto

Versión comercial e independiente lista para distribuir a cualquier usuario de Windows 10/11 + Android.

## Entregables listos para compartir (`dist-release/`)
1. **`PCRemote-Setup.exe` (Windows 10/11 x64):**
   - Instalador autocontenido de 1 clic (no requiere instalar .NET).
   - Abre automáticamente el puerto `5050` en el Firewall de Windows.
   - Configura el inicio silencioso junto con Windows.
   - Muestra un icono en la bandeja del reloj (*System Tray*) con **IP, Token y Código QR** para vincular el teléfono en segundos.
   - Incluye desinstalador limpio en el Menú Inicio (*Desinstalar PC Remote Hub*).
2. **`PCRemote-Product.apk` (Android):**
   - Paquete independiente (`com.pcremote.product` — convive sin conflictos con cualquier versión personal previa).
   - **Autodescubrimiento en Wi-Fi** de 1 toque + **Escáner de Código QR** + modo manual.
   - **Catálogo dinámico de programas** con buscador e **iconos reales** extraídos automáticamente del PC del usuario.
   - **Control universal de navegadores** (Chrome, Edge, Brave, Firefox, Opera) y **selector dinámico de cuentas de Steam**.

## Cómo recompilar todo
Desde PowerShell:
```powershell
.\build-product.ps1
```
