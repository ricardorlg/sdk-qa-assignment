#!/usr/bin/env bash
# Runs a command; on failure retries once. A pass-on-retry is never silently green:
# it emits a CI warning, appends to the flaky report (tracked as a flake rate) and,
# on GitHub Actions, writes a job-summary entry.
set -uo pipefail
REPORT="${FLAKY_REPORT:-flaky-report.txt}"
if "$@"; then exit 0; fi
echo "::warning::first attempt failed, retrying once: $*"
if "$@"; then
  echo "- \`$*\` failed on the first attempt and passed on retry" >> "$REPORT"
  echo "::warning::FLAKY (passed on retry): $*"
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "### FLAKY: passed only on retry
\`$*\`" >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
exit 1
