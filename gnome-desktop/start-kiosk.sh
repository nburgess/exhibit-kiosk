#!/usr/bin/env bash
set -euo pipefail

LOG="$HOME/kiosk-start.log"
echo "=== starting kiosk at $(date) ===" >>"$LOG"

# small settle delay
sleep 3

# wait up to 60s for UI to become available
for i in $(seq 1 60); do
  if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "UI is up (attempt $i)" >>"$LOG"
    break
  fi
  echo "waiting for UI on localhost:5173 (attempt $i)" >>"$LOG"
  sleep 1
done

# disable screen blanking (X11)
/usr/bin/xset s off >>"$LOG" 2>&1 || true
/usr/bin/xset -dpms >>"$LOG" 2>&1 || true
/usr/bin/xset s noblank >>"$LOG" 2>&1 || true

unclutter --idle 0 &

# launch chromium (adjust path if you use google-chrome)
if [ -x /snap/bin/chromium ]; then
  /snap/bin/chromium --kiosk --start-fullscreen --force-device-scale-factor=1.5 --no-first-run --disable-infobars --incognito 'http://localhost:5173' >>"$LOG" 2>&1 &
else
  /usr/bin/chromium --kiosk --start-fullscreen --force-device-scale-factor=1.5 --no-first-run --disable-infobars --incognito 'http://localhost:5173' >>"$LOG" 2>&1 &
fi

echo "chromium launched with PID $! at $(date)" >>"$LOG"