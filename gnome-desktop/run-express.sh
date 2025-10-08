#!/usr/bin/env bash
# wrapper to start express SSE server with a simple restart loop
cd /home/ubuntu/Projects/eye/express-mqtt-server || exit 1

# ensure dependencies installed (idempotent)
[ -d node_modules ] || npm ci --only=production

# start the server
exec /usr/bin/node /home/ubuntu/Projects/eye/express-mqtt-server/sse-server.js
