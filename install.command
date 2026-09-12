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
chmod +x "$CDIR/install.command" "$CDIR/start.command" "$CDIR/install.sh" "$CDIR/start.sh" 2>/dev/null

# Check for python3
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

# Ensure states directory exists
mkdir -p "$CDIR/states"

echo ""
echo "==================================================="
echo "🎉 Setup complete! All scripts are configured."
echo "You can now start Sitzplan anytime by double-clicking:"
echo "   start.command"
echo "==================================================="
echo ""
read -p "Press Enter to close this window..."

