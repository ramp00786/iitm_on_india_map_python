@echo off
echo Setting up Python Shapefile Converter Development Environment
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
echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat

:: Upgrade pip
python -m pip install --upgrade pip

:: Install requirements
pip install -r requirements.txt

echo.
echo ======================================
echo Setup complete!
echo ======================================
echo.
echo To activate the virtual environment, run:
echo   venv\Scripts\activate.bat
echo.
echo To run the shapefile converter, run:
echo   python convert_shapefiles.py
echo.
echo To deactivate the virtual environment, run:
echo   deactivate
echo.
pause
