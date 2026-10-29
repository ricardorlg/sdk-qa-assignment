// Builds docs/dist/SDK_QA_Strategy.pptx from the content of docs/FINAL_DELIVERABLE.md
const pptxgen = require("pptxgenjs");
const path = require("path");

const C = { navy: "0B1F3A", teal: "13A89E", amber: "F2A541", red: "E5484D", light: "F4F7FA",
  ink: "1F2937", mute: "5B6675", white: "FFFFFF", blue: "2F6FDE", green: "2E9E5B", line: "D5DCE5" };
const HEAD = "Cambria", BODY = "Calibri";
const REPO = "https://github.com/ricardorlg/sdk-qa-assignment";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.title = "Mobile SDK Quality Engineering";

function base(title, kicker, n) {
  const s = pres.addSlide();
  s.background = { color: C.light };
  s.addText(kicker.toUpperCase(), { x: 0.5, y: 0.22, w: 7, h: 0.25, fontFace: BODY, fontSize: 10, bold: true, color: C.teal, charSpacing: 3, margin: 0 });
  s.addText(title, { x: 0.5, y: 0.45, w: 9, h: 0.55, fontFace: HEAD, fontSize: 26, bold: true, color: C.navy, margin: 0 });
  s.addText(String(n), { x: 9.2, y: 5.25, w: 0.4, h: 0.25, fontFace: BODY, fontSize: 9, color: C.mute, align: "right", margin: 0 });
  return s;
}
function card(s, x, y, w, h, fill = C.white) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: C.line, width: 0.75 } });
}
function bullets(items, size = 11, color = C.ink) {
  return items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, fontSize: size, color, paraSpaceAfter: 3 } }));
}

// 1 ── Title
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.OVAL, { x: 7.3, y: -1.2, w: 4.6, h: 4.6, fill: { color: C.teal, transparency: 80 }, line: { color: C.teal, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 8.2, y: 3.2, w: 3.2, h: 3.2, fill: { color: C.amber, transparency: 82 }, line: { color: C.amber, width: 0 } });
  s.addText("SENIOR MOBILE QA ENGINEER · PLATFORM / SDK", { x: 0.7, y: 1.1, w: 8, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: C.teal, charSpacing: 3, margin: 0 });
  s.addText("Quality engineering for a multi-module mobile SDK", { x: 0.7, y: 1.5, w: 7.6, h: 1.5, fontFace: HEAD, fontSize: 38, bold: true, color: C.white, margin: 0 });
  s.addText("Contracts first. Fast feedback on every pull request. Slow tests only where nothing cheaper can catch the risk.", { x: 0.7, y: 3.15, w: 7, h: 0.8, fontFace: BODY, fontSize: 16, color: "CADCFC", margin: 0 });
  s.addText([
    { text: "Ricardo Larrahondo", options: { bold: true, breakLine: true } },
    { text: "Working code, demo PRs and CI: " + REPO.replace("https://", ""), options: { hyperlink: { url: REPO }, color: C.teal } },
  ], { x: 0.7, y: 4.5, w: 8, h: 0.6, fontFace: BODY, fontSize: 12, color: C.white, margin: 0 });
  s.addNotes("Opening: the deck follows the five assignment points. Everything marked Built exists in the repository and ran in GitHub Actions.");
}

