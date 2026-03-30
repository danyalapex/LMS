@echo off
cd /d "%~dp0"
echo Starting Arkali LMS (development)...
REM If you want production start, run: npm run build && npm run start
npm run dev
