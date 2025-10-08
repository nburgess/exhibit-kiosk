#!/usr/bin/env bash
# wrapper to run frontend dev server
cd /home/ubuntu/Projects/eye/exhibit-kiosk || exit 1

# one-time dependency check
[ -d node_modules ] || npm ci --only=production

# build the static site
npm run build

# serve built files (dist folder)
exec npx serve -s dist -l 5173
EOF