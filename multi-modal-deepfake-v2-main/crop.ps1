Add-Type -AssemblyName System.Drawing

$srcFile = "C:\Users\Admin\.gemini\antigravity\brain\4377e05e-aeba-4688-a975-5675f520cbf8\.user_uploaded\media_1790221986125.png"
$destFile = "C:\Users\Admin\Documents\antigravity\elegant-euclid\multi-modal-deepfake-v2-main\apps\web\public\logo.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcFile)
$minX = $bmp.Width
$minY = $bmp.Height
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

if ($minX -lt $maxX -and $minY -lt $maxY) {
    # Add a small padding
    $pad = 10
    $minX = [Math]::Max(0, $minX - $pad)
    $minY = [Math]::Max(0, $minY - $pad)
    $maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
    $maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)

    $rect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    $bmp.Dispose()
    
    $cropped.Save($destFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Cropped successfully! Dimensions: $($rect.Width)x$($rect.Height)"
} else {
    Write-Host "Could not find bounds!"
}
