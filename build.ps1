param([switch]$Offline)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not $env:JAVA_HOME -and -not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw 'Set JAVA_HOME to a JDK 21 installation or add Java to PATH.'
}
# Windows JDK NIO can fail on the 8.3 TEMP alias; use a project-local socket directory.
$socketTemp = Join-Path $PSScriptRoot 'work\tmp'
New-Item -ItemType Directory -Path $socketTemp -Force | Out-Null
$env:TEMP = $socketTemp
$env:TMP = $socketTemp
$env:JAVA_TOOL_OPTIONS = "-Djdk.net.unixdomain.tmpdir=$($socketTemp.Replace('\','/'))"
$arguments = @('assembleDebug')
if ($Offline) { $arguments += '--offline' }
$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath $sdkRoot)) { $env:ANDROID_HOME = $sdkRoot }
$aapt = Join-Path $sdkRoot 'build-tools\34.0.0\aapt2.exe'
if (Test-Path -LiteralPath $aapt) { $arguments += "-Pandroid.aapt2FromMavenOverride=$aapt" }
$cachedGradle = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.gradle\wrapper\dists\gradle-8.9-bin') -Filter gradle.bat -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($cachedGradle) { & $cachedGradle.FullName @arguments } else { & .\gradlew.bat @arguments }
if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
