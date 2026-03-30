<#
  scripts/apply_migration.ps1

  Applies the Supabase migration file for billing fields and verifies columns.
  Usage (PowerShell):
    $env:DATABASE_URL = 'postgres://user:pass@host:5432/db'
    pwsh ./scripts/apply_migration.ps1

  Or pass the DB URL as a parameter:
    pwsh ./scripts/apply_migration.ps1 -DatabaseUrl 'postgres://...'
#>

param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL not set. Set environment variable or pass -DatabaseUrl"
  exit 1
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Error "psql not found in PATH. Install PostgreSQL client or use the Supabase CLI."
  exit 1
}

$repoRoot = Resolve-Path -Path (Join-Path $PSScriptRoot "..") | Select-Object -ExpandProperty Path
$migFile = Join-Path $repoRoot "supabase\migrations\202603290005_billing_fields.sql"

if (-not (Test-Path $migFile)) {
  Write-Error "Migration file not found: $migFile"
  exit 1
}

Write-Host "Applying migration: $migFile"
& psql $DatabaseUrl -f $migFile
if ($LASTEXITCODE -ne 0) {
  Write-Error "psql returned exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Verifying columns in organization_subscriptions..."
$verifySql = "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='organization_subscriptions' AND column_name IN ('stripe_customer_id','stripe_subscription_id','stripe_price_id','next_billing_date');"
& psql $DatabaseUrl -c $verifySql

Write-Host "Migration script finished."
