#!/bin/bash
# install.sh — Linux Setup & Permission Configurator for Sitzplan

CDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$CDIR"

echo "==================================================="
echo "       Sitzplan - Wedding Seating Planner"
echo "               Linux Installation"
echo "==================================================="
echo ""

# Make scripts executable
chmod +x "$CDIR/start.sh" "$CDIR/install.sh" "$CDIR/update.sh" "$CDIR/start.command" "$CDIR/install.command" "$CDIR/update.command" 2>/dev/null

# 1. Check Python 3
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version 2>&1)
    echo "✅ Python 3 is installed: $PY_VER"
else
    echo "⚠️ Python 3 is not installed."
    echo "Please install Python 3 using your package manager:"
    if command -v apt-get >/dev/null 2>&1; then
        echo "   sudo apt update && sudo apt install -y python3"
    elif command -v dnf >/dev/null 2>&1; then
        echo "   sudo dnf install -y python3"
    elif command -v pacman >/dev/null 2>&1; then
        echo "   sudo pacman -S python"
    else
        echo "   Please install python3 via your distribution's package manager."
    fi
    echo ""
    exit 1
fi

# 2. Check Git (required for 1-click updates)
if command -v git >/dev/null 2>&1; then
    GIT_VER=$(git --version)
    echo "✅ Git is installed: $GIT_VER"
else
    echo "⚠️ Git is not installed."
    echo "Git is required to receive 1-click updates in the future."
    echo "Please install git using your package manager:"
    if command -v apt-get >/dev/null 2>&1; then
        echo "   sudo apt install -y git"
    elif command -v dnf >/dev/null 2>&1; then
        echo "   sudo dnf install -y git"
    elif command -v pacman >/dev/null 2>&1; then
        echo "   sudo pacman -S git"
    fi
    echo ""
fi

# 3. Setup Git tracking if installed via ZIP download
REMOTE_URL="https://github.com/MarkusSpanring/seating-planner.git"
BRANCH="master"
if [ ! -d "$CDIR/.git" ] && command -v git >/dev/null 2>&1; then
    echo ""
    echo "📦 ZIP installation detected (no .git folder)."
    echo "Connecting to GitHub repository for 1-click updates..."
    git init -q
    git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
    if git fetch origin "$BRANCH" --depth=20 -q 2>/dev/null; then
        git reset --mixed "origin/$BRANCH" -q 2>/dev/null
        git branch -M "$BRANCH" 2>/dev/null
        git branch --set-upstream-to="origin/$BRANCH" "$BRANCH" 2>/dev/null
        echo "✅ Connected to update channel!"
    else
        echo "ℹ️ Note: Could not reach GitHub right now. Updates can be configured later."
    fi
fi

mkdir -p "$CDIR/states"

echo ""
echo "==================================================="
echo "🎉 Setup complete! All scripts are executable."
echo "You can now start Sitzplan by running:"
echo "   ./start.sh"
echo ""
echo "To update Sitzplan anytime in the future, run:"
echo "   ./update.sh"
echo "==================================================="

