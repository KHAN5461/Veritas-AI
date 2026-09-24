Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\Users\Admin\Documents\antigravity\elegant-euclid\multi-modal-deepfake-v2-main\apps\web\public\logo.png")

$newImg192 = new-object System.Drawing.Bitmap 192, 192
$g192 = [System.Drawing.Graphics]::FromImage($newImg192)
$g192.DrawImage($img, 0, 0, 192, 192)
$newImg192.Save("C:\Users\Admin\Documents\antigravity\elegant-euclid\multi-modal-deepfake-v2-main\apps\web\public\icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)

$newImg512 = new-object System.Drawing.Bitmap 512, 512
$g512 = [System.Drawing.Graphics]::FromImage($newImg512)
$g512.DrawImage($img, 0, 0, 512, 512)
$newImg512.Save("C:\Users\Admin\Documents\antigravity\elegant-euclid\multi-modal-deepfake-v2-main\apps\web\public\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Done"
