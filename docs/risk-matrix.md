# SDK Risk Register (risk-based testing)

Scoring: **Risk = Impact (1-5) × Probability (1-5)**. Zones: CRITICAL 15-25, HIGH 10-14, MEDIUM 5-9, LOW 1-4.

> **Calibration note:** there is no incident history for this hypothetical SDK. Scores are expert judgement derived from the assignment (shared modules, two native implementations, version drift, an unexplained iOS-only failure). They are meant to be **re-scored from real data** in Priority 1 (flake rate, escaped defects, code churn) and after every production incident (within 48 h), and at least quarterly.

## 1. Register

| ID | Risk (what can fail) | Impact | Prob. | Score | Zone | Primary controls (see strategy §3) |
|---|---|---|---|---|---|---|
| R1 | A change in public API or behaviour breaks consuming apps | 5 | 4 | **20** | CRITICAL | L2a signature contract, L2b consumer-driven contracts, SemVer gate |
| R2 | iOS and Android behave differently for the same capability | 4 | 4 | **16** | CRITICAL | One scenario file, two native runners, parity gate |
| R4 | Module/dependency version combinations are incompatible | 4 | 4 | **16** | CRITICAL | `compat.yaml` → generated matrix, contracts vs N-1/N-2, consumer canary |
| R5 | Concurrency / init-order defects at module boundaries (the 3.4→3.5 case) | 4 | 4 | **16** | CRITICAL | Parallel contract steps, TSan + repeat-N, pair integration tests |
| R3 | Token lifecycle defects: lost session, double refresh, wrong expiry | 5 | 3 | **15** | CRITICAL | L2b auth scenarios, L3b lifecycle tests |
| R8 | Slow or flaky tests erode trust and hide real failures | 3 | 5 | **15** | CRITICAL | Retry-once-and-flag, quarantine with owner and expiry, PR time budgets |
| R7 | New OS release breaks SDK behaviour | 4 | 3 | 12 | HIGH | OS matrix (min/max on PR, full on RC), beta-OS exploratory charter |
| R9 | Native UI / lifecycle regressions (rotation, background, relaunch) | 3 | 4 | 12 | HIGH | L3b Espresso / XCUITest in an SDK host app |
| R10 | Backend errors or changes: timeout, 5xx, malformed body | 4 | 3 | 12 | HIGH | Contract scenarios with scripted fake server |
| R14 | SDK upgrade breaks a stored session / data migration (logout storm, crash on launch) | 4 | 3 | 12 | HIGH | Previous-release persisted-state fixtures, upgrade-in-place test on RC (described, not built) |
| R15 | OEM / device-specific behaviour (battery limits, keystore quirks, low memory) | 3 | 4 | 12 | HIGH | T2 real-device tier on RC, OEM exploratory charters |
| R6 | Credentials/tokens stored insecurely | 5 | 2 | 10 | HIGH | Keychain/Keystore-backed store, L3b relaunch test, security review |
| R11 | Performance regression (startup, size) | 3 | 3 | 9 | MEDIUM | Size/startup budget on RC (not built in the example) |
| R12 | PII or secrets leaked in logs | 4 | 2 | 8 | MEDIUM | Log-redaction unit test, review |
| R13 | Accessibility / localisation of SDK UI | 2 | 3 | 6 | MEDIUM | Exploratory charter + one accessibility-label assertion |

## 2. Heatmap

| Impact \ Probability | Rare (1) | Unlikely (2) | Possible (3) | Likely (4) | Frequent (5) |
|---|---|---|---|---|---|
| **Catastrophic (5)** | | R6 | R3 | **R1** | |
| **Major (4)** | | R12 | R7, R10, R14 | **R2, R4, R5** | |
| **Moderate (3)** | | | R11 | R9, R15 | **R8** |
| **Minor (2)** | | | R13 | | |
| **Negligible (1)** | | | | | |

## 3. Coverage prescribed per zone

