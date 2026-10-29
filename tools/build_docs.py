#!/usr/bin/env python3
"""Build PDFs from the Markdown docs. Mermaid blocks are rendered to PNG first.

Outputs deliverables/FINAL_DELIVERABLE.pdf (the deck is built by tools/build_pptx.js).
Needs: node/npx, Google Chrome (CHROME env to override), python `markdown`.
"""
import hashlib
import os
import re
import subprocess
import tempfile
from pathlib import Path

import markdown

DOCS = Path(__file__).resolve().parent.parent / "docs"
DIST = DOCS / "dist"
OUT = DOCS.parent / "deliverables"
OUT.mkdir(exist_ok=True)
IMG = DIST / "img"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
BLOCK = re.compile(r"```mermaid\n(.*?)```", re.S)

DIST.mkdir(exist_ok=True)
IMG.mkdir(exist_ok=True)
puppeteer_cfg = Path(tempfile.mkdtemp()) / "pp.json"
puppeteer_cfg.write_text('{"executablePath": "%s", "args": ["--no-sandbox"]}' % CHROME)


def render(code: str) -> Path:
    out = IMG / f"{hashlib.md5(code.encode()).hexdigest()[:10]}.png"
    if not out.exists():
        src = out.with_suffix(".mmd")
        src.write_text(code)
        subprocess.run(
            ["npx", "-y", "@mermaid-js/mermaid-cli", "-i", str(src), "-o", str(out), "-p", str(puppeteer_cfg),
             "-s", "2", "-b", "white"],
            check=True, capture_output=True, env={**os.environ, "PUPPETEER_SKIP_DOWNLOAD": "1"},
        )
        src.unlink()
    return out


def with_images(text: str) -> str:
    text = text.replace("](../deliverables/", f"]({OUT.as_posix()}/")
    return BLOCK.sub(lambda m: f"![diagram]({render(m.group(1)).as_posix()})", text)


# Document -> HTML -> PDF
def blank_before_lists(text: str) -> str:
    """Python-Markdown needs a blank line before a list; GitHub does not."""
    out, in_code = [], False
    for line in text.split("\n"):
        if line.startswith("```"):
            in_code = not in_code
        is_item = not in_code and re.match(r"(- |\d+\. )", line)
        if is_item and out and out[-1].strip() and not re.match(r"(- |\d+\. |\s)", out[-1]) and not out[-1].startswith("|"):
            out.append("")
        out.append(line)
    return "\n".join(out)


body = markdown.markdown(with_images(blank_before_lists((DOCS / "FINAL_DELIVERABLE.md").read_text())), extensions=["tables", "fenced_code"])
css = """body{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:10.5px;line-height:1.4;margin:0 }
h1{font-size:20px;color:#0b5fff}h2{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:2px;margin-top:16px}
table{border-collapse:collapse;width:100%;font-size:9px;margin:6px 0}td,th{border:1px solid #bbb;padding:3px 5px;vertical-align:top}
th{background:#f0f4ff}code{background:#f3f3f3;padding:0 2px}p,img{break-inside:avoid}img{max-width:100%;max-height:520px;display:block;margin:6px auto}"""
html = DIST / "FINAL_DELIVERABLE.html"
html.write_text(f"<html><head><meta charset='utf-8'><style>{css}</style></head><body>{body}</body></html>")
subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={OUT / 'FINAL_DELIVERABLE.pdf'}", html.as_uri()], check=True, capture_output=True)
html.unlink()

print("built", OUT / "FINAL_DELIVERABLE.pdf")
