param([string]$ScriptPath)
$client=[Net.Sockets.TcpClient]::new([Net.Sockets.AddressFamily]::InterNetwork)
try {
    $client.Connect('127.0.0.1',9876)
    $stream=$client.GetStream()
    $stream.ReadTimeout=120000
    $code=Get-Content -LiteralPath $ScriptPath -Raw
    $code="__file__ = " + (ConvertTo-Json $ScriptPath -Compress) + "`n" + $code
    $request=@{type='execute_code';params=@{code=$code}} | ConvertTo-Json -Depth 6 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($request)
    $stream.Write($bytes,0,$bytes.Length)
    $buffer=[byte[]]::new(65536)
    $text=[Text.StringBuilder]::new()
    while($true) {
        $count=$stream.Read($buffer,0,$buffer.Length)
        if($count -eq 0){throw 'Connection closed before JSON response'}
        [void]$text.Append([Text.Encoding]::UTF8.GetString($buffer,0,$count))
        try {$result=$text.ToString() | ConvertFrom-Json -ErrorAction Stop; break} catch {}
    }
    $result | ConvertTo-Json -Depth 10
    if($result.status -ne 'success'){exit 1}
} finally {$client.Dispose()}
