@echo off
chcp 65001 >nul
title Sitzplan - Installation & Setup

echo ===================================================
echo        Sitzplan - Wedding Seating Planner
echo              Installation & Setup
echo ===================================================
echo.

set PYTHON_CMD=

:: Check for python
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=python
    goto :FOUND_PYTHON
)

:: Check for py launcher
py --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=py
    goto :FOUND_PYTHON
)

:: Python not found
echo [!] Python 3 was not detected on your computer.
echo.
echo Sitzplan requires Python 3 to run locally.
echo (Python is free, safe, and lightweight standard software.)
echo.
echo Attempting to help you install Python...
echo.

where winget >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Windows Package Manager (winget) is available!
    echo Would you like to automatically install Python 3 now?
    set /p INSTALL_WINGET="Press Y to install Python automatically, or N to open website (Y/N): "
    if /i "%INSTALL_WINGET%"=="Y" (
        echo.
        echo Installing Python 3 via winget... Please accept any Windows administrator prompts.
        winget install -e --id Python.Python.3.12 --scope currentuser
        echo.
        echo [INFO] After installing, please close this window and run install.bat again.
        goto :END
    )
)

echo.
echo Opening the official Python download page in your browser...
start https://www.python.org/downloads/
echo.
echo ===================================================
echo IMPORTANT INSTALLATION STEP:
echo When the Python installer opens, make sure to check
echo the box at the bottom:
echo    "[X] Add python.exe to PATH"
echo Then click "Install Now".
echo ===================================================
echo.
echo After Python finishes installing, please re-run install.bat!
goto :END

:FOUND_PYTHON
for /f "tokens=*" %%v in ('%PYTHON_CMD% --version 2^>^&1') do set PY_VER=%%v
echo [OK] Python is installed: %PY_VER%
echo.
echo Creating data directories if needed...
if not exist "states" mkdir states
echo.
echo ===================================================
echo Setup is complete! Everything is ready.
echo You can now start the application by double-clicking:
echo    start.bat
echo ===================================================
echo.

:END
pause

