#!/bin/bash
# start.sh — Forcefully restart the persistence server and serve the app

PORT=8000
CDIR="$(dirname "$0")"
cd "$CDIR"

echo "🔄 Restarting Sitzplan App..."

# 1. Kill any existing instances
echo "Stopping any running server instances..."
pkill -9 -f server.py 2>/dev/null
PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  kill -9 $PID 2>/dev/null
fi
# Use fuser as a final fallback if available
fuser -k $PORT/tcp 2>/dev/null

sleep 2 # Extra time for OS to release port

# 2. Ensure states directory exists
mkdir -p states

# 3. Open browser tab in background and start the server
echo "🚀 Starting server at http://localhost:$PORT"
echo "🌐 Opening your web browser..."
echo ""
echo "(Keep this terminal window open while using the app. Press Ctrl+C to stop.)"
echo ""

(sleep 1 && (xdg-open "http://localhost:$PORT" 2>/dev/null || open "http://localhost:$PORT" 2>/dev/null || sensible-browser "http://localhost:$PORT" 2>/dev/null)) &

python3 server.py
