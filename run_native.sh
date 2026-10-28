#!/usr/bin/env bash
# SDK-native tests (UI + lifecycle). Slower than run_all.sh.
# PLATFORM=android|ios|both (default both). Android needs a booted emulator (adb devices); iOS needs Xcode + xcodegen.
# Override the simulator with IOS_DEST.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PLATFORM="${PLATFORM:-both}"
export PORT="${PORT:-8089}"
IOS_DEST="${IOS_DEST:-platform=iOS Simulator,name=iPhone 16,OS=18.0}"

node "$ROOT/fake-auth-server/server.js" & SERVER_PID=$!
trap 'kill $SERVER_PID' EXIT
sleep 1

if [[ "$PLATFORM" != "ios" ]]; then
  echo "== Android (Espresso, emulator) =="
  (cd "$ROOT/android-instrumented" && gradle :app:connectedDebugAndroidTest --console=plain)
fi

if [[ "$PLATFORM" != "android" ]]; then
  echo "== iOS (XCUITest, simulator) =="
  (cd "$ROOT/ios-host" && xcodegen generate -q && xcodebuild test -project AuthHost.xcodeproj -scheme AuthHost -destination "$IOS_DEST" -derivedDataPath build)
fi
