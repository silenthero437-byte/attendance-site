$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Attendance site is running at http://localhost:8000/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))

    $filePath = if ([string]::IsNullOrWhiteSpace($requestPath)) { Join-Path $root "index.html" } else { Join-Path $root $requestPath }

    if ([System.IO.File]::Exists($filePath)) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $mime = switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
            ".html" { "text/html; charset=utf-8" }
            ".css" { "text/css; charset=utf-8" }
            ".js" { "application/javascript; charset=utf-8" }
            ".json" { "application/json; charset=utf-8" }
            ".svg" { "image/svg+xml" }
            default { "application/octet-stream" }
        }

        $context.Response.ContentType = $mime
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.OutputStream.Close()
        continue
    }

    if ([System.IO.Directory]::Exists($filePath)) {
        $indexPath = Join-Path $filePath "index.html"
        if ([System.IO.File]::Exists($indexPath)) {
            $bytes = [System.IO.File]::ReadAllBytes($indexPath)
            $context.Response.ContentType = "text/html; charset=utf-8"
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $context.Response.OutputStream.Close()
            continue
        }
    }

    $message = "404 - Not Found"
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($message)
    $context.Response.StatusCode = 404
    $context.Response.ContentType = "text/plain; charset=utf-8"
    $context.Response.ContentLength64 = $buffer.Length
    $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $context.Response.OutputStream.Close()
}

$listener.Stop()