| Zone | Unit (L1) | Contract (L2) | Integration (L3/L3b) | Consumer canary / E2E (L5) | Exploratory (L6) | Monitoring |
|---|---|---|---|---|---|---|
| CRITICAL | Branch coverage, mutation score ratchet | Signature + behaviour, both platforms, blocking | All module pairs nightly, native UI on affected paths | Differential canary on every RC | Charter each release | Gate pass-rate, flake-rate dashboard |
| HIGH | Happy path + key errors | Behaviour scenarios | Affected pairs on PR | Smoke only | On change | Weekly review |
| MEDIUM | Happy path | Optional | None | None | On major change | None |

## 4. Failure-mode analysis (items scoring ≥ 15)

**R1 – Breaking change reaches consumers (20)**
- *Trigger:* removed/renamed public symbol, changed default, changed error mapping, SemVer misuse.
- *Blast radius:* every app that upgrades; builds fail or behaviour silently changes in production.
- *Detection:* before: `apiCheck` / consumer scenarios in SDK CI. Otherwise: consumer build failure or crash reports.
- *Current mitigation:* Android `apiCheck` and iOS `.swiftinterface` diff + `swift-api-digester` (both demonstrated), 2 consumer-driven scenario files with CODEOWNERS (retail-app).
- *Gap:* only one consumer app modelled; no automatic SemVer-vs-diff check.

**R2 / R5 – Platform divergence and concurrency (16)**
- *Trigger:* same logic implemented twice; concurrent callers; actor re-entrancy or missing locks; error-mapping differences.
- *Blast radius:* intermittent, platform-specific failures that neither team reproduces alone.
- *Detection:* shared scenarios, parallel steps, TSan, repeat-N loops.
- *Current mitigation:* **the example found real defects of exactly this class**: (a) concurrent callers triggered duplicate refreshes on both platforms (Swift actor re-entrancy, Kotlin without lock), (b) Kotlin leaked `JSONException` on a malformed body while Swift mapped it to `serverError`. Both are now fixed and locked by scenarios.
- *Gap:* only authentication is modelled; no TSan run wired in CI; no cross-module scenario yet.

**R3 – Token lifecycle (15)**
- *Trigger:* expiry boundary, refresh rejected vs transient failure, parallel callers, process death mid-refresh.
- *Blast radius:* users logged out unexpectedly or running with stale tokens; support load.
- *Detection:* contract scenarios, L3b relaunch tests, production auth-error rate.
- *Current mitigation:* 9 core scenarios (login, invalid creds, refresh, rejected refresh, 503, timeout, malformed body, concurrent refresh, logout) plus 4+4 native lifecycle tests.
- *Gap:* clock skew, refresh-token rotation reuse detection, Keystore encryption on Android, multi-process access.

**R4 – Version incompatibility (16)**
- *Trigger:* module A 3.5 with B 3.4, transitive dependency bump, minimum OS drift.
- *Blast radius:* build or runtime failure in specific app/SDK combinations, hard to attribute.
- *Detection:* generated compatibility matrix, contract suite against N-1/N-2, consumer canary.
- *Current mitigation:* `compat.yaml` + `tools/gen_matrix.py` (validated pr/rc output), workflow skeleton.
- *Gap:* `contract-vs-release` and `consumer-canary` jobs are documented placeholders; no real second consumer app.

**R8 – Flaky and slow tests (15)**
- *Trigger:* sleeps, shared state, real network/clock, oversized E2E suite.
- *Blast radius:* teams ignore red builds; real regressions merge.
- *Detection:* retry-once with explicit flag, flake-rate dashboard.
- *Current mitigation:* `tools/retry_flag_flaky.sh` (pass-on-retry is reported, never silently green), path-filtered emulator jobs, no sleeps in tests.
- *Gap:* quarantine automation, dashboard, and baseline data do not exist yet (Priority 1).

## 5. Reassessment

Re-score on: production incident (≤ 48 h), new module or dependency, OS major release, team change, and quarterly. Inputs: code churn per module (`git log --since="3 months ago" --name-only`), flake rate, escaped defects, near-misses. A critical bug caught only manually is a **near-miss** and raises the probability score of that area.