// 2 ── Introduction
{
  const s = base("A dummy auth SDK, so the strategy is demonstrated", "Introduction · assumptions · risk", 2);
  const stats = [["2", "native platforms\nSwift + Kotlin"], ["10", "shared scenarios\nper platform"], ["6", "demo pull requests\nwith known outcomes"], ["15", "risks scored\nimpact × probability"]];
  stats.forEach(([n, l], i) => {
    const x = 0.5 + i * 2.28;
    card(s, x, 1.15, 2.1, 1.2);
    s.addText(n, { x, y: 1.2, w: 2.1, h: 0.65, fontFace: HEAD, fontSize: 36, bold: true, color: C.teal, align: "center", margin: 0 });
    s.addText(l, { x, y: 1.85, w: 2.1, h: 0.45, fontFace: BODY, fontSize: 10.5, color: C.mute, align: "center", margin: 0 });
  });
  card(s, 0.5, 2.5, 4.4, 2.65);
  s.addText("Situation and approach", { x: 0.7, y: 2.58, w: 4, h: 0.3, fontFace: HEAD, fontSize: 14, bold: true, color: C.navy, margin: 0 });
  s.addText(bullets([
    "Five pains: cross-module breakage, iOS/Android drift, slow flaky E2E, unclear versions, late hard-to-attribute failures.",
    "Dummy SDK: login, refresh, logout, session restore, plus a scripted fake auth server and a host app per platform.",
    "Why auth: high risk, every module depends on it, and error semantics drift between platforms.",
    "Biggest risks are change risks, so effort goes to contracts and compatibility, not more UI tests.",
  ], 12), { x: 0.7, y: 2.92, w: 4.05, h: 2.15, fontFace: BODY, margin: 0, valign: "top" });

  card(s, 5.1, 2.5, 4.4, 2.65);
  s.addText("Key assumptions and time budgets", { x: 5.3, y: 2.58, w: 4, h: 0.3, fontFace: HEAD, fontSize: 14, bold: true, color: C.navy, margin: 0 });
  s.addText(bullets([
    "Versioned modules (SemVer), about 3 apps pinning exact versions, native code on each platform.",
    "Mostly UI/E2E automation today with no flake data; staging backend and device farm available.",
    "PR gate under 15 min (measured 1.5 to 3). Nightly UI under 60 min. RC validation under 2 h.",
    "Left out on purpose: broad E2E, device farm, canary, performance, Pact broker.",
  ], 12), { x: 5.3, y: 2.92, w: 4.05, h: 2.15, fontFace: BODY, margin: 0, valign: "top" });
  s.addNotes("Scores are expert judgement because there is no incident history. Priority 1 re-scores them from real data. Full register: docs/risk-matrix.md.");
}

