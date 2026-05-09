$ErrorActionPreference = 'Stop'

$Keystore = if ($env:KEYSTORE) { $env:KEYSTORE } else { 'charynn-release.jks' }
$Alias    = if ($env:ALIAS)    { $env:ALIAS }    else { 'charynn-release' }
$Validity = if ($env:VALIDITY) { $env:VALIDITY } else { '10000' }

if (Test-Path $Keystore) {
  Write-Host "[gen-keystore] $Keystore already exists. Delete it manually if you want to regenerate."
  exit 1
}

Write-Host "[gen-keystore] Generating $Keystore (alias=$Alias, validity=$Validity days)..."
& keytool -genkey -v `
  -keystore $Keystore `
  -keyalg RSA -keysize 2048 `
  -validity $Validity `
  -alias $Alias

Write-Host ""
Write-Host "[gen-keystore] Encoding to base64 -> keystore.b64"
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Keystore))
[Convert]::ToBase64String($bytes) | Out-File -Encoding ascii keystore.b64

Write-Host ""
Write-Host "[gen-keystore] DONE. Add these GitHub repo Secrets (Settings -> Secrets and variables -> Actions):"
Write-Host "  KEYSTORE_BASE64    = (contents of keystore.b64)"
Write-Host "  KEYSTORE_PASSWORD  = (the keystore password you just entered)"
Write-Host "  KEY_ALIAS          = $Alias"
Write-Host "  KEY_PASSWORD       = (the key password you just entered)"
Write-Host ""
Write-Host "Both $Keystore and keystore.b64 are gitignored. Keep $Keystore in a SAFE BACKUP — losing it means you can never update this app under the same identity."
