#!/usr/bin/env bash
set -euo pipefail

# Resolve this script's directory (works even if invoked from elsewhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure expected folders exist
mkdir -p "$SCRIPT_DIR/config" "$SCRIPT_DIR/data" "$SCRIPT_DIR/log"

# Optional: add some sensible defaults if config is missing/empty
CONF_FILE="$SCRIPT_DIR/config/mosquitto.conf"
if [[ ! -s "$CONF_FILE" ]]; then
  cat > "$CONF_FILE" <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
EOF
fi

# Clean up any old container
docker rm -f mosq >/dev/null 2>&1 || true

# Run Mosquitto with project-local volumes
docker run -d \
  --name mosq \
  -p 1883:1883 \
  -v "$SCRIPT_DIR/config:/mosquitto/config" \
  -v "$SCRIPT_DIR/data:/mosquitto/data" \
  -v "$SCRIPT_DIR/log:/mosquitto/log" \
  eclipse-mosquitto

echo "Mosquitto started. Logs:"
docker logs --tail 20 mosq