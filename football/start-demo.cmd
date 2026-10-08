@echo off
cd /d "%~dp0.."
if not exist node_modules\ws (
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
node football/server.mjs
