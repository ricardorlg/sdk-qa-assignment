#!/usr/bin/env python3
"""Expand compat.yaml into GitHub Actions matrices.

Usage: gen_matrix.py <pr|rc>  -> prints JSON with keys native_ui_android, native_ui_ios, contract_vs_release, canary.
Also fails if a consumer app pins a module that the manifest does not define.
"""
import json
import sys
from pathlib import Path

import yaml

manifest = yaml.safe_load((Path(__file__).parent.parent / "compat.yaml").read_text())
mode = sys.argv[1] if len(sys.argv) > 1 else "pr"
if mode not in ("pr", "rc"):
    sys.exit("mode must be 'pr' or 'rc'")

known = set(manifest["modules"])
for app in manifest["consumer_apps"]:
    unknown = set(app["pins"]) - known
    if unknown:
        sys.exit(f"{app['name']} pins unknown modules: {sorted(unknown)}")

native_ui = {"android": [], "ios": []}
for platform, cfg in manifest["platforms"].items():
    versions = cfg["os_versions"]
    selected = [versions[0], versions[-1]] if mode == "pr" else versions
    native_ui[platform] = [str(v) for v in dict.fromkeys(selected)]

contract_vs_release, canary = [], []
if mode == "rc":
    contract_vs_release = [{"release": r} for r in manifest["sdk"]["previous_releases"]]
    canary = [{"app": a["name"]} for a in manifest["consumer_apps"] if a.get("canary")]

print(json.dumps({
    "native_ui_android": {"os": native_ui["android"]},
    "native_ui_ios": {"os": native_ui["ios"]},
    "contract_vs_release": {"include": contract_vs_release} if contract_vs_release else None,
    "canary": {"include": canary} if canary else None,
}))
