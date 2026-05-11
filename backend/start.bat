@echo off
cd /d "%~dp0"
where python >nul 2>&1 || (echo Python not found && pause && exit /b 1)
pip show fastapi >nul 2>&1 || pip install -r requirements.txt
echo.
echo  ============================================
echo   Lab Server Monitor
echo   Open in browser: http://localhost:8000/
echo  ============================================
echo.
start "" "http://localhost:8000/Lab%%20Server%%20Monitor.html"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
