@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js 20+ and try again.
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    exit /b 1
  )
)

REM Kill any existing Node processes to prevent port conflicts
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
  set PID=%%a
  if !PID! neq 0 taskkill /PID !PID! /F >nul 2>nul
)

ping -n 2 127.0.0.1 >nul

echo [INFO] Starting Arkali LMS on http://localhost:3000
echo [INFO] Current directory: %CD%
call npm run dev

endlocal
