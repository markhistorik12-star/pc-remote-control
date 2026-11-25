# Habilita Wake-on-LAN en este PC (ejecutar como ADMINISTRADOR).
# Clic derecho en PowerShell -> "Ejecutar como administrador" y luego:
#   powershell -ExecutionPolicy Bypass -File .\scripts\habilitar_wol.ps1

param(
    [string]$Mac = 'F0-1E-34-14-2B-1B'
)

$ErrorActionPreference = 'Continue'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'ERROR: ejecuta este script como Administrador.' -ForegroundColor Red
    exit 1
}

Write-Host '1) Desactivando Inicio rapido (impide despertar el PC desde apagado)...'
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f | Out-Null

$normalized = $Mac.ToUpper().Replace(':', '-')
$nic = Get-NetAdapter -Physical | Where-Object { $_.MacAddress -eq $normalized } | Select-Object -First 1
if (-not $nic) {
    Write-Host "ERROR: no se encontro un adaptador fisico con MAC $normalized" -ForegroundColor Red
    Get-NetAdapter -Physical | Format-Table Name, InterfaceDescription, MacAddress, Status -AutoSize
    exit 1
}
Write-Host "2) Adaptador: $($nic.Name) - $($nic.InterfaceDescription)"

Write-Host '3) Activando opciones de despertar en el driver...'
# Palabras clave estandar de driver (independientes del idioma de Windows)
$settings = @{
    '*WakeOnMagicPacket' = '1'   # Reactivar con paquete magico
    '*WakeOnPattern'     = '1'   # Reactivar con coincidencia de patron
    'S5WakeOnLan'        = '1'   # Realtek: Shutdown Wake-On-Lan
    'WolShutdownLinkSpeed' = '2' # Realtek: no reducir velocidad al apagar (Not Speed Down)
    '*EEE'               = '0'   # Ethernet de bajo consumo (rompe WoL)
    'EnableGreenEthernet' = '0'
    'GreenEthernet'      = '0'
    'PowerSavingMode'    = '0'
    'ULPMode'            = '0'
    'EEELinkAdvertisement' = '0'
}
foreach ($key in $settings.Keys) {
    $prop = Get-NetAdapterAdvancedProperty -Name $nic.Name -RegistryKeyword $key -ErrorAction SilentlyContinue
    if ($prop) {
        try {
            Set-NetAdapterAdvancedProperty -Name $nic.Name -RegistryKeyword $key -RegistryValue $settings[$key] -NoRestart -ErrorAction Stop
            Write-Host "   OK  $key = $($settings[$key])"
        } catch {
            Write-Host "   --  $key no se pudo cambiar: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host '4) Administracion de energia del adaptador...'
try {
    Enable-NetAdapterPowerManagement -Name $nic.Name -WakeOnMagicPacket Enabled -WakeOnPattern Enabled -NoRestart -ErrorAction Stop
    Write-Host '   OK  Reactivar con paquete magico habilitado'
} catch {
    Write-Host "   --  $($_.Exception.Message)" -ForegroundColor Yellow
}
powercfg /deviceenablewake "$($nic.InterfaceDescription)" | Out-Null

Write-Host '5) Reiniciando el adaptador para aplicar cambios...'
Restart-NetAdapter -Name $nic.Name -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Dispositivos que pueden despertar el PC ahora:' -ForegroundColor Cyan
powercfg /devicequery wake_armed
Write-Host ''
Write-Host 'LISTO. Falta solo la BIOS: activa "Wake on LAN" / "Power On By PCI-E" (y desactiva "ErP/EuP" si existe).' -ForegroundColor Green
Write-Host 'Luego apaga el PC por completo y prueba el boton "Encender PC" desde el celular (misma red Wi-Fi).'
