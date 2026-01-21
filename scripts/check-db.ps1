# PowerShell script to check database connection

Write-Host "Checking Docker containers..." -ForegroundColor Cyan
docker ps --filter "name=aic-postgres"

Write-Host "`nChecking if PostgreSQL is accessible..." -ForegroundColor Cyan
$env:DATABASE_URL = "postgresql://aic_user:aic_password@localhost:5432/aic_db"
try {
    # Try to connect using psql if available
    $result = docker exec aic-postgres psql -U aic_user -d aic_db -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL is running and accessible!" -ForegroundColor Green
    } else {
        Write-Host "❌ Cannot connect to PostgreSQL" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "⚠️  Could not test connection. Make sure Docker PostgreSQL is running." -ForegroundColor Yellow
}

Write-Host "`nTo start PostgreSQL:" -ForegroundColor Cyan
Write-Host "docker-compose up -d postgres redis" -ForegroundColor White
