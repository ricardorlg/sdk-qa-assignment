#!/usr/bin/env bash
# iOS public-API contract (counterpart of Android apiCheck/apiDump).
#   ios_api.sh check     fail if public API differs from ios/api/AuthSDK.swiftinterface
#   ios_api.sh dump      update the baseline (must be reviewed in the PR)
#   ios_api.sh breaking <baseline-derived-data-dir>
#                        swift-api-digester: classify breaking changes vs a previous build
# Uses xcodebuild + BUILD_LIBRARY_FOR_DISTRIBUTION because `swift package
# diagnose-api-breaking-changes` does not support iOS targets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASELINE="$ROOT/ios/api/AuthSDK.swiftinterface"
SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
OUT="${DERIVED:-$(mktemp -d)/dd}"

build() {
  (cd "$ROOT/ios" && xcodebuild build -scheme AuthSDK -derivedDataPath "$1" -sdk "$SDK" \
    -destination "generic/platform=iOS Simulator" BUILD_LIBRARY_FOR_DISTRIBUTION=YES -quiet >/dev/null)
}
iface() { # normalise: drop compiler headers and the Xcode-version-specific module separator (`Swift::X` vs `Swift.X`)
  grep -v '^// swift-\(compiler-version\|interface-format-version\|module-flags\)' \
    "$1/Build/Products/Debug-iphonesimulator/AuthSDK.swiftmodule/arm64-apple-ios-simulator.swiftinterface" | sed 's/::/./g'
}

case "${1:-check}" in
  dump)  build "$OUT"; mkdir -p "$(dirname "$BASELINE")"; iface "$OUT" > "$BASELINE"; echo "baseline updated: $BASELINE" ;;
  check) build "$OUT"
         [ -n "${EMIT:-}" ] && iface "$OUT" > "$EMIT"   # CI uploads this so the baseline can be regenerated with the pinned toolchain
         if diff -u "$BASELINE" <(iface "$OUT"); then echo "iOS API unchanged"
         else echo "iOS public API changed: review, then run tools/ios_api.sh dump" >&2; exit 1; fi ;;
  breaking)
         build "$OUT"
         xcrun swift-api-digester -diagnose-sdk -abi -module AuthSDK -use-interface-for-module AuthSDK \
           -BI "$2/Build/Products/Debug-iphonesimulator" -I "$OUT/Build/Products/Debug-iphonesimulator" \
           -bsdk "$SDK" -sdk "$SDK" -target arm64-apple-ios15.0-simulator -o "$OUT/api_diff.txt"
         cat "$OUT/api_diff.txt"
         # the digester always prints section headers; any other non-blank line is a finding,
         # except additive-API notices (a new symbol is not a breaking change)
         ! grep -v -e '^/\*' -e '^[[:space:]]*$' -e 'is a new API without' "$OUT/api_diff.txt" | grep -q . ;;
  *) echo "usage: $0 check|dump|breaking <dir>"; exit 2 ;;
esac
