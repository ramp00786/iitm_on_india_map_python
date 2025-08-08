@echo off
echo Setting up Python Flask Web Application for India Interactive Map
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Setting up virtual environment...

:: Create virtual environment
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

:: Activate virtual environment and install dependencies
echo.
echo Activating virtual environment and installing Flask dependencies...
call venv\Scripts\activate.bat

:: Upgrade pip
python -m pip install --upgrade pip

:: Install requirements
pip install -r requirements.txt

echo.
echo ======================================
echo Flask Web Application Setup Complete!
echo ======================================
echo.
echo To run the application:
echo   1. Activate virtual environment: venv\Scripts\activate.bat
echo   2. Run the server: python app.py
echo   3. Open browser to: http://localhost:5000
echo.
echo Make sure the GeoJSON files are available from the shapefile converter!
echo.
pause
