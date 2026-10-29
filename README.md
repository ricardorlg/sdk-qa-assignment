# Mobile SDK Quality Engineering

**Candidate assignment: Senior Mobile QA Engineer (Platform / SDK)**
Candidate: Ricardo Larrahondo

This repository is the base of my answer to the assignment. It holds the written strategy and also a small working example: a dummy authentication SDK for iOS (Swift) and Android (Kotlin), tested with shared contracts, with a CI pipeline and demo pull requests that show the strategy at work.

> **Time-boxed exercise.** The work was done within a limited time. Everything marked *Built* in the document ran locally and on GitHub Actions at least once, but I do not guarantee that it runs on every machine or on every future runner image. Things marked *Described* are strategy only and are not coded. See [Known limits](#known-limits).

## 1. Deliverables

| Deliverable | What it is | Link |
|---|---|---|
| **Main document** | Strategy, automation, CI/CD, investigation, priorities, future work, risks | [`docs/FINAL_DELIVERABLE.md`](docs/FINAL_DELIVERABLE.md) · [PDF](deliverables/FINAL_DELIVERABLE.pdf) |
| **Presentation** | 8 slides, one section per assignment point | [`deliverables/SDK_QA_Strategy.pptx`](deliverables/SDK_QA_Strategy.pptx) |
| **Risk analysis** | 15 risks (impact × probability), failure modes, coverage per risk | [`docs/risk-matrix.md`](docs/risk-matrix.md) |
| **Test architecture and CI/CD diagrams** | Layer chain (§1.1) and pipeline (§3.1) | [`docs/FINAL_DELIVERABLE.md`](docs/FINAL_DELIVERABLE.md) |
| **Code example** | Shared contract, two native runners, API checks, native UI tests | [§2 of the document](docs/FINAL_DELIVERABLE.md#2-automation-example) and this repo |
| **Demo pull requests** | Six PRs, each showing which layer catches a change | [Pull requests](../../pulls) (see [section 4](#4-demo-pull-requests)) |
| **AI usage** | Prompt library with how each output was validated | [`docs/PROMPT_LIBRARY.md`](docs/PROMPT_LIBRARY.md) |

Mapping to the five assignment points:

| Assignment point | Where |
|---|---|
| 1. Test strategy | Document §1, layers L0 to L7 |
| 2. Automation example | Document §2 and the code below |
| 3. CI/CD and release validation | Document §3 and `.github/workflows/` |
| 4. Investigation scenario | Document §4 |
| 5. Initial priorities | Document §5 |

## 2. What is in the repository

| Path | Purpose |
|---|---|
| `contracts/auth/scenarios.json` | Core behaviour contract: 9 scenarios shared by both platforms |
| `contracts/consumers/retail-app/` | Consumer-driven scenario owned by an app team (see `.github/CODEOWNERS`) |
| `fake-auth-server/server.js` | Dependency-free Node fake token endpoint, scripted per scenario |
| `ios/` | Swift package: reference `AuthClient` and a Swift Testing runner |
| `android/` | Kotlin/Gradle (JVM): reference `AuthClient`, JUnit 5 runner, `apiCheck` and the `.api` dump |
| `ios/api/` and `tools/ios_api.sh` | iOS public API baseline and `swift-api-digester` check |
| `android-instrumented/` | Android host app and Espresso tests (UI and lifecycle) |
| `ios-host/` | iOS host app (generated with `xcodegen`) and XCUITest (UI and lifecycle) |
| `compat.yaml`, `tools/gen_matrix.py` | Compatibility manifest and CI matrix generator |
| `tools/retry_flag_flaky.sh` | Retry once and report a pass-on-retry as FLAKY (nightly UI jobs only; L2b has no retries) |
| `tools/start_fake_server.sh` | Starts the fake server and waits until it is ready |
| `tools/ci_api_report.sh` | Posts API diffs to the job summary and the PR |
| `.github/workflows/` | `pr.yml`, `ui-native.yml`, `release.yml` |
| `tools/build_docs.py`, `tools/build_pptx.js` | Rebuild the PDF and the PPTX |

The `AuthClient` classes are minimal stand-ins for an SDK module. The point is the test structure, not the SDK.

## 3. Run locally

### Prerequisites

| Needed for | Tool |
|---|---|
| Everything | Node 20+ (tested with 24), `git` |
| iOS contracts | macOS, Swift 6 toolchain (Xcode 16 or newer) |
| Android contracts | JDK 21, Gradle 9 |
| iOS UI tests | Xcode with an iOS simulator, `xcodegen` (`brew install xcodegen`) |
| Android UI tests | Android SDK, a booted emulator (`adb devices` must list it) |
| API checks | Included in the Gradle and Swift toolchains |
| Rebuild documents | Python 3 with `markdown`, Chrome and `npx` for the PDF; Node with `pptxgenjs` for the PPTX |

### Fast layer (seconds): contracts on both platforms

```bash
./run_all.sh
```

It starts the fake server, runs the Swift runner (`swift test` in `ios/`) and the Kotlin runner (`gradle test` in `android/`), then stops the server. Run `swift test` alone only if the fake server is already running. Adding a scenario means editing `contracts/auth/scenarios.json` only; both platforms pick it up.

### API signature checks

```bash
cd android && gradle apiCheck                  # fails on an unreviewed public API change
cd android && gradle apiDump                   # accept an intended change
tools/ios_api.sh check                         # compare with the committed .swiftinterface (baseline is generated on CI's Xcode; a different local Xcode may show harmless @available/ordering diffs)
# 'breaking' needs a baseline build of the latest v* tag; it is run by CI (pr.yml), not locally
```

### Native UI and lifecycle tests (about 1 to 2 minutes, slower)

```bash
PLATFORM=android ./run_native.sh               # needs a booted emulator
PLATFORM=ios ./run_native.sh                   # needs Xcode and xcodegen
IOS_DEST="platform=iOS Simulator,name=iPhone 16,OS=18.5" PLATFORM=ios ./run_native.sh
```

The default simulator in `run_native.sh` may not exist on your machine; set `IOS_DEST` to one you have.

### Other tools

```bash
python3 tools/gen_matrix.py pr                 # CI matrix for pull requests, from compat.yaml
python3 tools/gen_matrix.py rc                 # CI matrix for release candidates
python3 tools/build_docs.py                    # rebuild deliverables/FINAL_DELIVERABLE.pdf
node tools/build_pptx.js                       # rebuild deliverables/SDK_QA_Strategy.pptx
```

## 4. Run in CI (GitHub Actions)

All workflows live in `.github/workflows/`. Each stage of the delivery cycle has its own file.

| Workflow | Triggers | What it runs |
|---|---|---|
| **PR Gate** (`pr.yml`) | Pull request, manual | Path-aware: Android job if `android/**` changed, iOS job if `ios/**` changed, both if `contracts/**`, `fake-auth-server/**` or `compat.yaml` changed. Runs the API check and the behaviour contracts, publishes a JUnit check, a job summary and a PR comment |
| **Native UI** (`ui-native.yml`) | Nightly, manual | Espresso and XCUITest on the OS matrix from `compat.yaml` |
| **Release Validation** (`release.yml`) | Tag `rc-*`, manual | PR gate and native UI matrix, then contract-vs-previous-release and consumer canary (stubs) |

To run it yourself:

1. Fork or clone the repository to your own GitHub account (Actions must be enabled).
2. **Pull request:** push a branch that changes a file under `android/` or `ios/`, open a PR to `main`, and watch the *PR Gate* checks.
3. **Manual run:** *Actions* tab, choose the workflow, *Run workflow*. Or `gh workflow run ui-native.yml`.
4. **Release candidate:** `git tag rc-1.0.1 && git push origin rc-1.0.1`.
5. The iOS API digester compares with the latest `v*` tag. Tag `v1.0.0` must exist in your copy (`git tag v1.0.0 <commit> && git push --tags`); without it the step warns and is skipped.

Pushes to `main` do not trigger workflows by design.

**Access.** The repository is public, so the code, the demo PRs and the Actions results can be viewed without permissions. To run the CI yourself, fork the repository and enable Actions on the fork.

### Demo pull requests

Each PR changes one thing, to show which layer catches it. The PR Gate answers in about 1.5 to 3 minutes.

| PR | Platform | Change | L2a signature | L2b behaviour |
|---|---|---|---|---|
| [#1](../../pull/1) | Android | public `login` renamed to `signIn` | fails | fails |
| [#2](../../pull/2) | iOS | single-flight refresh removed | passes | **fails** |
| [#3](../../pull/3) | iOS | new public property `hasSession` | **fails** | passes |
| [#4](../../pull/4) | Android | refresh lock removed | passes | **fails** |
| [#5](../../pull/5) | iOS | `init(service:)` renamed | **fails** (digester: breaking) | passes |
| [#6](../../pull/6) | Android | new test that fails the first time and passes the second | passes | **fails** (no retries in L2b: an intermittent test is a bug) |

The signature check and the behaviour contracts catch different problems, so both are needed.

## 5. Known limits

- **Not guaranteed to run everywhere.** Versions, simulator names and runner images change. The commands above worked on the author's machine (macOS, Swift 6.4, JDK 21, Gradle 9) and on GitHub-hosted `ubuntu-latest` and `macos-26`.
- **Not built:** module-pair integration, harness E2E on staging, consumer canary, real-device tier and previous-release jobs. They are described in the document and listed as future work. The canary and previous-release jobs in `release.yml` are stubs.
- **Open items:** UI tests in hosted CI are out of scope for this exercise (the nightly iOS 26.2 UI job failed once and was not diagnosed; in practice these run on a device farm or dedicated runners). Branch protection and required checks are not configured. `CODEOWNERS` uses placeholder team names. The Kotlin API validator is on 0.17.0 (0.18.x exists).
- **Dummy SDK.** The SDK code is a reference implementation for the exercise; it contains no confidential or proprietary code.
- **Reading order.** The deck is the main deliverable; `FINAL_DELIVERABLE` is the annex with the detail behind each slide.
- **Public repository.** The brief was paraphrased and the company name removed from the files, but earlier commits in the history still contain them; this was accepted knowingly.
- **AI-assisted.** Built with GitHub Copilot; one independent review was done with a second AI assistant. Prompts and how each output was validated are in [`docs/PROMPT_LIBRARY.md`](docs/PROMPT_LIBRARY.md).
