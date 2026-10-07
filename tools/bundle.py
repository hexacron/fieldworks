#!/usr/bin/env python3
"""Build single-file HTML bundles of both projects into dist/.

Usage: python3 tools/bundle.py

Inlines each page's local <link rel="stylesheet"> and <script src> tags, producing
dist/fieldguide.html and dist/quarry.html. quarry's cross-links to fieldguide are rewritten
to the sibling dist/fieldguide.html, so the two files work together from any folder.
Python 3 standard library only.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
BUILDS = [
    # (source page, output file, literal replacements applied to the bundle)
    ("fieldguide/index.html", "fieldguide.html", []),
    ("quarry/index.html", "quarry.html", [("../fieldguide/index.html", "fieldguide.html")]),
]


def bundle(src: Path, out: Path, replacements) -> None:
    base = src.parent
    html = src.read_text(encoding="utf-8")

    def local(path):
        return None if re.match(r"^[a-z]+:|^//", path) else base / path

    def inline_css(m):
        p = local(m.group(1))
        return m.group(0) if p is None else "<style>\n" + p.read_text(encoding="utf-8") + "\n</style>"

    def inline_js(m):
        p = local(m.group(1))
        if p is None:
            return m.group(0)
        # A literal "</script" inside JS would end the inline element early.
        code = re.sub(r"</(script)", r"<\\/\1", p.read_text(encoding="utf-8"), flags=re.I)
        return f"<script>\n/* {m.group(1)} */\n{code}\n</script>"

    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
    html, n_js = re.subn(r'<script src="([^"]+)"></script>', inline_js, html)
    for old, new in replacements:
        if old not in html:
            sys.exit(f"{src}: replacement target '{old}' not found")
        html = html.replace(old, new)
    out.write_text(html, encoding="utf-8")
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size / 1024:.0f} KB  ({n_css} css, {n_js} js inlined)")


DIST.mkdir(exist_ok=True)
for src, out, repl in BUILDS:
    bundle(ROOT / src, DIST / out, repl)