// 3 ── Test strategy
{
  const s = base("Test strategy: each layer answers one question", "1 · Test strategy", 3);
  const L = [
    ["L0", "Static", 0, 0], ["L1", "Unit", 0, 0], ["L2a", "API\nsignature", 0, 1], ["L2b", "Behaviour\ncontracts", 0, 1], ["L3", "Module\npairs", 0, 0],
    ["L3b", "Native UI\n+ lifecycle", 1, 1], ["L4", "Harness\nE2E", 1, 0], ["L5", "Consuming\napps", 2, 0], ["L6", "Real\ndevices", 2, 0], ["L7", "Manual +\nexplor.", 2, 0],
  ];
  const stage = [C.blue, C.green, C.amber];
  const bw = 0.88, gap = 0.04;
  L.forEach(([c, n, st, built], i) => {
    const x = 0.5 + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.15, w: bw, h: 0.95, rectRadius: 0.06,
      fill: { color: built ? stage[st] : C.white }, line: { color: stage[st], width: 1.5 } });
    s.addText(c, { x, y: 1.19, w: bw, h: 0.3, fontFace: HEAD, fontSize: 14, bold: true, align: "center", color: built ? C.white : stage[st], margin: 0 });
    s.addText(n, { x, y: 1.5, w: bw, h: 0.55, fontFace: BODY, fontSize: 9.5, align: "center", valign: "top", color: built ? C.white : C.ink, margin: 0 });
  });
  const bands = [["Every pull request", C.blue, 0, 5], ["Nightly", C.green, 5, 2], ["Release candidate", C.amber, 7, 3]];
  bands.forEach(([t, col, a, k]) => {
    const x = 0.5 + a * (bw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.17, w: k * (bw + gap) - gap, h: 0.04, fill: { color: col }, line: { color: col, width: 0 } });
    s.addText(t, { x, y: 2.22, w: k * (bw + gap) - gap, h: 0.22, fontFace: BODY, fontSize: 9.5, bold: true, color: col, align: "center", margin: 0 });
  });
  s.addText([{ text: "■ ", options: { color: C.teal } }, { text: "filled = Built and ran in CI    " }, { text: "□ ", options: { color: C.mute } }, { text: "outlined = described, future work" }],
    { x: 0.5, y: 5.25, w: 6, h: 0.22, fontFace: BODY, fontSize: 9, color: C.mute, margin: 0 });

  const cols = [
    ["Fast base: contracts", ["L2a: Android apiCheck, iOS swiftinterface + swift-api-digester.", "L2b: one JSON of scenarios run by a Swift and a Kotlin runner. Apps add their own via CODEOWNERS.", "Native tools only; no Appium below L5."]],
    ["Device and life cycle", ["L3b: UI tests on the harness app + fake server: rotation, background, kill and relaunch, session restore.", "L4: same harness app, real staging backend.", "L5: canary and upgrade tests in real apps, smoke by Appium."]],
    ["Humans and versions", ["L6: OEM, low memory, battery on a device farm.", "L7: charters on new capability and each RC.", "compat.yaml expands into PR and RC matrices; contracts run vs N-1 and N-2."]],
  ];
  cols.forEach(([h, items], i) => {
    const x = 0.5 + i * 3.08;
    card(s, x, 2.6, 2.95, 2.55);
    s.addText(h, { x: x + 0.15, y: 2.68, w: 2.7, h: 0.3, fontFace: HEAD, fontSize: 13, bold: true, color: C.navy, margin: 0 });
    s.addText(bullets(items, 11.5), { x: x + 0.15, y: 3.02, w: 2.65, h: 2.05, fontFace: BODY, margin: 0, valign: "top" });
  });
  s.addNotes("Balance of fast feedback and E2E confidence: L0-L3 on every PR are seconds to minutes; L3b nightly; L5-L7 only on release candidates, where they cover risks nothing below can.");
}

