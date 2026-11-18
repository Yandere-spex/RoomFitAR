# Reproducible Poly Haven (CC0) source asset fetcher for RoomFit's 1K mobile catalog.
# Run from PowerShell: powershell -ExecutionPolicy Bypass -File scripts/fetch-polyhaven-assets.ps1
# Then run: node scripts/pack-polyhaven-glb.mjs
$ErrorActionPreference='Stop'
$ids=@('wooden_stool_02','plastic_monobloc_chair_01','coffee_table_round_01','small_wooden_table_01','mid_century_lounge_chair')
$root=Join-Path $PSScriptRoot '..\public\models\polyhaven'
$headers=@{'User-Agent'='RoomFitAR-Prototype/0.4'}
function Get-CheckedAsset($url,$out,$expectedMd5){
  $folder=Split-Path -Parent $out
  if(-not (Test-Path $folder)){New-Item -ItemType Directory -Path $folder -Force|Out-Null}
  if((Test-Path $out) -and (Get-FileHash -Algorithm MD5 $out).Hash -eq $expectedMd5){return}
  Invoke-WebRequest -UseBasicParsing -Uri $url -Headers $headers -OutFile $out
  if((Get-FileHash -Algorithm MD5 $out).Hash -ne $expectedMd5){throw "Checksum mismatch: $out"}
}
foreach($id in $ids){
  $response=Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$id" -Headers $headers
  $gltf=$response.gltf.'1k'.gltf
  if(-not $gltf){throw "Missing 1K glTF for $id"}
  $dir=Join-Path $root $id
  Get-CheckedAsset $gltf.url (Join-Path $dir ($id+'_1k.gltf')) $gltf.md5
  foreach($dep in $gltf.include.PSObject.Properties){
    Get-CheckedAsset $dep.Value.url (Join-Path $dir $dep.Name) $dep.Value.md5
  }
  Write-Output "Fetched verified source files for $id"
}
Write-Output 'Next: node scripts/pack-polyhaven-glb.mjs'
