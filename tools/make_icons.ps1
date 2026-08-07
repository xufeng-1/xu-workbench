Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
function New-Icon([int]$size, [string]$path, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $c1 = [System.Drawing.Color]::FromArgb(255, 124, 107, 212)
  $c2 = [System.Drawing.Color]::FromArgb(255, 185, 169, 232)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 50)
  $g.FillRectangle($brush, $rect)
  $spotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, 255, 255, 255))
  $g.FillEllipse($spotBrush, [int]($size*0.62), [int](-$size*0.18), [int]($size*0.7), [int]($size*0.7))
  $padFrac = 0.16
  if ($maskable) { $padFrac = 0.24 }
  $pad = [int]($size * $padFrac)
  $badgeRect = New-Object System.Drawing.Rectangle($pad, $pad, ($size - 2*$pad), ($size - 2*$pad))
  $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
  $rad = [int]($badgeRect.Width * 0.28)
  $pathObj = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2*$rad
  $pathObj.AddArc($badgeRect.X, $badgeRect.Y, $d, $d, 180, 90)
  $pathObj.AddArc(($badgeRect.Right-$d), $badgeRect.Y, $d, $d, 270, 90)
  $pathObj.AddArc(($badgeRect.Right-$d), ($badgeRect.Bottom-$d), $d, $d, 0, 90)
  $pathObj.AddArc($badgeRect.X, ($badgeRect.Bottom-$d), $d, $d, 90, 90)
  $pathObj.CloseFigure()
  $g.FillPath($badgeBrush, $pathObj)
  $font = New-Object System.Drawing.Font('Segoe UI', [float]($size*0.30), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 124, 107, 212))
  $textRect = New-Object System.Drawing.RectangleF(0, [int]($size*0.05), $size, [int]($size*0.75))
  $g.DrawString('xu', $font, $textBrush, $textRect, $sf)
  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 185, 169, 232))
  $dotY = [int]($size*0.80)
  foreach ($dx in @(-0.10, 0, 0.10)) {
    $cx = [int]($size*0.5 + $size*$dx)
    $g.FillEllipse($dotBrush, ($cx-[int]($size*0.018)), $dotY, [int]($size*0.036), [int]($size*0.036))
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output ("icon: " + $path)
}
$outDir = 'C:\Users\Thinkpad\Documents\Codex\2026-08-03\new-chat\work\xu-workbench\docs\icons'
New-Icon 192 (Join-Path $outDir 'icon-192.png') $false
New-Icon 512 (Join-Path $outDir 'icon-512.png') $false
New-Icon 512 (Join-Path $outDir 'icon-maskable-512.png') $true
New-Icon 180 (Join-Path $outDir 'apple-touch-icon.png') $false
