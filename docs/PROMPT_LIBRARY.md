# Prompt Library

This file records how AI (GitHub Copilot CLI) was used to build this repository and [`FINAL_DELIVERABLE.md`](FINAL_DELIVERABLE.md). Each prompt below is a cleaned-up, self-contained version of what was asked, in the order it was asked, with what to expect, how the result was validated, and what went wrong the first time.

**Goal of the file:** if the repository were deleted and only this file survived, an engineer (or an AI agent) could rebuild the project by running the prompts in order. Prompts are written for an agent that has shell access and can edit files.

**Principle:** AI drafts and scaffolds; I decide scope, risk scores and priorities, and *validate by running things*. Every prompt therefore ends with a verification step, and several record a real defect that the validation found.

---

## 0. The assignment (context to paste first)

> I am preparing a candidate assignment for **Senior Mobile QA Engineer (Platform / SDK)**. Scenario: I am the QA of a team building an SDK made of several modules. Some modules are built by other teams. The SDK is used by existing apps and will be used by a new app. Known problems: (1) module updates can unintentionally affect other modules or apps; (2) behaviour is not always consistent between iOS and Android; (3) E2E tests are slow and occasionally unreliable; (4) compatibility between SDK, module and app versions is unclear; (5) integration issues are found late and the source of a failure is hard to identify.
>
> Required content: **1. Test strategy** (layers, ownership, regression in existing and new apps, device and OS coverage, manual and exploratory testing, versioning). **2. Automation example** (a small code or pseudocode example). **3. CI/CD and release validation** (PR gates, release gates, compatibility validation, handling slow or unstable tests, communicating failures). **4. Investigation scenario:** module A and B are upgraded from 3.4 to 3.5; Android is green; on iOS an intermittent failure appears only when both modules are used together; neither team can reproduce it alone. Explain how to isolate the failure, distinguish product, dependency, test and environment causes, collect diagnostics and prevent recurrence. **5. First three priorities** and what to postpone.
>
> Deliverables: a document or deck of about 5 to 7 pages, a simple diagram of the test architecture or CI/CD flow, a small code example, key assumptions, risks and trade-offs, optional repository link, and a brief statement of where AI was used and how the output was validated. No confidential or proprietary material. Treat it as timeboxed; incomplete work is acceptable if priorities and omissions are explained.

**Working rules to give the agent in the same message**
- Talk to me constantly; ask one decision at a time with options.
- All final outputs (documents, code comments, commit messages) are in English.
- Prefer small, surgical changes; run what you build; report what was *not* verified.

---

## 1. Toolchain and environment

Local machine used (versions matter for reproducing results):

| Tool | Version / note |
|---|---|
| macOS + Xcode | Swift 6.4; `xcodegen` to generate the iOS host project |
| JDK / Gradle | Java 21, Gradle 9.x (Kotlin 2.2.20, JUnit 5.11.3) |
| Node | for the fake server (no dependencies) and Marp / mermaid-cli through `npx` |
| Python | a Python with `PyYAML`, `markdown`, `pypdf` (used by `tools/gen_matrix.py` and `tools/build_docs.py`) |
| Chrome | headless, to render PDFs and Mermaid diagrams |
| `gh` | create the repo, read CI logs, manage PRs |

GitHub runners: `ubuntu-latest` for Android and JVM jobs, `macos-26` for iOS (the newest label; there is no `macos-27`).

---

## 2. Prompt sequence

### P1. Understand the brief and agree a plan
**Prompt**
> Read the assignment (section 0 above). Summarise it back to me in five bullets: what is asked, what is explicitly graded (technical reasoning, maintainability, pragmatic trade-offs), and what is optional. Then propose a working plan with phases and ask me which direction to take. Do not write code yet.

**Expect:** a short summary, a phased plan (strategy, example, CI, investigation, priorities, docs), and a question about scope.
**Validated by:** me checking the summary against the PDF, especially deliverables and the follow-up interview questions.

