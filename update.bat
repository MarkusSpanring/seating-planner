@echo off
chcp 65001 >nul
title Sitzplan - Update Manager

echo ===================================================
echo        Sitzplan - Wedding Seating Planner
echo                 Update Manager
echo ===================================================
echo.

set REMOTE_URL=https://github.com/MarkusSpanring/seating-planner.git
set BRANCH=master

:: 1. Verify Git installation
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Git wurde auf deinem Computer nicht gefunden.
    echo Git wird benoetigt, um Updates automatisch herunterzuladen.
    echo.
    where winget >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo Windows Package Manager (winget) ist verfuegbar!
        echo Moechtest du Git jetzt automatisch installieren?
        set /p INSTALL_GIT="Druecke Y fuer automatische Installation, oder N fuer Webseite (Y/N): "
        if /i "%INSTALL_GIT%"=="Y" (
            echo.
            echo Installiere Git via winget... Bitte bestaetige eventuelle Windows-Meldungen.
            winget install -e --id Git.Git --scope currentuser
            echo.
            echo [INFO] Bitte schliesse dieses Fenster und starte update.bat erneut.
            pause
            exit /b 0
        )
    )
    echo Oeffne die offizielle Git-Downloadseite im Browser...
    start https://git-scm.com/download/win
    echo Bitte installiere Git und fuehre update.bat danach erneut aus.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('git --version 2^>^&1') do set GIT_VER=%%v
echo [OK] Git gefunden: %GIT_VER%
echo.

:: 2. Check if this folder is already a Git repository (e.g. from ZIP download)
if not exist ".git" (
    echo [INFO] ZIP-Installation erkannt (noch kein Git-Verzeichnis vorhanden).
    echo Richte automatische Verbindung zum GitHub-Repository ein...
    git init -q
    git remote add origin %REMOTE_URL% >nul 2>&1
    echo Lade Versionsinformationen von GitHub...
    git fetch origin %BRANCH% --depth=20
    if %ERRORLEVEL% neq 0 (
        echo [FEHLER] Verbindung zu GitHub fehlgeschlagen. Bitte Internetverbindung pruefen.
        pause
        exit /b 1
    )
    git reset --mixed origin/%BRANCH% -q
    git branch -M %BRANCH% >nul 2>&1
    git branch --set-upstream-to=origin/%BRANCH% %BRANCH% >nul 2>&1
    echo [OK] Erfolgreich mit GitHub verknuepft!
    echo.
)

:: Ensure remote URL uses HTTPS
git remote set-url origin %REMOTE_URL% >nul 2>&1

:: 3. Create safety backup of user data (states/)
if exist "states" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set DT=%%I
    if not defined DT set DT=%date%_%time%
    set DT=%DT:~0,8%_%DT:~8,6%
    set BACKUP_NAME=states_backup_%DT%
    echo [INFO] Erstelle Sicherheitskopie deiner Sitzplaene: %BACKUP_NAME%
    xcopy /E /I /Q "states" "%BACKUP_NAME%" >nul 2>&1
)

:: 4. Fetch latest changes from remote
echo Suche nach neuen Updates auf GitHub...
git fetch origin %BRANCH% -q
if %ERRORLEVEL% neq 0 (
    echo [FEHLER] Verbindung zu GitHub fehlgeschlagen. Bitte Internetverbindung pruefen.
    pause
    exit /b 1
)

for /f %%c in ('git rev-list HEAD..origin/%BRANCH% --count 2^>nul') do set BEHIND=%%c
if not defined BEHIND set BEHIND=0

if "%BEHIND%"=="0" (
    echo.
    echo ===================================================
    echo [OK] Alles aktuell! Du hast bereits die neueste Version.
    for /f %%r in ('git rev-parse --short HEAD 2^>nul') do echo Aktueller Stand: %%r
    echo ===================================================
) else (
    echo.
    echo [INFO] Neues Update gefunden (%BEHIND% neue Aenderung(en)).
    echo Aktualisiere Sitzplan...
    git pull --ff-only origin %BRANCH% -q >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        git reset --hard origin/%BRANCH% -q
    )
    echo.
    echo ===================================================
    echo [OK] Update erfolgreich abgeschlossen!
    echo ===================================================
)

echo.
echo Alle deine Daten in 'states/' sind sicher aufbewahrt.
echo Du kannst Sitzplan jetzt starten per Doppelklick auf:
echo    start.bat
echo.
pause