// 4 ── Automation demos
{
  const s = base("Automation example: one contract, two native runners", "2 · Automation example", 4);
  const rows = [
    ["D1", "Shared behaviour contracts", "10 scenarios per platform from one JSON, run against a scripted fake server. Includes single-flight concurrent refresh."],
    ["D2", "Consumer-driven contract", "Scenario owned by retail-app (token reuse). CODEOWNERS routes review to the app team."],
    ["D3", "API signature contract", "apiCheck dump (Android) and swiftinterface + digester vs v1.0.0 (iOS). Diff posted to summary and PR."],
    ["D4", "Native UI and lifecycle", "4 Espresso + 4 XCUITest tests: sign-in, error, background, kill and relaunch."],
    ["D5", "Compatibility manifest", "compat.yaml and gen_matrix.py produce the PR and RC matrices."],
    ["D6", "Flaky handling", "Retry once; a pass on retry is reported FLAKY, never silently green."],
  ];
  rows.forEach(([id, t, d], i) => {
    const y = 1.12 + i * 0.6;
    card(s, 0.5, y, 5.6, 0.54);
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.09, w: 0.36, h: 0.36, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    s.addText(id, { x: 0.6, y: y + 0.09, w: 0.36, h: 0.36, fontFace: BODY, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText([{ text: t + "  ", options: { bold: true, color: C.navy } }, { text: d, options: { color: C.mute } }],
      { x: 1.05, y: y + 0.02, w: 4.95, h: 0.5, fontFace: BODY, fontSize: 10.5, valign: "middle", margin: 0 });
  });
  card(s, 6.3, 1.12, 3.2, 3.54, C.navy);
  s.addText("What running it found", { x: 6.5, y: 1.2, w: 2.9, h: 0.3, fontFace: HEAD, fontSize: 14, bold: true, color: C.white, margin: 0 });
  s.addText(bullets([
    "Concurrent refresh failed on both platforms (duplicate refreshes). Fixed with an in-flight task and a lock.",
    "Malformed body leaked a JSONException on Android only. Mapped to serverError.",
    "Injected iOS-only bug (503 as session expiry) caught by a scenario.",
    "Swapping Keychain for memory made the relaunch test fail, so it is sensitive.",
  ], 11.5, "E6EDF7"), { x: 6.5, y: 1.55, w: 2.85, h: 3.0, fontFace: BODY, margin: 0, valign: "top" });
  s.addText("Not coded, described as future work: module pairs, harness E2E on staging, consumer canary, real devices.", { x: 0.5, y: 4.78, w: 9, h: 0.4, fontFace: BODY, fontSize: 10, italic: true, color: C.mute, margin: 0 });
  s.addNotes("Show scenarios.json, the two runners side by side, and the fake server. Each result was found by writing the scenario first and watching it fail. Key point: scenarios are data, not code, so neither platform owns the contract. That forces iOS/Android parity, lets app teams add expectations without Swift or Kotlin, and runs in milliseconds. Core scenarios are written by SDK QA; app teams own their folder; AI can draft, a human reviews the expected values.");
}

// 5 ── Demo PRs
{
  const s = base("Six demo PRs: which layer catches what", "2 · Quick feedback in practice", 5);
  const hdr = (t, o = {}) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 10, align: o.align || "left", valign: "middle" } });
  const res = (ok) => ({ text: ok ? "passes" : "fails", options: { bold: true, color: ok ? C.green : C.red, align: "center", fontSize: 10, valign: "middle" } });
  const t = (x, o = {}) => ({ text: x, options: { fontSize: 9.5, color: C.ink, valign: "middle", ...o } });
  const rows = [
    [hdr("PR"), hdr("Platform"), hdr("Change"), hdr("L2a", { align: "center" }), hdr("L2b", { align: "center" }), hdr("Lesson")],
    [t("#1", { bold: true }), t("Android"), t("public login renamed to signIn"), res(0), res(0), t("Breaking API change")],
    [t("#2", { bold: true }), t("iOS"), t("single-flight refresh removed"), res(1), res(0), t("Signature intact; only behaviour tests see it. Android green, so iOS-only")],
    [t("#3", { bold: true }), t("iOS"), t("new public hasSession"), res(0), res(1), t("Additive: review, not breaking")],
    [t("#4", { bold: true }), t("Android"), t("refresh lock removed"), res(1), res(0), t("Same bug class as #2")],
    [t("#5", { bold: true }), t("iOS"), t("init(service:) renamed"), res(0), res(1), t("swift-api-digester vs v1.0.0: breaking")],
    [t("#6", { bold: true }), t("Android"), t("test fails once, passes on retry"), res(1), res(1), t("Green but flagged FLAKY: summary + PR comment")],
  ];
  s.addTable(rows, { x: 0.5, y: 1.12, w: 9, colW: [0.5, 0.9, 2.3, 0.8, 0.8, 3.7], rowH: [0.32, 0.42, 0.46, 0.42, 0.42, 0.42, 0.42], border: { type: "solid", pt: 0.5, color: C.line }, fill: { color: C.white }, fontFace: BODY });
  card(s, 0.5, 4.2, 4.4, 1.0);
  s.addText([{ text: "L2a and L2b are complementary. ", options: { bold: true, color: C.navy } }, { text: "#2 and #4 are invisible to the signature check; #3 and #5 are invisible to behaviour tests.", options: { color: C.mute } }],
    { x: 0.65, y: 4.22, w: 4.1, h: 0.96, fontFace: BODY, fontSize: 11, valign: "middle", margin: 0 });
  card(s, 5.1, 4.2, 4.4, 1.0);
  s.addText([{ text: "Feedback in 1.5 to 3 minutes. ", options: { bold: true, color: C.navy } }, { text: "Path-aware: only the platform that changed runs. Results appear as a JUnit check, a job summary and a sticky PR comment.", options: { color: C.mute } }],
    { x: 5.25, y: 4.22, w: 4.1, h: 0.96, fontFace: BODY, fontSize: 11, valign: "middle", margin: 0 });
  s.addNotes("Open PR #2 live: signature check green, behaviour check red on iOS only. Then PR #5 for the digester message, and PR #6 for the flaky flag.");
}

