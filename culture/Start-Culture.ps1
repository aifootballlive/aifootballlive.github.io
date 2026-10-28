param([switch]$Publish)
$ErrorActionPreference = 'Stop'
$cultureRoot = Split-Path -Parent $PSScriptRoot
$cultureRuntime = Join-Path $PSScriptRoot '.runtime'
New-Item -ItemType Directory -Force -Path $cultureRuntime | Out-Null
$cultureNode = (Get-Command node -ErrorAction Stop).Source
$cultureTailscale = 'C:\Program Files\Tailscale\tailscale.exe'
if(Test-Path -LiteralPath $cultureTailscale){try{$cultureTailStatus = & $cultureTailscale status --json | ConvertFrom-Json;$env:CULTURE_ALLOWED_HOSTS = $cultureTailStatus.Self.DNSName.TrimEnd('.')}catch{}}
$cultureAlreadyRunning = $false
try{$cultureHealth = Invoke-RestMethod 'http://127.0.0.1:8894/culture-api/admin' -TimeoutSec 2;$cultureAlreadyRunning = $cultureHealth.backend -eq 'local'}catch{}
if(-not $cultureAlreadyRunning){
 $cultureProcess = Start-Process -FilePath $cultureNode -ArgumentList 'culture/server.mjs' -WorkingDirectory $cultureRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $cultureRuntime 'server.log') -RedirectStandardError (Join-Path $cultureRuntime 'server-error.log') -PassThru
 Set-Content -LiteralPath (Join-Path $cultureRuntime 'server.pid') -Value $cultureProcess.Id
}
if($Publish){
 $culturePublisherRunning = $false
 $culturePublisherPidFile = Join-Path $cultureRuntime 'publisher.pid'
 if(Test-Path -LiteralPath $culturePublisherPidFile){
  $culturePublisherPid = Get-Content -LiteralPath $culturePublisherPidFile
  $culturePublisherProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$culturePublisherPid" -ErrorAction SilentlyContinue
  $culturePublisherRunning = $culturePublisherProcess -and $culturePublisherProcess.CommandLine -match 'culture[/\\]publish\.mjs --watch'
 }
 if(-not $culturePublisherRunning){
  $culturePublisher = Start-Process -FilePath $cultureNode -ArgumentList 'culture/publish.mjs --watch' -WorkingDirectory $cultureRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $cultureRuntime 'publisher.log') -RedirectStandardError (Join-Path $cultureRuntime 'publisher-error.log') -PassThru
  Set-Content -LiteralPath $culturePublisherPidFile -Value $culturePublisher.Id
 }
}
Write-Output 'Uygulamalarım: http://127.0.0.1:8894/uygulamalarim.html?app=culture'
Write-Output 'OBS kültür yayını: http://127.0.0.1:8894/culture.html'
