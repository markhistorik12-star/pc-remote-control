# Master Build Script for PC Remote Hub (Product Edition)
# Generates:
#   1) producto\dist-release\PCRemote-Setup.exe   (Self-contained Windows Installer)
#   2) producto\dist-release\PCRemote-Product.apk (Signed Android Release APK)

$ErrorActionPreference = "Stop"
$productRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $productRoot "dist-release"
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

Write-Host "=== [1/4] Publishing PCRemote.Agent (win-x64 self-contained) ==="
$agentProj = Join-Path $productRoot "agent\PCRemote.Agent.csproj"
$agentOut = Join-Path $productRoot "agent\publish"
Get-Process -Name "PCRemote.Agent" -ErrorAction SilentlyContinue | Stop-Process -Force
& dotnet build-server shutdown | Out-Null

& dotnet publish $agentProj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $agentOut
if ($LASTEXITCODE -ne 0) { throw "Failed to publish PCRemote.Agent" }

Write-Host "`n=== [2/4] Compressing Agent Payload & Building PCRemote-Setup.exe ==="
$payloadDir = Join-Path $productRoot "installer\payload"
New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null
$agentExe = Join-Path $agentOut "PCRemote.Agent.exe"
$payloadGz = Join-Path $payloadDir "PCRemote.Agent.exe.gz"

$inStream = [System.IO.File]::OpenRead($agentExe)
try {
    $outStream = [System.IO.File]::Create($payloadGz)
    try {
        $gzip = [System.IO.Compression.GZipStream]::new($outStream, [System.IO.Compression.CompressionLevel]::Optimal)
        try {
            $inStream.CopyTo($gzip)
        } finally {
            $gzip.Dispose()
        }
    } finally {
        $outStream.Dispose()
    }
} finally {
    $inStream.Dispose()
}

$installerProj = Join-Path $productRoot "installer\PCRemote.Installer.csproj"
$installerOut = Join-Path $productRoot "installer\publish"
& dotnet publish $installerProj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $installerOut
if ($LASTEXITCODE -ne 0) { throw "Failed to publish PCRemote-Setup.exe" }

$finalSetupExe = Join-Path $distDir "PCRemote-Setup.exe"
Copy-Item (Join-Path $installerOut "PCRemote-Setup.exe") $finalSetupExe -Force

Write-Host "`n=== [3/4] Building Web Bundle & Signed Android APK (PCRemote-Product.apk) ==="
Push-Location (Join-Path $productRoot "mobile")
try {
    cmd /c "npm run build && npx cap sync android"
    if ($LASTEXITCODE -ne 0) { throw "Frontend build / cap sync failed" }
} finally {
    Pop-Location
}

$env:ANDROID_HOME = "C:\Users\Acer\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Acer\AppData\Local\Android\Sdk"

Push-Location (Join-Path $productRoot "mobile\android")
try {
    & .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease failed" }
} finally {
    Pop-Location
}

$builtApk = Join-Path $productRoot "mobile\android\app\build\outputs\apk\release\app-release.apk"
$finalApk = Join-Path $distDir "PCRemote-Product.apk"
Copy-Item $builtApk $finalApk -Force

Write-Host "`n=== [4/4] Release Deliverables Ready ==="
Get-ChildItem $distDir | Select-Object Name, @{N='Size_MB';E={[math]::Round($_.Length/1MB,2)}}, LastWriteTime | Format-Table -AutoSize