// 6 ── CI/CD pipeline
{
  const s = base("CI/CD: fast gates first, breadth later", "3 · CI/CD and release validation", 6);
  function box(x, y, w, h, title, sub, fill, txt = C.white, dashed = false) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.07, fill: { color: fill }, line: { color: dashed ? C.mute : fill, width: 1.25, dashType: dashed ? "dash" : "solid" } });
    s.addText([{ text: title, options: { bold: true, fontSize: 10.5, breakLine: !!sub } }, ...(sub ? [{ text: sub, options: { fontSize: 8.5 } }] : [])],
      { x, y, w, h, fontFace: BODY, color: txt, align: "center", valign: "middle", margin: 3 });
  }
  const arrow = (x1, y1, x2, y2, head = true) => s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: { color: C.mute, width: 1.25, ...(head ? { endArrowType: "triangle" } : {}) } });
  // lane labels
  [["PULL REQUEST", C.blue, 1.1], ["NIGHTLY", C.green, 2.7], ["RELEASE CANDIDATE", C.amber, 3.7]].forEach(([t, c, y]) =>
    s.addText(t, { x: 0.5, y, w: 2.5, h: 0.2, fontFace: BODY, fontSize: 8.5, bold: true, color: c, charSpacing: 2, margin: 0 }));
  // PR lane
  box(0.5, 1.35, 1.2, 0.75, "Developer", "run_all.sh locally", C.navy);
  box(2.0, 1.35, 1.3, 0.75, "Pull request", "detect changed paths", C.blue);
  box(3.65, 1.12, 1.9, 0.5, "Android: apiCheck + L2b", "", C.blue);
  box(3.65, 1.72, 1.9, 0.5, "iOS: digester + L2b", "", C.blue);
  box(5.9, 1.35, 1.7, 0.75, "Reports", "JUnit check, API diff comment", C.blue);
  box(7.9, 1.35, 1.6, 0.75, "Merge to main", "owner-routed failures", C.navy);
  arrow(1.7, 1.72, 2.0, 1.72); arrow(3.3, 1.55, 3.65, 1.37); arrow(3.3, 1.9, 3.65, 1.97); arrow(5.55, 1.37, 5.9, 1.65); arrow(5.55, 1.97, 5.9, 1.8); arrow(7.6, 1.72, 7.9, 1.72);
  // nightly lane
  box(3.65, 2.9, 3.0, 0.65, "Native UI: Espresso + XCUITest", "OS matrix from compat.yaml, flaky report", C.green);
  arrow(8.7, 2.1, 8.7, 2.45, false); arrow(8.7, 2.45, 5.15, 2.45, false); arrow(5.15, 2.45, 5.15, 2.9);
  s.addText("Nightly cron", { x: 6.6, y: 2.5, w: 1.5, h: 0.22, fontFace: BODY, fontSize: 8.5, color: C.mute, margin: 0 });
  // RC lane
  box(0.5, 3.95, 1.3, 0.7, "Tag rc-*", "", C.amber, C.navy);
  box(2.1, 3.95, 1.8, 0.7, "PR gate + native UI", "matrix from compat.yaml", C.amber, C.navy);
  box(4.2, 3.95, 1.9, 0.7, "Contracts vs N-1/N-2", "consumer canary (stubs)", C.white, C.mute, true);
  box(6.4, 3.95, 1.3, 0.7, "Release gates", "", C.navy);
  box(8.0, 3.95, 1.5, 0.7, "Publish + changelog", "", C.teal);
  arrow(1.8, 4.3, 2.1, 4.3); arrow(3.9, 4.3, 4.2, 4.3); arrow(6.1, 4.3, 6.4, 4.3); arrow(7.7, 4.3, 8.0, 4.3);
  s.addText("Built and ran on GitHub: three workflow files (pr.yml, ui-native.yml, release.yml). Dashed = stub. UI tests are not a PR gate: 6 to 16 min per job.", { x: 0.5, y: 4.78, w: 8.6, h: 0.3, fontFace: BODY, fontSize: 9.5, italic: true, color: C.mute, margin: 0 });
  s.addText("Future: Slack alerts, device farm, flake dashboard, required checks.", { x: 0.5, y: 5.05, w: 8.6, h: 0.25, fontFace: BODY, fontSize: 9.5, italic: true, color: C.mute, margin: 0 });
  s.addNotes("macos-26 is the newest hosted label; macOS minutes are costly, which is another reason for path filtering. Actions are on latest majors. iOS 26.2 UI job failed once and was not diagnosed.");
}

