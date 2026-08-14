$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseDirectory = Join-Path $projectRoot "src-tauri\target\release"
$application = Join-Path $releaseDirectory "legal-time-tracker.exe"
$installers = @(
  Get-ChildItem -Path (Join-Path $releaseDirectory "bundle") -Recurse -File |
    Where-Object { $_.Extension -in @(".exe", ".msi") }
)

if (-not (Test-Path -LiteralPath $application)) {
  throw "The Windows application executable was not produced."
}

if ($installers.Count -lt 2) {
  throw "Expected both NSIS and MSI installers, but found $($installers.Count)."
}

$signedArtifacts = @((Get-Item -LiteralPath $application)) + $installers

foreach ($artifact in $signedArtifacts) {
  $signature = Get-AuthenticodeSignature -LiteralPath $artifact.FullName
  if ($signature.Status -ne "Valid") {
    throw "Invalid Authenticode signature for $($artifact.Name): $($signature.Status)"
  }
}

$process = Start-Process -FilePath $application -PassThru
Start-Sleep -Seconds 5
if ($process.HasExited) {
  throw "The packaged Windows application exited during its launch smoke test with code $($process.ExitCode)."
}
Stop-Process -Id $process.Id -Force

Write-Host "Verified the signed application and $($installers.Count) installers, then completed the launch smoke test."
