@echo off
TITLE RF Optimizer - Server
SETLOCAL

:: 1. Navigate to the script directory
cd /d "%~dp0"

echo ==========================================
echo    RF OPTIMIZER - STARTING SYSTEM
echo ==========================================

:: 2. Check if venv exists
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment 'venv' not found!
    echo Please create it first using: python -m venv venv
    pause
    exit /b
)

:: 3. Bypass "Activation" and use the Venv Python directly
:: This is more reliable in Batch files than "calling" the activate script
set PYTHON_EXE=%~dp0venv\Scripts\python.exe

echo [1/2] Verifying dependencies...
:: We use the specific venv python to run pip
"%PYTHON_EXE%" -m pip install -r requirements.txt --quiet

echo [2/2] Starting Backend Server...
echo.
echo Application will be available at:
echo Local:   http://localhost:8000
echo Network: http://%COMPUTERNAME%:8000
echo.
echo ------------------------------------------

:: 4. Run the app using the absolute path to the venv python
"%PYTHON_EXE%" main.py

pause