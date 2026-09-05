[CmdletBinding()]
param(
  [string]$OutputDirectory = "dist"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json

if (-not $manifest.version) {
  throw "manifest.json is missing version."
}

$requiredPaths = @(
  "manifest.json",
  "src",
  "README.md",
  "PRIVACY.md",
  "docs\INSTALLATION.md",
  "docs\RELEASING.md"
)

foreach ($relativePath in $requiredPaths) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "Required release path is missing: $relativePath"
  }
}

$resolvedOutput = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

$stagingName = "zotero-library-check-v$($manifest.version)"
$stagingPath = Join-Path $resolvedOutput $stagingName
$archivePath = Join-Path $resolvedOutput "$stagingName.zip"

if (Test-Path -LiteralPath $stagingPath) {
  Remove-Item -LiteralPath $stagingPath -Recurse -Force
}
if (Test-Path -LiteralPath $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

New-Item -ItemType Directory -Path $stagingPath | Out-Null

Copy-Item -LiteralPath (Join-Path $projectRoot "manifest.json") -Destination $stagingPath
Copy-Item -LiteralPath (Join-Path $projectRoot "src") -Destination $stagingPath -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot "README.md") -Destination $stagingPath
Copy-Item -LiteralPath (Join-Path $projectRoot "PRIVACY.md") -Destination $stagingPath
Copy-Item -LiteralPath (Join-Path $projectRoot "docs") -Destination $stagingPath -Recurse

Compress-Archive -Path (Join-Path $stagingPath "*") -DestinationPath $archivePath -CompressionLevel Optimal
Remove-Item -LiteralPath $stagingPath -Recurse -Force

$archive = Get-Item -LiteralPath $archivePath
Write-Output "Created: $($archive.FullName)"
Write-Output "Size: $([Math]::Round($archive.Length / 1KB, 1)) KB"
