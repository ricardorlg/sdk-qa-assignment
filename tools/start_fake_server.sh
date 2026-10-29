#!/usr/bin/env bash
# Starts the fake auth server in the background and waits until it answers.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8089}"
node "$ROOT/fake-auth-server/server.js" &
for _ in $(seq 1 50); do
  if curl -fs "http://127.0.0.1:$PORT/__requests" >/dev/null 2>&1; then exit 0; fi
  sleep 0.2
done
echo "::error title=Fake server::did not become ready on port $PORT" >&2
exit 1
