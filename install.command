#!/bin/bash
# install.command — macOS Setup & Permission Configurator for Sitzplan

CDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$CDIR"

echo "==================================================="
echo "       Sitzplan - Wedding Seating Planner"
echo "              macOS Installation"
echo "==================================================="
echo ""

# Make all launch scripts executable
chmod +x "$CDIR/install.command" "$CDIR/start.command" "$CDIR/update.command" "$CDIR/install.sh" "$CDIR/start.sh" "$CDIR/update.sh" 2>/dev/null

# 1. Check for python3
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version 2>&1)
    echo "✅ Python 3 is installed: $PY_VER"
else
    echo "⚠️ Python 3 was not found on your Mac."
    echo ""
    echo "macOS will now check if Apple Command Line Developer Tools can be installed,"
    echo "or you can download Python from python.org."
    echo ""
    read -p "Press [Enter] to open the official Python download page..."
    open "https://www.python.org/downloads/macos/"
    echo ""
    echo "After downloading and running the Python .pkg installer,"
    echo "double-click install.command once more to verify."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# 2. Check for Git (for 1-click updates)
if command -v git >/dev/null 2>&1; then
    GIT_VER=$(git --version)
    echo "✅ Git is installed: $GIT_VER"
else
    echo "ℹ️ Git was not found on your Mac."
    echo "Git is required to enable 1-click updates in the future."
    echo "macOS will now offer to install Apple Developer Tools (which includes Git)."
    echo ""
    read -p "Press [Enter] to install developer tools, or close this window to skip..."
    xcode-select --install 2>/dev/null || open "https://git-scm.com/download/mac"
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

# Ensure states directory exists
mkdir -p "$CDIR/states"

echo ""
echo "==================================================="
echo "🎉 Setup complete! All scripts are configured."
echo "You can now start Sitzplan anytime by double-clicking:"
echo "   start.command"
echo ""
echo "To update Sitzplan anytime in the future, double-click:"
echo "   update.command"
echo "==================================================="
echo ""
read -p "Press Enter to close this window..."

