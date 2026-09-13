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
echo [OK] Python ist installiert: %PY_VER%
echo.

:: 2. Check for Git
git --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%g in ('git --version 2^>^&1') do set GIT_VER=%%g
    echo [OK] Git ist installiert: %GIT_VER%
    goto :SETUP_GIT_REPO
)

echo [!] Git wurde auf deinem Computer nicht gefunden.
echo Git wird benoetigt, um spaetere Updates mit einem Klick zu laden.
echo.
where winget >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Windows Package Manager (winget) ist verfuegbar!
    echo Moechtest du Git jetzt automatisch installieren?
    set /p INSTALL_GIT="Druecke Y fuer automatische Installation, oder N zum Ueberspringen (Y/N): "
    if /i "%INSTALL_GIT%"=="Y" (
        echo.
        echo Installiere Git via winget... Bitte bestaetige eventuelle Administrator-Meldungen.
        winget install -e --id Git.Git --scope currentuser
        echo.
        echo [INFO] Nach der Git-Installation starte bitte install.bat einmal neu.
        goto :END
    )
) else (
    echo Du kannst Git jederzeit kostenlos herunterladen:
    echo https://git-scm.com/download/win
)

:SETUP_GIT_REPO
echo.
set REMOTE_URL=https://github.com/MarkusSpanring/seating-planner.git
set BRANCH=master
git --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    if not exist ".git" (
        echo [INFO] ZIP-Installation erkannt. Verknuepfe mit GitHub-Updatekanal...
        git init -q
        git remote add origin %REMOTE_URL% >nul 2>&1
        git fetch origin %BRANCH% --depth=20 >nul 2>&1
        git reset --mixed origin/%BRANCH% -q >nul 2>&1
        git branch -M %BRANCH% >nul 2>&1
        git branch --set-upstream-to=origin/%BRANCH% %BRANCH% >nul 2>&1
        echo [OK] Automatische Updates sind jetzt aktiviert!
    )
)

echo.
echo Erstelle Datenverzeichnisse falls noetig...
if not exist "states" mkdir states
echo.
echo ===================================================
echo Einrichtung abgeschlossen! Alles ist startklar.
echo.
echo Anwendung starten:
echo    start.bat
echo.
echo Spaeter jederzeit auf die neueste Version aktualisieren:
echo    update.bat
echo ===================================================
echo.

:END
pause

