@echo off
echo =======================================================
echo    Iniciando AI Sentiment System
echo =======================================================
echo.

:: Liberar puertos si algo quedo abierto
echo Limpiando puertos...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo.
echo [1] Iniciando Backend de FastAPI (Puerto 8000)...
cd "%~dp0backend"
:: Intentamos activar entorno virtual si existe
if exist "venv\Scripts\activate.bat" call venv\Scripts\activate.bat
start "Backend API IA" cmd /k "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [2] Iniciando Frontend de Next.js (Puerto 3000)...
cd "%~dp0frontend"
start "Frontend NextJS" cmd /k "npm run dev"

echo.
echo =======================================================
echo   Aplicaciones en proceso de inicio...
echo   El Backend estara en  : http://localhost:8000
echo   El Frontend estara en : http://localhost:3000
echo.
echo   Por favor espera unos segundos.
echo =======================================================
pause