### P2. Design the test strategy for an SDK (not for an app)
**Prompt**
> Using the `risk-based-testing` and `test-strategy` approach, design a strategy for a multi-module native SDK consumed by several apps. Layers must include: static checks, module unit tests, **API signature contracts**, **behaviour contracts shared by iOS and Android**, **consumer-driven contracts** (each consuming app contributes scenarios that live in the SDK repo and run in SDK CI, with CODEOWNERS), module integration pairs, **native UI and device-lifecycle tests in a host app inside the SDK repo**, E2E on a test-harness app against staging, regression inside existing and new apps (`@sdk-smoke`, canary, upgrade-in-place test), real-device tiers by OEM, and manual, exploratory and bug-bash testing. Also cover versioning (SemVer, known-good umbrella set, support window, deprecation) and ownership and communication with other teams. For each layer say what question it answers, who owns it, when it runs, and whether I will build it or only describe it.

**Expect:** layers L0 to L7 with a status column (Built / Described).
**Validated by:** I challenged it with "what else would a senior QA on this team worry about?" and it added device tiers, upgrade/data-migration risk, regression in existing apps versus the new app, and communication with other teams.
**Lesson:** ask for *why each layer exists* and *what is postponed*, otherwise the output is a list of tools.

### P3. Risk register
**Prompt**
> Create `docs/risk-matrix.md`: a risk register scored Impact (1 to 5) × Probability (1 to 5), zones CRITICAL 15 to 25, HIGH 10 to 14, MEDIUM 5 to 9, LOW 1 to 4. Cover at least: API/behaviour breaks, iOS/Android drift, version incompatibility, concurrency at module boundaries, token lifecycle, flaky tests, OS upgrades, UI lifecycle, backend errors, insecure storage, upgrade and data migration, OEM device behaviour, performance, PII in logs, accessibility. For items scoring 10 or more add a failure-mode block (trigger, blast radius, detection, current mitigation, gap) and a table that maps zones to test density per layer. State clearly that the scores are expert judgement with no incident history, and when to re-score.

**Validated by:** every row has numbers, every item at 10 or above has the five fields, and the controls map to real layers in the strategy.

### P4. Fake auth server
**Prompt**
> Create `fake-auth-server/server.js`, a dependency-free Node HTTP server (port from `PORT`, default 8089) that acts as a token endpoint. The token endpoint is `POST /oauth/token` (form-encoded). Tests configure it with `POST /__scenario` (a script of responses: status, body, optional `delayMs`), and read back a request log (`GET /__requests`) so tests can assert how many token requests were made and with which grant type and refresh token. No sleeps in tests: expiry comes from `expires_in`, slowness from `delayMs`.

**Validated by:** `curl` against it before any client exists.

### P5. Shared behaviour contract and two native runners
**Prompt**
> Create `contracts/auth/scenarios.json` (version, scenarios). Each scenario has `id`, `description`, `tokenEndpointResponses`, optional `config` (such as `timeoutMs`), `steps` (actions `login`, `getAccessToken`, `logout`, `parallel` with nested calls, each with `expect`) and a `final` block (authenticated, `tokenRequests`, last grant type, last refresh token). Write ten scenarios: login, invalid credentials, transparent refresh, rejected refresh ends the session, 503 during refresh keeps the session, timeout keeps the session, malformed body maps to `serverError`, concurrent refresh is single-flight, logout, plus one consumer scenario. Then implement the same minimal `AuthClient` in Swift (`ios/`, SwiftPM, Swift Testing runner) and Kotlin (`android/`, JUnit 5 runner), and one runner per platform that loads the same JSON. Error names are part of the contract: `invalidCredentials`, `sessionExpired`, `serverError`, `networkError`, `notAuthenticated`. `run_all.sh` starts the server, runs both runners and stops the server.

**Important instruction:** write the *new* scenarios first and run them against the unfixed code. If they fail, that is a finding, not a mistake.
**What happened:** concurrent refresh failed on **both** platforms (duplicate token refreshes); the malformed-body scenario failed on **Android only** (`JSONException` escaped). Fixes: Swift shares one in-flight `Task` (actors are re-entrant at `await`, so an actor alone is not enough); Kotlin uses `synchronized(refreshLock)`; Android maps parse errors to `serverError`.
**Validated by:** `./run_all.sh` green on both; then injected an iOS-only bug (503 treated as session expiry) and confirmed `server_error_keeps_session` catches it.

