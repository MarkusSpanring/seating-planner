@echo off
chcp 65001 >nul
title Sitzplan - Server

cd /d "%~dp0"

echo ===================================================
echo        Sitzplan - Wedding Seating Planner
echo ===================================================
echo.

set PYTHON_CMD=

:: Check for python
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=python
    goto :RUN
)

:: Check for py launcher
py --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=py
    goto :RUN
)

echo [ERROR] Python 3 was not found on your system!
echo Please double-click "install.bat" first to install Python.
echo.
pause
exit /b 1

:RUN
if not exist "states" mkdir states

echo 🚀 Starting server at http://localhost:8000 ...
echo 🌐 Opening your web browser...
echo.
echo (Keep this window open while using the app. You can close it when you are done.)
echo.

:: Open browser in background after launching
start http://localhost:8000

:: Start the Python server
%PYTHON_CMD% server.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly (Code %ERRORLEVEL%).
    pause
)

