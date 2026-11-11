param(
    [Parameter(Mandatory)][string]$Compiler,
    [Parameter(Mandatory)][string]$ElectronRuntime,
    [Parameter(Mandatory)][string]$BuildDirectory,
    [Parameter(Mandatory)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$gameRoot = (Get-Item -LiteralPath $PSScriptRoot).Parent.FullName
$compilerPath = (Get-Item -LiteralPath $Compiler).FullName
$runtimePath = (Get-Item -LiteralPath $ElectronRuntime).FullName
$buildPath = (Get-Item -LiteralPath $BuildDirectory).FullName
$outputPath = (Get-Item -LiteralPath $OutputDirectory).FullName
$messages = Join-Path (Split-Path -Parent $compilerPath) 'Languages\ChineseSimplified.isl'
if (-not (Test-Path -LiteralPath (Join-Path $runtimePath 'electron.exe') -PathType Leaf)) {
    throw 'ElectronRuntime must be the extracted Electron Windows x64 archive.'
}

Add-Type -AssemblyName System.Drawing
$iconPath = Join-Path $buildPath 'Game.ico'
$art = [System.Drawing.Image]::FromFile((Join-Path $gameRoot 'assets\economy\milkcoin.png'))
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$frames = [Collections.Generic.List[byte[]]]::new()
try {
    foreach ($size in $sizes) {
        $bitmap = [System.Drawing.Bitmap]::new($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $memory = [IO.MemoryStream]::new()
        try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $scale = $size / [Math]::Max($art.Width, $art.Height)
            $w = [int]($art.Width * $scale)
            $h = [int]($art.Height * $scale)
            $graphics.DrawImage($art, [int](($size - $w) / 2), [int](($size - $h) / 2), $w, $h)
            $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
            $frames.Add($memory.ToArray())
        } finally {
            $memory.Dispose()
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }
} finally {
    $art.Dispose()
}

$icon = [IO.BinaryWriter]::new([IO.File]::Create($iconPath))
try {
    $icon.Write([uint16]0)
    $icon.Write([uint16]1)
    $icon.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $dimension = [byte]($sizes[$i] % 256)
        $icon.Write($dimension)
        $icon.Write($dimension)
        $icon.Write([byte]0)
        $icon.Write([byte]0)
        $icon.Write([uint16]1)
        $icon.Write([uint16]32)
        $icon.Write([uint32]$frames[$i].Length)
        $icon.Write([uint32]$offset)
        $offset += $frames[$i].Length
    }
    foreach ($frame in $frames) { $icon.Write($frame) }
} finally {
    $icon.Dispose()
}

$setupPath = Join-Path $buildPath 'Setup.iss'
$script = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'Setup.iss'))
[IO.File]::WriteAllText($setupPath, $script, [Text.UTF8Encoding]::new($true))
$setupArgs = @(
    '/Qp', "/DGameRoot=$gameRoot", "/DGameIcon=$iconPath", "/DChineseMessages=$messages",
    "/DDesktopRuntime=$runtimePath", "/O$outputPath", $setupPath
)
& $compilerPath @setupArgs
if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed ($LASTEXITCODE)" }

Get-Item -LiteralPath (Join-Path $outputPath 'RiftStrike-Windows-x64-Setup.exe')
