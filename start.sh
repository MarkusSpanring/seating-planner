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

# 2. Check if state file exists, if not create empty default
if [ ! -f sitzplan_state.json ]; then
  echo "Creating default state file..."
  echo '{"guests": [], "dietOptions": [{"id": "none", "name": "None", "color": "#6b7280"}, {"id": "vegetarian", "name": "Vegetarian", "color": "#22c55e"}, {"id": "vegan", "name": "Vegan", "color": "#a855f7"}, {"id": "gluten-free", "name": "Gluten-free", "color": "#f97316"}], "tables": [], "nextTableNumber": 1}' > sitzplan_state.json
fi

# 3. Start the server
echo "🚀 Starting server at http://localhost:$PORT"
python3 server.py