### P6. Consumer-driven contract and CODEOWNERS
**Prompt**
> Add `contracts/consumers/retail-app/auth.json` with a scenario owned by a consuming app ("a valid token is reused without a server call") and make both runners load every file under `contracts/` (core and consumers). Add `.github/CODEOWNERS` so `@org/sdk-platform` owns `contracts/auth/` and `contracts/consumers/`, and `@org/retail-app-team` owns its own folder (last matching pattern wins). The team names are placeholders.

**Validated by:** both runners report 10 scenarios (9 core, 1 consumer).

### P7. API signature contract (L2a)
**Prompt**
> Android: add the `org.jetbrains.kotlinx.binary-compatibility-validator` Gradle plugin and commit `android/api/auth-sdk-android.api`; `apiCheck` must fail on an undeclared change. iOS: SwiftPM's breaking-change tool does not support iOS targets, so write `tools/ios_api.sh` with modes `check | dump | breaking`. `check` diffs the generated `.swiftinterface` against the committed baseline; `breaking` builds a baseline from the last `v*` git tag and runs `swift-api-digester -diagnose-sdk -abi`. Support `EMIT=<file>` to write the generated interface.

**Gotchas learned in CI**
- The `.swiftinterface` text differs by Xcode version (`Swift::X` vs `Swift.X`, attribute order). Normalise `::` to `.`, and **regenerate the committed baseline from the CI toolchain** (`macos-26`), not from the laptop.
- The digester prints `/* ... */` section headers; anything else is a finding, *except* "is a new API without '@available'", which is noise in `-abi` mode and is filtered (additive API is not breaking).
- With no `v*` tag the digester step used to skip with exit 0 (a **false green**). Create tag `v1.0.0`, and make the step emit a `::warning` when no tag exists. PR checkouts need `fetch-depth: 0`.

**Validated by:** adding a public symbol makes `apiCheck` fail with the exact diff; renaming a Swift parameter label makes the digester report a rename.

### P8. Native UI and lifecycle tests (L3b)
**Prompt**
> Add a minimal host app per platform inside the SDK repo. Android (`android-instrumented/`): an Activity that shows the SDK login screen, a `SharedPreferences` session store, and four Espresso tests (sign-in shows signed in; invalid credentials show an error and stay signed out; session survives activity recreation; session survives cold start). iOS (`ios-host/`, project generated by `xcodegen` from `project.yml`): SwiftUI host app with the SDK `LoginView`, a Keychain session store, and four XCUITest tests (sign-in; invalid credentials; session survives background and foreground; session survives terminate and relaunch). Use idling resources / `waitForExistence`, never sleeps. `run_native.sh` starts the fake server and runs them, with `PLATFORM=android|ios|both`.

**Validated by:** tests pass; then replaced the Keychain store with an in-memory store and confirmed the relaunch test fails (the test is sensitive).
**Gotchas:** Android system images on hosted runners need `target: google_apis`, `arch: x86_64` and a KVM-enable step. iOS simulator runtimes are limited to what the image has (18.5 and 26.2 were used); iOS 26.2 UI later failed once and was never diagnosed.

### P9. Compatibility manifest and matrix generator
**Prompt**
> Create `compat.yaml` (SDK version 3.5.0, previous releases, per-platform OS versions and minimum, modules with versions and `depends_on`, consumer apps with pins and `canary: true`) and `tools/gen_matrix.py <pr|rc>` that prints JSON matrices (`native_ui_android`, `native_ui_ios`, `contract_vs_release`, `canary`): `pr` uses only the minimum and maximum OS per platform; `rc` uses everything plus previous-release contract runs. It must fail if an app pins an unknown module.

**Validated by:** running it in both modes and with a deliberately bad pin.

### P10. Flaky-test handling
**Prompt**
> Write `tools/retry_flag_flaky.sh <command...>`: run the command; on failure retry once; a pass on retry exits 0 but emits a CI `::warning::` and appends to `flaky-report.txt` (never silently green); two failures exit 1.

### P11. First CI, then debug it from the logs
**Prompt**
> Create the GitHub repo (private) and a first CI. After it runs, fetch the failing job logs with `gh` (`gh api --allow-escape-sequences repos/<owner>/<repo>/actions/jobs/<id>/logs`, strip ANSI), diagnose each failure, fix it, push, and repeat until green. Report root cause, not symptoms.

