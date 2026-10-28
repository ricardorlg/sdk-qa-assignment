#!/usr/bin/env bash
# Runs a command; on failure retries once. A pass-on-retry is never silently green:
# it emits a CI warning and appends to flaky-report.txt so flake rate can be tracked.
set -uo pipefail
if "$@"; then exit 0; fi
echo "::warning::first attempt failed, retrying once: $*"
if "$@"; then
  echo "FLAKY: $*" >> "${FLAKY_REPORT:-flaky-report.txt}"
  echo "::warning::FLAKY (passed on retry): $*"
  exit 0
fi
exit 1
