#!/usr/bin/env bash
# Run a command, keep its output, and on failure surface the API diff in the GitHub job summary
# plus an error annotation, so reviewers see the change without opening the raw log.
#   ci_api_report.sh "<title>" <command...>
set -uo pipefail
TITLE="$1"; shift
LOG="$(mktemp)"
"$@" 2>&1 | tee "$LOG"
RC=${PIPESTATUS[0]}
if [ "$RC" -ne 0 ]; then
  # keep unified-diff lines only (---/+++/@@/+/-/context), drop Gradle/Xcode noise
  DIFF="$(sed -n '/^[[:space:]]*---[[:space:]]/,/^$/p' "$LOG" | sed 's/^  //' | head -80)"
  if [ -n "$DIFF" ]; then
    REPORT="${API_REPORT_FILE:-/dev/null}"
    {
      echo "### ❌ $TITLE"
      echo "Public API differs from the committed baseline. Review it; if intended, update the dump (\`apiDump\` / \`tools/ios_api.sh dump\`) in this PR."
      echo '```diff'; echo "$DIFF"; echo '```'
    } | tee "$REPORT" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
    echo "::error title=$TITLE::Public API changed (see job summary for the diff)"
  fi
fi
exit "$RC"
