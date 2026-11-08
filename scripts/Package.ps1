$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    & node scripts/validate.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Validation failed.' }
    & node --test 'tests/*.test.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    $manifest = Get-Content -LiteralPath (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
    $dist = Join-Path $root 'dist'
    New-Item -ItemType Directory -Path $dist -Force | Out-Null
    $archive = Join-Path $dist ('Brave-EndShift-' + $manifest.version + '.zip')
    $checksum = $archive + '.sha256'
    if ((Test-Path -LiteralPath $archive) -or (Test-Path -LiteralPath $checksum)) {
        throw 'A package with this version already exists. Move it aside or bump the version.'
    }
    $files = @('manifest.json', 'content.js', 'popup.html', 'popup.css', 'popup.js',
        'README.md', 'LICENSE', 'PRIVACY.md', 'CHANGELOG.md', 'docs/KULLANIM.md', 'docs/RELEASING.md')
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $file),
                $file, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $zip.Dispose() }
    $hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText($checksum, "$hash  $([IO.Path]::GetFileName($archive))`n", [Text.Encoding]::ASCII)
    Write-Host "Package: $archive"
    Write-Host "SHA256: $hash"
} finally { Pop-Location }
