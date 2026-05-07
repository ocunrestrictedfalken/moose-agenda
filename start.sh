#!/bin/bash
# MooseAgenda startup
DIR="$(cd "$(dirname "$0")" && pwd)"

pkill -f "node $DIR/server.js" 2>/dev/null
pkill -f "serveo.net" 2>/dev/null
sleep 1

node "$DIR/server.js" &
sleep 2

ssh -o StrictHostKeyChecking=no \
    -i "$DIR/.serveo_key" \
    -R 80:localhost:3747 serveo.net > /tmp/serveo-moose.log 2>&1 &
sleep 8

URL=$(grep -o 'https://[^ ]*serveousercontent\.com' /tmp/serveo-moose.log | head -1)

echo ""
echo "🦌 MooseAgenda is live!"
echo "   Local:  http://localhost:3747"
echo "   Public: $URL"
echo ""

# Write URL to file — the reminder cron will pick it up and notify you
if [ -n "$URL" ]; then
  echo "$URL" > /tmp/moose-new-url.txt
fi
