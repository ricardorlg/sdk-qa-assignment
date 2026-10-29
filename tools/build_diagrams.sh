#!/usr/bin/env bash
# Renders docs/diagrams/*.mmd to PNG and SVG in deliverables/diagrams/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
CFG="$(mktemp)"
printf '{"executablePath": "%s", "args": ["--no-sandbox"]}' "$CHROME" > "$CFG"
mkdir -p "$ROOT/deliverables/diagrams"
for f in "$ROOT"/docs/diagrams/*.mmd; do
  n="$(basename "$f" .mmd)"
  for ext in png svg; do
    PUPPETEER_SKIP_DOWNLOAD=1 npx -y @mermaid-js/mermaid-cli -i "$f" -o "$ROOT/deliverables/diagrams/$n.$ext" -p "$CFG" -s 3 -b white
  done
done
rm -f "$CFG"
