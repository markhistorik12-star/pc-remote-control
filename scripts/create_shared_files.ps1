# ===========================================
# CREAR ARCHIVOS COMPARTIDOS - NO NECESITA RED
# ===========================================

Write-Host "=== CREANDO ARCHIVOS COMPARTIDOS ===" -ForegroundColor Green

# Crear carpeta compartida
$sharedFolder = "C:\pc_remote_shared"
if (-not (Test-Path $sharedFolder)) {
    New-Item -ItemType Directory -Force -Path $sharedFolder
    Write-Host "✅ Carpeta creada: $sharedFolder"
}

# Crear archivos de comandos
switch ("shutdown", "restart", "lock", "status") {
    case "shutdown" { "COMANDO: shutdown" | Out-File -FilePath "$sharedFolder\cmd_shutdown.txt" -Encoding UTF8; Write-Host "✅ Creado: cmd_shutdown.txt" }
    case "restart" { "COMANDO: restart" | Out-File -FilePath "$sharedFolder\cmd_restart.txt" -Encoding UTF8; Write-Host "✅ Creado: cmd_restart.txt" }
    case "lock" { "COMANDO: lock" | Out-File -FilePath "$sharedFolder\cmd_lock.txt" -Encoding UTF8; Write-Host "✅ Creado: cmd_lock.txt" }
    case "status" { "COMANDO: status" | Out-File -FilePath "$sharedFolder\cmd_status.txt" -Encoding UTF8; Write-Host "✅ Creado: cmd_status.txt" }
}

# Crear archivo de prueba
"Hola desde PC Remote!" | Out-File -FilePath "$sharedFolder\test.txt" -Encoding UTF8
Write-Host "✅ Archivo prueba creado: test.txt"

Write-Host "\n=== LISTO PARA USAR ===" -ForegroundColor Green
Write-Host "\n📱 En el celular, abre la app y ve a Configuración → Archivo Compartido"
Write-Host "   Navega a: C:\\pc_remote_shared (o la ruta que usaste)"
Write-Host "   Verás los archivos listos para leer"
Write-Host "\n🚀 ¡Ahora puedes enviar comandos sin necesidad de WiFi!"
