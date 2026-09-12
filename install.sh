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
chmod +x "$CDIR/start.sh" "$CDIR/install.sh" "$CDIR/start.command" "$CDIR/install.command" 2>/dev/null

if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version 2>&1)
    echo "✅ Python 3 is already installed: $PY_VER"
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

mkdir -p "$CDIR/states"

echo ""
echo "==================================================="
echo "🎉 Setup complete! All scripts are executable."
echo "You can now start Sitzplan by running:"
echo "   ./start.sh"
echo "==================================================="

