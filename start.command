#!/bin/bash
# start.command — macOS 1-Click App Launcher

CDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$CDIR"

echo "==================================================="
echo "       Sitzplan - Wedding Seating Planner"
echo "==================================================="
echo ""

PORT=8000

# Check for python3
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Error: Python 3 is not installed."
    echo "Please double-click 'install.command' first to install Python."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Stop any running instances on port 8000
echo "Checking for previous running instances..."
pkill -9 -f server.py 2>/dev/null
PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
fi

mkdir -p "$CDIR/states"

echo "🚀 Starting server at http://localhost:$PORT"
echo "🌐 Opening your web browser..."
echo ""
echo "(Keep this Terminal window open while using the app. You can close it when finished.)"
echo ""

# Open browser after a brief delay so server has time to bind
(sleep 1 && open "http://localhost:$PORT") &

python3 server.py

