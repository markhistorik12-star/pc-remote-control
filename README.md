# PC Remote Hub

Controla tu PC con Windows desde tu teléfono Android a través de tu red Wi-Fi local — sin cuentas en la nube, sin configuraciones manuales de consola y con detección automática de todos tus programas y juegos instalados.

---

## ✨ Características Principales

- **⚡ Control de Energía:** Apagar, Reiniciar, Suspender (con confirmación de seguridad) y Bloquear sesión con un toque.
- **🖥️ Perfiles Multi-Dispositivo:**
  - Guarda y personaliza varios equipos (nombre propio e icono por tipo: *Escritorio, Portátil, Gaming o Trabajo*) y cambia entre ellos con un toque desde la pantalla principal.
- **🧩 Detección Automática de Programas e Iconos Reales:**
  - Escanea automáticamente las aplicaciones instaladas en tu PC (escritorio, Microsoft Store y juegos de bibliotecas como Steam) y muestra sus **iconos originales** en alta definición en el teléfono.
  - Catálogo interactivo con buscador, filtros por categoría (*Apps, Juegos, Navegadores*) y soporte para añadir ejecutables portables (`.exe`) manualmente.
- **🌐 Control Universal del Navegador:**
  - Compatible con **Google Chrome, Microsoft Edge, Brave, Mozilla Firefox y Opera**.
  - Incluye barra para abrir URLs o buscar en Google, accesos rápidos (*YouTube, Google, Twitch, Netflix*), navegación (*Atrás, Recargar, Adelante*), gestión de pestañas (*Anterior, Siguiente, Reabrir cerrada, Cerrar*) y *Zoom*.
- **🎮 Selector Dinámico de Cuentas de Steam:**
  - Si tienes Steam instalado con varias sesiones guardadas, permite elegir directamente desde el teléfono con qué perfil iniciar sin pasar por la pantalla *"¿Quién está jugando?"*.
- **📱 Vinculación Instantánea (Cero Consola):**
  - **Autodescubrimiento en Wi-Fi:** detecta automáticamente los equipos con *PC Remote Hub* activos en tu red local.
  - **Código QR:** escanea el QR desde el icono junto al reloj de Windows para vincular IP, puerto y Token en segundos.
- **🎨 9 Temas de Colores Personalizables:**
  - Personaliza la apariencia de la app al instante eligiendo entre 9 paletas (*Ámbar Original, Océano Cian, Esmeralda, Amatista, Carmesí, Neón Cyberpunk, Atardecer, Nórdico Ártico* y modo claro *Marfil*).
- **🪶 Ultraligero y Silencioso:**
  - Se ejecuta en segundo plano en la bandeja del sistema de Windows (*System Tray*) con optimización automática de memoria y **0% de uso de CPU** en reposo.

---

## 🚀 Instalación Rápida (Para Usuarios)

No necesitas instalar .NET ni abrir terminales. Solo descarga los **2 archivos** desde la sección [**Releases**](../../releases):

### 1. En tu PC (Windows 10 / 11 de 64 bits)
1. Descarga y ejecuta **`PCRemote-Setup.exe`**.
2. Acepta el permiso de instalación y pulsa **"Instalar y Mostrar Código QR"**.
   - El instalador configura automáticamente la regla del **Firewall de Windows** (puerto TCP `5050`) y el **inicio automático con Windows**.
3. Al finalizar se abrirá la ventana de **PC Remote Hub** junto al reloj de Windows mostrando tu **Código QR** y tu **Token de 6 caracteres**.

### 2. En tu Teléfono (Android 7.0+)
1. Descarga e instala **`PCRemote-Product.apk`**.
2. Abre **PC Remote Hub** y toca **"Vincular tu PC"**:
   - **Por Wi-Fi:** selecciona tu PC detectado automáticamente e ingresa el Token de 6 caracteres.
   - **Por Código QR:** cambia a la pestaña *Código QR* y apunta la cámara a la pantalla de tu PC.
3. Toca **"+ Editar / Agregar"** en *Mis Aplicaciones* para marcar los programas, navegadores o juegos de tu PC que quieras tener en tu pantalla principal.

---

## 🔒 Seguridad y Privacidad

- **100% Red Local (LAN):** toda la comunicación ocurre directamente entre tu teléfono y tu PC dentro de tu Wi-Fi local; ningún dato pasa por servidores externos.
- **Token Único por Equipo:** cada instalación genera criptográficamente un Token aleatorio de 6 caracteres. Puedes regenerarlo en cualquier momento haciendo clic en el icono de *PC Remote Hub* en la bandeja de Windows → **Nuevo Token**.

---

## 🛠️ Gestión en Windows y Desinstalación

- **Ver Código QR / Token:** haz clic izquierdo sobre el icono de **PC Remote Hub** en la bandeja del sistema (junto al reloj de Windows).
- **Activar o desactivar inicio con Windows:** haz clic derecho sobre el icono de la bandeja → *Iniciar automáticamente con Windows*.
- **Desinstalar por completo:** abre el Menú Inicio de Windows → **PC Remote Hub** → **Desinstalar PC Remote Hub** (detiene el agente, elimina la regla del Firewall, quita el inicio automático y borra los archivos instalados).

---

## ❓ Solución de Problemas

| Situación | Solución |
|---|---|
| **El teléfono no detecta el PC** | Verifica que el teléfono y el PC estén conectados a la **misma red Wi-Fi / router** (evita redes Wi-Fi de invitados con aislamiento de clientes). |
| **Error al vincular con el Token** | Haz clic en el icono de *PC Remote Hub* junto al reloj de Windows y verifica los 6 caracteres exactos, o usa la pestaña **Manual** ingresando la IP y puerto (`5050`) que muestra la ventana del PC. |
| **Quiero agregar un juego o app portable** | En la app móvil entra a **Editar / Agregar** → botón **`+ .exe`** arriba a la derecha y pega la ruta del ejecutable en tu PC (ej. `D:\Juegos\MiJuego.exe`). |

---

## 📄 Licencia

Distribuido bajo licencia MIT.
