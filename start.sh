#!/bin/bash
# MooseAgenda startup — run this to start server + tunnel
cd "$(dirname "$0")"

# Kill any previous instances
pkill -f "node server.js" 2>/dev/null
pkill -f "cloudflared tunnel --url http://localhost:3747" 2>/dev/null
sleep 1

node server.js &
sleep 2
cloudflared tunnel --url http://localhost:3747 > /tmp/cf-moose.log 2>&1 &
sleep 6

URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cf-moose.log | tail -1)
echo "🦌 MooseAgenda is live!"
echo "   Local:  http://localhost:3747"
echo "   Public: $URL"
