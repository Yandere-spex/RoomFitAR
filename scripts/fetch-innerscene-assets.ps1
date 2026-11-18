# CC0 model download manifest from Innerscene Free Parts Library.
# Run from the project root; verifies reproducible official downloads.
$ErrorActionPreference='Stop'
$dir=Join-Path $PSScriptRoot '..\public\models\innerscene'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$entries=@(
 @{Slug='halo-papasan-lounge-chair-85f105b2';Name='papasan-chair.glb';Sha='577214b4d279d8726fc44809e84185a1f87f5810b8b74d614d192d05e7f357b2'},
 @{Slug='weave-woven-lounge-rocker-fde80661';Name='woven-lounge-rocker.glb';Sha='94d91bddf8a4b2f99d1ea89740adf35c0f244360907c1d6f073ffe4e3111b493'}
)
foreach($entry in $entries){
 $out=Join-Path $dir $entry.Name
 $url='https://www.innerscene.com/api/library/'+$entry.Slug+'/download'
 if((Test-Path $out) -and (Get-FileHash $out -Algorithm SHA256).Hash.ToLowerInvariant() -eq $entry.Sha){
  Write-Output ('Verified already: '+$entry.Name)
  continue
 }
 Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 75 -OutFile $out
 $sha=(Get-FileHash $out -Algorithm SHA256).Hash.ToLowerInvariant()
 if($sha -ne $entry.Sha){throw ('Download checksum changed: '+$entry.Name+'. Verify source and licensing manually before republishing.')}
 $bytes=[IO.File]::ReadAllBytes($out)
 if([Text.Encoding]::ASCII.GetString($bytes,0,4) -ne 'glTF'){throw ('Invalid GLB: '+$entry.Name)}
 Write-Output ('Verified: '+$entry.Name)
}
