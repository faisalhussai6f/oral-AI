@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
echo [OralAI Backend Setup] > setup.log
echo Working dir: %CD% >> setup.log

:: ── Find Python ──────────────────────────────────────────────────────────────
set PYTHON=
for %%P in (
  "C:\Users\faisa\AppData\Local\Microsoft\WindowsApps\python3.13.exe"
  "C:\Users\faisa\AppData\Local\Microsoft\WindowsApps\python.exe"
  "C:\Python313\python.exe"
  "C:\Python312\python.exe"
  "C:\Python311\python.exe"
  "C:\Python310\python.exe"
) do (
  if exist %%P (
    set PYTHON=%%P
    goto :found_python
  )
)
echo ERROR: Python not found. Install from https://python.org >> setup.log
echo ERROR: Python not found.
pause
exit /b 1

:found_python
echo Python: !PYTHON! >> setup.log
echo [1/4] Python found: !PYTHON!

:: ── Create venv if needed ─────────────────────────────────────────────────────
if not exist "venv\Scripts\python.exe" (
  echo [2/4] Creating virtual environment...
  !PYTHON! -m venv venv >> setup.log 2>&1
  if !errorlevel! neq 0 (
    echo ERROR: venv creation failed - check setup.log
    pause & exit /b 1
  )
) else (
  echo [2/4] Virtual environment already exists.
)

:: ── Install / upgrade dependencies ───────────────────────────────────────────
echo [3/4] Installing dependencies...
"venv\Scripts\pip.exe" install --upgrade pip --quiet >> setup.log 2>&1
"venv\Scripts\pip.exe" install flask==3.0.3 flask-cors==4.0.1 Pillow==10.4.0 numpy==1.26.4 python-dotenv==1.0.1 >> setup.log 2>&1
if !errorlevel! neq 0 (
  echo WARNING: pip install may have had issues - check setup.log
)
echo Installed packages: >> setup.log
"venv\Scripts\pip.exe" list >> setup.log 2>&1

:: ── Start Flask ───────────────────────────────────────────────────────────────
echo [4/4] Starting OralAI Flask backend on http://localhost:5000
echo       (Keep this window open — close it to stop the backend)
echo.
echo       Frontend URL : http://localhost:8080
echo       Backend URL  : http://localhost:5000
echo       Health check : http://localhost:5000/health
echo.
"venv\Scripts\python.exe" app.py

pause
