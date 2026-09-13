#!/bin/bash
# update.sh — 1-Click Update Script for Sitzplan (Linux)

CDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$CDIR"

echo "==================================================="
echo "       Sitzplan - Wedding Seating Planner"
echo "                 Update Manager"
echo "==================================================="
echo ""

# 1. Verify Git installation
if ! command -v git >/dev/null 2>&1; then
    echo "⚠️ Git ist auf deinem Computer nicht installiert."
    echo "Git wird benötigt, um die neuesten Updates automatisch abzurufen."
    echo ""
    echo "Bitte installiere Git über deinen Paketmanager:"
    if command -v apt-get >/dev/null 2>&1; then
        echo "   sudo apt update && sudo apt install -y git"
    elif command -v dnf >/dev/null 2>&1; then
        echo "   sudo dnf install -y git"
    elif command -v pacman >/dev/null 2>&1; then
        echo "   sudo pacman -S git"
    else
        echo "   Installiere 'git' über die Paketverwaltung deiner Linux-Distribution."
    fi
    echo ""
    exit 1
fi

GIT_VER=$(git --version)
echo "✅ Git gefunden: $GIT_VER"
echo ""

REMOTE_URL="https://github.com/MarkusSpanring/seating-planner.git"
BRANCH="master"

# 2. Check if this folder is already a Git repository (e.g. if installed via ZIP)
if [ ! -d "$CDIR/.git" ]; then
    echo "📦 ZIP-Installation erkannt (noch kein Git-Verzeichnis vorhanden)."
    echo "Richte automatische Verbindung zum GitHub-Repository ein..."
    git init -q
    git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
    echo "Lade Versionsinformationen..."
    if ! git fetch origin "$BRANCH" --depth=20; then
        echo "❌ Fehler: Konnte keine Verbindung zu GitHub herstellen."
        echo "Bitte überprüfe deine Internetverbindung und versuche es erneut."
        exit 1
    fi
    git reset --mixed "origin/$BRANCH" -q
    git branch -M "$BRANCH" 2>/dev/null
    git branch --set-upstream-to="origin/$BRANCH" "$BRANCH" 2>/dev/null
    echo "✅ Erfolgreich mit GitHub verknüpft!"
    echo ""
fi

# Ensure remote URL uses HTTPS
git remote set-url origin "$REMOTE_URL" 2>/dev/null

# 3. Create safety backup of user data (states/)
if [ -d "$CDIR/states" ]; then
    BACKUP_DIR="$CDIR/states_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r "$CDIR/states" "$BACKUP_DIR"
    echo "🛡️  Sicherheitskopie deiner Sitzpläne erstellt: $(basename "$BACKUP_DIR")"
fi

# 4. Fetch latest changes from remote
echo "🔍 Suche nach neuen Updates auf GitHub..."
if ! git fetch origin "$BRANCH" -q; then
    echo "❌ Fehler: Verbindung zu GitHub fehlgeschlagen."
    echo "Bitte überprüfe deine Internetverbindung."
    exit 1
fi

BEHIND=$(git rev-list "HEAD..origin/$BRANCH" --count 2>/dev/null || echo "0")

if [ "$BEHIND" -eq 0 ]; then
    echo ""
    echo "🎉 Alles aktuell! Du hast bereits die neueste Version von Sitzplan."
    CURRENT_REV=$(git rev-parse --short HEAD 2>/dev/null || echo "")
    [ -n "$CURRENT_REV" ] && echo "Aktueller Stand: $CURRENT_REV"
else
    echo "📥 Neues Update gefunden ($BEHIND neue Änderung(en))."
    echo "Aktualisiere Sitzplan..."
    
    # Try clean fast-forward pull first, fallback to reset if local code files were modified
    if ! git pull --ff-only origin "$BRANCH" -q 2>/dev/null; then
        git reset --hard "origin/$BRANCH" -q
    fi
    
    echo "✅ Update erfolgreich abgeschlossen!"
fi

# 5. Restore script permissions
chmod +x "$CDIR/start.sh" "$CDIR/install.sh" "$CDIR/update.sh" "$CDIR/start.command" "$CDIR/install.command" "$CDIR/update.command" 2>/dev/null

echo ""
echo "==================================================="
echo "✨ Bereit! Alle deine Daten in 'states/' sind sicher."
echo "Du kannst Sitzplan jetzt starten mit:"
echo "   ./start.sh"
echo "==================================================="
echo ""