**What the logs showed (typical for any repo like this):** simulator OS versions in the manifest that the runner does not have; the Android emulator image and KVM; the `.swiftinterface` baseline depending on the Xcode version.
**Tip:** when selecting a job by name, use a specific prefix, because a JUnit check can create a second check with a similar name.

### P12. Split CI by stage; path-aware; reports
**Prompt**
> UI tests are slow, so make CI three separate workflows, one per stage of the cycle, on the latest action versions and the newest macOS runner:
> - `pr.yml` **PR Gate**: a `changes` job using `dorny/paths-filter`; the Android job only if `android/**` changed, the iOS job only if `ios/**` changed, both if `contracts/**`, `fake-auth-server/**` or `compat.yaml` changed; everything on non-PR events. Each job runs L2a then L2b; L2b steps use `if: ${{ !cancelled() }}` so they run even if L2a fails. Publish JUnit reports with `mikepenz/action-junit-report` (`comment: true`, `updateComment: true`; Android reads `android/build/test-results/test/*.xml`, iOS uses `swift test --xunit-output` and the glob `ios-results*.xml`). Permissions: `contents: read`, `checks: write`, `pull-requests: write`. Make it `workflow_call`-able.
> - `ui-native.yml` **Native UI (nightly)**: Espresso and XCUITest over the matrix from `tools/gen_matrix.py`, flaky-report artifacts.
> - `release.yml` **Release Validation** on `rc-*` tags: calls the PR gate and native UI, plus stub jobs for contract-vs-previous-releases and consumer canary (same permissions as the called workflow).
> Use clear workflow and job names.

**Validated by:** a PR that touches only `android/**` shows the iOS job as skipped.
**Note:** actions used were checkout v7, setup-node v7, setup-java v6, upload-artifact v7, gradle/actions v6, paths-filter v4, junit-report v6, sticky-pull-request-comment v3; `reactivecircus/android-emulator-runner` stayed on v2. Re-check versions when rebuilding.

### P13. Make API-check failures visible in GitHub
**Prompt**
> The `apiCheck` failure is not visible in the job summary. Write `tools/ci_api_report.sh "<title>" <command...>` that tees the output and, on failure, extracts the unified diff, appends it to `$GITHUB_STEP_SUMMARY`, writes `$API_REPORT_FILE`, and emits `::error`. Add sticky PR comments (`marocchino/sticky-pull-request-comment`, headers `api-android` and `api-ios`) that post on failure and delete when the step passes, with `continue-on-error: true` because fork PRs have no write token.

**Validated by:** the demo PR shows the diff in a comment.

### P14. Demo pull requests that prove "quick feedback"
**Prompt**
> Create five branches and PRs, each changing exactly one thing, and write in each PR description what it breaks and which layer should catch it:
> 1. Android: rename public `login` to `signIn` → L2a fails, L2b fails (does not compile).
> 2. iOS: remove the single-flight refresh (internal change) → L2a passes, **L2b fails** (`concurrent_refresh_is_single_flight`, 4 token requests instead of 2).
> 3. iOS: add public `hasSession` → L2a fails (diff), digester passes, L2b passes.
> 4. Android: remove the `synchronized` refresh lock → L2a passes, **L2b fails**.
> 5. iOS: rename `KeychainSessionStore.init(service:)` to `init(keychainService:)` → L2a fails, **digester fails** ("has been removed"), L2b passes.
> Verify each result in the check runs and report any case where the actual result differs from the prediction.

**Lesson:** the first iOS demo did not fail L2a, which prompted the explanation that L2a catches signature changes only and L2b behaviour only. Demos 2 and 4 are invisible to L2a; demos 3 and 5 are invisible to L2b.
**Not yet done:** a flaky-test demo PR; verifying the JUnit `comment: true` PR comment.

