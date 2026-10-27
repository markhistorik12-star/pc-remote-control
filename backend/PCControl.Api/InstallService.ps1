<# 
.SYNOPSIS
    Installs PCControl.Api as a Windows Service

.DESCRIPTION
    Publishes the .NET 8 application and creates a Windows service that runs on startup.
    The service will listen on port 5000 (configurable via appsettings.json) and expose
    HTTP endpoints for remote PC control.

.NOTES
    Run as Administrator.
    Requires .NET 8 SDK to be installed.
#>

param(
    [string]$ProjectPath = ".\backend\PCControl.Api",
    [string]$ServiceName = "PCControl",
    [string]$DisplayName = "PC Control Service",
    [string]$Description = "Remote PC Control API Service"
)

# Ensure running as admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

Write-Host "=== PC Control Service Installer ===" -ForegroundColor Cyan

# Check if .NET 8+ is available (NET 10 can build NET 8 projects)
$dotnetVersion = dotnet --version 2>$null
if (-not $dotnetVersion) {
    Write-Error ".NET SDK not found. Please install .NET 8 SDK or later."
    exit 1
}
$majorVersion = [int]($dotnetVersion.Split('.')[0])
if ($majorVersion -lt 8) {
    Write-Error ".NET 8 SDK or later required. Found: $dotnetVersion"
    exit 1
}
Write-Host "Found .NET SDK: $dotnetVersion" -ForegroundColor Green

# Publish the application
Write-Host "`nPublishing application..." -ForegroundColor Yellow
$publishOutput = dotnet publish $ProjectPath -c Release -r win-x64 --self-contained true -o ".\publish"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to publish application"
    exit 1
}
Write-Host "Published to .\publish" -ForegroundColor Green

# Get the executable path
$exePath = Resolve-Path ".\publish\PCControl.Api.exe"
if (-not $exePath) {
    Write-Error "Published executable not found"
    exit 1
}
Write-Host "Executable: $exePath" -ForegroundColor Green

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Service '$ServiceName' already exists. Stopping and removing..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

# Create the service
Write-Host "`nCreating Windows service..." -ForegroundColor Yellow
$result = sc.exe create $ServiceName binPath= "`"$exePath`"" start= auto DisplayName= "$DisplayName"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create service"
    exit 1
}
Write-Host "Service created successfully" -ForegroundColor Green

# Set service description
sc.exe description $ServiceName "$Description" | Out-Null

# Configure recovery actions (restart on failure)
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/60000 | Out-Null

# Start the service
Write-Host "`nStarting service..." -ForegroundColor Yellow
Start-Service -Name $ServiceName
Start-Sleep -Seconds 3

# Check service status
$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Running') {
    Write-Host "`n=== Installation Successful! ===" -ForegroundColor Cyan
    Write-Host "Service '$ServiceName' is running." -ForegroundColor Green
    Write-Host "`nThe API is available at: http://localhost:5000" -ForegroundColor Cyan
    Write-Host "Check the console output or Event Viewer for the generated token." -ForegroundColor Yellow
    
    # Try to get the token from the service output
    Start-Sleep -Seconds 2
    $token = Get-Content ".\publish\appsettings.json" -Raw | ConvertFrom-Json | Select-Object -ExpandProperty Token
    if ($token) {
        Write-Host "`nToken: $token" -ForegroundColor Magenta
        Write-Host "Save this token to configure the mobile app!" -ForegroundColor Yellow
    }
} else {
    Write-Warning "Service created but not running. Check Event Viewer for errors."
    Write-Host "You can start it manually with: Start-Service -Name $ServiceName" -ForegroundColor Yellow
}

Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "  Start service:   Start-Service -Name $ServiceName"
Write-Host "  Stop service:    Stop-Service -Name $ServiceName"
Write-Host "  Restart service: Restart-Service -Name $ServiceName"
Write-Host "  Remove service:  sc.exe delete $ServiceName"
Write-Host "  View logs:       Get-WinEvent -LogName Application -ProviderName 'PCControl.Api'"