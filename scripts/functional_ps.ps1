$ErrorActionPreference = 'Stop'
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$t = (Get-Date).ToString('yyyyMMddHHmmss')
$uname = "testuser_$t"
$email = "${uname}@example.com"
$pass = 'Test1234!'
$body = @{ username = $uname; email = $email; password = $pass; address = '123 Test St'; contact = '1234567890'; role = 'user' }
Write-Output "Registering user: $email"
try {
    $reg = Invoke-WebRequest -Uri 'http://localhost:3000/register' -Method POST -Body $body -WebSession $sess -UseBasicParsing -TimeoutSec 10
    Write-Output "register status: $($reg.StatusCode)"
} catch {
    Write-Output "register ERROR: $($_.Exception.Message)"
}

Write-Output "Logging in..."
$loginBody = @{ email = $email; password = $pass }
try {
    $log = Invoke-WebRequest -Uri 'http://localhost:3000/login' -Method POST -Body $loginBody -WebSession $sess -UseBasicParsing -TimeoutSec 10
    Write-Output "login status: $($log.StatusCode)"
    if ($log.Headers['Set-Cookie']) { Write-Output "set-cookie: $($log.Headers['Set-Cookie'])" }
} catch {
    Write-Output "login ERROR: $($_.Exception.Message)"
}

Write-Output "GET /shopping with session"
try {
    $s = Invoke-WebRequest -Uri 'http://localhost:3000/shopping' -WebSession $sess -UseBasicParsing -TimeoutSec 10
    Write-Output "/shopping => $($s.StatusCode) | len:$($s.Content.Length)"
} catch {
    Write-Output "/shopping ERROR: $($_.Exception.Message)"
}

Write-Output "GET /cart with session"
try {
    $c = Invoke-WebRequest -Uri 'http://localhost:3000/cart' -WebSession $sess -UseBasicParsing -TimeoutSec 10
    Write-Output "/cart => $($c.StatusCode) | len:$($c.Content.Length)"
} catch {
    Write-Output "/cart ERROR: $($_.Exception.Message)"
}

Write-Output "Functional PS script finished. Created user: $email (password: $pass)"