### P15. Investigation scenario (assignment point 4)
**Prompt**
> Write the investigation section for module A and B moving from 3.4 to 3.5 with an iOS-only intermittent failure when used together. Do not start from a hypothesis; build a *strategy for finding the cause*: what the symptoms suggest and do not prove; step 0 contain and organise; step 1 collect diagnostics before changing anything (history, exact run inputs, xcresult and crash logs, structured traces, network log, sanitizers, resource state, dependency diff); step 2 reproduce on demand with a repeat-N harness and report failures/runs; step 3 change one variable at a time with a table of experiment, outcome and which cause it points to (product, dependency, test, environment) plus a bisect rule for non-deterministic failures (about 3/p clean runs for 95% confidence); step 4 turn the root cause into a deterministic test; step 5 prevent recurrence (pair suite, lockfile diff, release gate, documented threading guarantees, post-mortem). Keep the working bet (concurrency) explicitly separate from the plan.

**Validated by:** I asked it to check that every cause (product, dependency, test, environment) has an experiment that can confirm or rule it out.

### P16. First three priorities (assignment point 5)
**Prompt**
> Write the first 30 days and the first three priorities in a table: why, information needed, people, first useful outcome (about 2, 4 and 6 weeks), success measure, and what happens if it is not done. Explain the order, the quick wins, and what is intentionally postponed. Suggested priorities: (1) baseline and visibility of existing automation; (2) shared contract layer starting with auth; (3) compatibility manifest and PR/release gates.

### P17. Documents, deck and PDFs
**Prompt**
> Write `docs/FINAL_DELIVERABLE.md` with sections: Introduction (what was built, assumptions, time assumptions, link to the risk analysis), 1 Test strategy, 2 Automation example (each demo with links; not-coded items as future work), 3 CI/CD (pipeline diagram, the three workflows, gates, future work), 4 Investigation, 5 Initial priorities, 6 Future improvements (UI design patterns, Robolectric, ViewModel tests, iOS equivalents), 7 Risks, trade-offs and AI usage. Keep a status legend (Built / Described) and never claim something was run if it was not. Write `docs/slides.md` (Marp, about 7 to 8 slides) and `tools/build_docs.py`, which renders Mermaid blocks to PNG with mermaid-cli and builds the PDFs with headless Chrome.

**Validated by:** looking at the rendered diagrams and checking page and slide counts after every rebuild.
**Gotchas:** `PREVIEW=1` exports slide PNGs to inspect overflow; remove them afterwards. Mermaid `direction` inside subgraphs is ignored in some cases; a single left-to-right chain with short labels rendered best.

### P18. Review pass (use before submitting)
**Prompt**
> Act as the senior QA reviewer of this team. Read the document against the five challenges and the interview questions (why this architecture, iOS and Android support, compatibility, diagnosis and safe adoption of platform releases, what to do first and what to postpone). List what is missing, what is overclaimed, and any statement not backed by something that was run. Do not fix anything yet; rank findings by impact.

---

## 3. Rebuild order (if starting from nothing)

1. P1 to P3: plan, strategy, risk register (no code).
2. P4 to P6: fake server, shared scenarios, two runners, consumer contract. Run `./run_all.sh`.
3. P7 to P10: API contracts, native UI tests, manifest, flaky retry.
4. P11 to P13: CI, debug from logs, stage split, reports.
5. P14: demo PRs.
6. P15 to P18: investigation, priorities, documents, review.

## 4. How the output was validated (summary)

- Every scenario and test was **executed**, locally and on GitHub-hosted runners.
- Sensitivity was proven with **deliberate faults** (iOS-only 503 bug, public API change, Keychain replaced by memory, removed locks), each caught by the intended layer.
- New scenarios were written **before** the fixes; they failed and exposed two real defects.
- CI failures were diagnosed from **raw logs**, not guessed.
- The five demo PRs compare *predicted* and *actual* results.
- Gaps are labelled in the document: iOS 26.2 UI run, canary and previous-release jobs, real devices, JUnit PR comment, most time targets.

## 5. Prompt hygiene lessons

- Give the agent the *why* (risk, audience) and the *definition of done* (what must be run), not only the task.
- Ask for the predicted outcome first, then compare with the actual one.
- Tell the agent to write failing tests before fixing code, so a failure becomes a finding.
- Pin versions and runner labels, and re-check them; they change.
- Ask for what was **not** verified, every time.
- Skills used as checklists: `risk-based-testing`, `test-strategy` (and `ci-cd-integration`, `test-reliability`, `contract-testing` as review lenses).
