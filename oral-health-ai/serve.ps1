# ── OralAI Local HTTP Server ──
# Pure PowerShell 5.1 compatible — no external tools needed
# Usage:  .\serve.ps1          (default port 8080)
#         .\serve.ps1 -Port 3000

param([int]$Port = 8080)

$Root = $PSScriptRoot

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.txt'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/plain; charset=utf-8'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "ERROR: Could not start server on port $Port" -ForegroundColor Red
    Write-Host "Try a different port: .\serve.ps1 -Port 9090" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  =========================================" -ForegroundColor Cyan
Write-Host "   OralAI Local Server" -ForegroundColor Cyan
Write-Host "  =========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URL  :  http://localhost:$Port" -ForegroundColor Green
Write-Host "  Root :  $Root" -ForegroundColor Gray
Write-Host "  Stop :  Press Ctrl+C" -ForegroundColor Gray
Write-Host ""

# Open browser
try { Start-Process "http://localhost:$Port" } catch {}

while ($listener.IsListening) {
    $context = $null
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }

    $req  = $context.Request
    $resp = $context.Response

    $urlPath = $req.Url.LocalPath
    $relPath = $urlPath.TrimStart('/').Replace('/', '\')
    if ([string]::IsNullOrEmpty($relPath)) { $relPath = 'index.html' }

    $filePath = Join-Path $Root $relPath

    # SPA fallback
    if (-not (Test-Path $filePath -PathType Leaf)) {
        $filePath = Join-Path $Root 'index.html'
    }

    $time = Get-Date -Format 'HH:mm:ss'

    if (Test-Path $filePath -PathType Leaf) {
        $ext   = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime  = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)

        $resp.StatusCode      = 200
        $resp.ContentType     = $mime
        $resp.ContentLength64 = $bytes.Length
        $resp.Headers.Add('Access-Control-Allow-Origin', '*')
        if ($ext -eq '.html' -or $ext -eq '.js') {
            $resp.Headers.Add('Cache-Control', 'no-cache, no-store')
        } else {
            $resp.Headers.Add('Cache-Control', 'public, max-age=3600')
        }
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host "  [$time] 200 $($req.HttpMethod) $urlPath" -ForegroundColor Green
    } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes('<h1>404 Not Found</h1>')
        $resp.StatusCode      = 404
        $resp.ContentType     = 'text/html'
        $resp.ContentLength64 = $body.Length
        $resp.OutputStream.Write($body, 0, $body.Length)
        Write-Host "  [$time] 404 $($req.HttpMethod) $urlPath" -ForegroundColor Red
    }

    try { $resp.OutputStream.Close() } catch {}
}

$listener.Stop()
Write-Host "Server stopped." -ForegroundColor Yellow
