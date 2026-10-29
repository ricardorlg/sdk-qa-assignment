#!/usr/bin/env bash
# Starts the fake auth server, runs the shared auth contract on iOS (Swift) and Android (Kotlin/JVM), then stops the server.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export CONTRACT_DIR="$ROOT/contracts"
export PORT="${PORT:-8089}"
export CONTRACT_SERVER_URL="http://127.0.0.1:$PORT"

node "$ROOT/fake-auth-server/server.js" & SERVER_PID=$!
trap 'kill $SERVER_PID' EXIT
until curl -fs "$CONTRACT_SERVER_URL/__requests" >/dev/null 2>&1; do sleep 0.2; done

echo "== iOS (Swift / Swift Testing) =="; (cd "$ROOT/ios" && swift test)
echo "== Android (Kotlin / JUnit5) =="; (cd "$ROOT/android" && gradle test --console=plain)
