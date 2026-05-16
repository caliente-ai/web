# Tiny static HTTP server for the ProEstimator AI mockup site.
# Uses .NET HttpListener - no Node/Python required.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File serve.ps1
#   powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080

param(
  [int]$Port = 5173,
  [string]$Root = (Join-Path $PSScriptRoot 'public')
)

if (-not (Test-Path $Root)) {
  Write-Error "Root directory not found: $Root"
  exit 1
}

Add-Type -AssemblyName System.Web

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try { $listener.Start() }
catch {
  Write-Error "Failed to start listener on $prefix. Try a different port."
  exit 1
}

Write-Host ""
Write-Host "  ProEstimator AI mockup is live:" -ForegroundColor Green
Write-Host ("    " + $prefix) -ForegroundColor Cyan
Write-Host ("    " + $prefix + "screens/editor.html  (live OSD + Konva)") -ForegroundColor Cyan
Write-Host ""
Write-Host ("  Serving from: " + $Root)
Write-Host "  Press Ctrl+C to stop"
Write-Host ""

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".mjs"  = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2"= "font/woff2"
  ".ttf"  = "font/ttf"
  ".map"  = "application/json; charset=utf-8"
  ".txt"  = "text/plain; charset=utf-8"
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      $rel = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath)
      if ($rel -eq "/" -or [string]::IsNullOrEmpty($rel)) { $rel = "/index.html" }
      $safe = $rel -replace '\.\.', '' -replace '^/+', ''
      $path = Join-Path $Root $safe

      if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }

      if (Test-Path $path -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
        $res.ContentType = $mime[$ext]
        if (-not $res.ContentType) { $res.ContentType = 'application/octet-stream' }
        $res.ContentLength64 = $bytes.LongLength
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host ("  200 " + $req.Url.AbsolutePath) -ForegroundColor DarkGray
      } else {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 not found: $rel")
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $msg.LongLength
        $res.OutputStream.Write($msg, 0, $msg.Length)
        Write-Host ("  404 " + $req.Url.AbsolutePath) -ForegroundColor Yellow
      }
    } catch {
      try {
        $err = [System.Text.Encoding]::UTF8.GetBytes("500 server error")
        $res.StatusCode = 500
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $err.LongLength
        $res.OutputStream.Write($err, 0, $err.Length)
      } catch {}
      Write-Host ("  500 " + $req.Url.AbsolutePath + " - " + $_.Exception.Message) -ForegroundColor Red
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