// 7 ── Investigation
{
  const s = base("Investigation: change one variable at a time", "4 · Investigation scenario", 7);
  s.addText("Modules A and B work alone but fail intermittently together after 3.4 to 3.5, on iOS only.", { x: 0.5, y: 1.0, w: 9, h: 0.3, fontFace: BODY, fontSize: 12, italic: true, color: C.mute, margin: 0 });
  const steps = [
    ["0", "Contain", "Freeze the release, one owner, one channel, record the facts."],
    ["1", "Collect", "Logs, versions, resolved dependency graph, OS, runner, seeds, before any change."],
    ["2", "Reproduce", "Loop the failure; shrink to a minimal A+B case; record the failure rate."],
    ["3", "Isolate", "Vary one input at a time: version, order, OS, runner, thread timing."],
    ["4", "Fix", "Fix, then prove the failure rate dropped to zero over many runs."],
    ["5", "Prevent", "Contract scenario, matrix entry, alert, post-mortem."],
  ];
  steps.forEach(([n, t, d], i) => {
    const x = 0.5 + i * 1.52;
    card(s, x, 1.45, 1.4, 1.65);
    s.addShape(pres.shapes.OVAL, { x: x + 0.1, y: 1.55, w: 0.34, h: 0.34, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    s.addText(n, { x: x + 0.1, y: 1.55, w: 0.34, h: 0.34, fontFace: HEAD, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: x + 0.5, y: 1.55, w: 0.85, h: 0.34, fontFace: HEAD, fontSize: 12, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addText(d, { x: x + 0.1, y: 1.95, w: 1.22, h: 1.1, fontFace: BODY, fontSize: 9.5, color: C.mute, valign: "top", margin: 0 });
  });
  const cats = [
    ["Product", "Fails without a platform or toolchain change; bisect 3.4 vs 3.5; stress A+B with thread sanitizer.", C.red],
    ["Dependency", "Compare resolved transitive versions between a failing and a passing build.", C.amber],
    ["Test", "Random order and repeated runs; check shared state, clocks and fixtures.", C.blue],
    ["Environment", "Same commit on another runner, Xcode and simulator; check load and resources.", C.green],
  ];
  cats.forEach(([t, d, col], i) => {
    const x = 0.5 + i * 2.28;
    card(s, x, 3.3, 2.1, 1.35);
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 3.4, w: 0.12, h: 0.12, fill: { color: col }, line: { color: col, width: 0 } });
    s.addText(t, { x: x + 0.32, y: 3.36, w: 1.7, h: 0.22, fontFace: HEAD, fontSize: 12, bold: true, color: C.navy, margin: 0 });
    s.addText(d, { x: x + 0.12, y: 3.65, w: 1.88, h: 0.95, fontFace: BODY, fontSize: 9.5, color: C.mute, valign: "top", margin: 0 });
  });
  s.addText("Working bet: concurrency or init order. The plan does not depend on it: each cause is confirmed or ruled out with data.", { x: 0.5, y: 4.8, w: 9, h: 0.4, fontFace: BODY, fontSize: 11, bold: true, color: C.navy, margin: 0 });
  s.addNotes("Symptoms: Android green points at iOS code or toolchain; A+B only points at an interaction; intermittent points at non-determinism, but a flaky runner looks the same.");
}

// 8 ── Priorities
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addText("5 · INITIAL PRIORITIES · TRADE-OFFS · AI USAGE", { x: 0.5, y: 0.22, w: 8, h: 0.25, fontFace: BODY, fontSize: 10, bold: true, color: C.teal, charSpacing: 3, margin: 0 });
  s.addText("First three priorities, after 30 days of listening", { x: 0.5, y: 0.45, w: 9, h: 0.55, fontFace: HEAD, fontSize: 26, bold: true, color: C.white, margin: 0 });
  s.addText("8", { x: 9.2, y: 5.25, w: 0.4, h: 0.25, fontFace: BODY, fontSize: 9, color: "9FB0C8", align: "right", margin: 0 });
  const P = [
    ["1", "Baseline and visibility", "Inventory, flake rate, duration, owners. Re-scores the risks.", "Week 2: dashboard and top 10 flaky tests"],
    ["2", "Shared contract layer", "Auth scenarios on both platforms in PR CI.", "Week 4: parity gaps triaged"],
    ["3", "Compatibility manifest and gates", "compat.yaml, generated RC matrix, one canary.", "Week 6: first blocking gate"],
  ];
  P.forEach(([n, t, d, o], i) => {
    const x = 0.5 + i * 3.08;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.2, w: 2.95, h: 1.9, rectRadius: 0.08, fill: { color: "13315A" }, line: { color: "24497A", width: 0.75 } });
    s.addText(n, { x: x + 0.15, y: 1.28, w: 0.5, h: 0.55, fontFace: HEAD, fontSize: 30, bold: true, color: C.amber, margin: 0 });
    s.addText(t, { x: x + 0.65, y: 1.3, w: 2.2, h: 0.55, fontFace: HEAD, fontSize: 13, bold: true, color: C.white, valign: "middle", margin: 0 });
    s.addText(d, { x: x + 0.15, y: 1.92, w: 2.65, h: 0.55, fontFace: BODY, fontSize: 10.5, color: "CADCFC", valign: "top", margin: 0 });
    s.addText(o, { x: x + 0.15, y: 2.55, w: 2.65, h: 0.45, fontFace: BODY, fontSize: 10, bold: true, color: C.teal, valign: "top", margin: 0 });
  });
  const cols = [
    ["Postponed on purpose", ["Broad E2E expansion", "Full device-farm coverage", "Performance and security suites", "Custom framework, Pact broker"]],
    ["Next, with more time", ["Logic out of views, injected clock and storage", "Android: Robolectric, ViewModel tests, screenshot tests", "iOS: ViewModel tests, snapshot tests, XCUITest page objects"]],
    ["Trade-offs and AI usage", ["Native tests over cross-platform for fidelity, at the cost of two codebases", "AI-assisted build; every output run, and every new test proven by failing first", "Prompt library: docs/PROMPT_LIBRARY.md"]],
  ];
  cols.forEach(([h, items], i) => {
    const x = 0.5 + i * 3.08;
    s.addText(h, { x, y: 3.3, w: 2.95, h: 0.3, fontFace: HEAD, fontSize: 13, bold: true, color: C.teal, margin: 0 });
    s.addText(bullets(items, 10, "E6EDF7"), { x, y: 3.65, w: 2.95, h: 1.55, fontFace: BODY, margin: 0, valign: "top" });
  });
  s.addNotes("Order rationale: 1 gives the data that sizes 2 and 3; contracts are the cheapest, fastest signal, and the gates need something reliable to gate on. The order changes if the baseline shows a different top risk, for example a flaky pipeline blocking every release.");
}

const out = path.join(__dirname, "..", "deliverables", "SDK_QA_Strategy.pptx");
pres.writeFile({ fileName: out }).then(() => console.log("wrote " + out));
