#!/usr/bin/env python3
"""Build fieldworks outputs. Python 3.9+ standard library only.

  python3 tools/build.py            single-file bundles: dist/fieldguide.html, dist/quarry.html
  python3 tools/build.py --site     bundles + the static website in _site/ (what GitHub Pages serves)

Options:
  --stamp TEXT       build label shown in each page header (default: git describe + UTC date)
  --site-url URL     public base URL for social-preview tags (default: DEFAULT_SITE_URL below;
                     override for a custom domain, e.g. --site-url https://fieldworks.example.org)

Bundling inlines each page's local <link rel="stylesheet"> and <script src> tags. In the
bundles, quarry's cross-links to fieldguide point at the sibling file fieldguide.html.
"""
import argparse
import datetime
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SITE = ROOT / "_site"
DEFAULT_SITE_URL = "https://hexacron.github.io/fieldworks"
BUILD_PLACEHOLDER = "<span data-build>dev</span>"
BUNDLES = [
    # (source page, bundle file name, literal replacements applied to the bundle only)
    ("fieldguide/index.html", "fieldguide.html", []),
    ("quarry/index.html", "quarry.html", [("../fieldguide/index.html", "fieldguide.html")]),
]
SITE_COPY = ["index.html", "assets", "fieldguide", "quarry", "LICENSE", "LICENSE-CONTENT"]
SITE_SKIP = {"docs", "CHANGELOG.md", "README.md", ".DS_Store"}


def default_stamp() -> str:
    try:
        rev = subprocess.run(["git", "describe", "--tags", "--always", "--dirty"], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        rev = "local"
    return f"{rev} · {datetime.datetime.now(datetime.timezone.utc):%Y-%m-%d}"


def finish(html: str, stamp: str, site_url: str) -> str:
    """Apply the build stamp and site URL to a page."""
    html = html.replace(BUILD_PLACEHOLDER, f"<span data-build>{stamp}</span>")
    return html.replace(DEFAULT_SITE_URL, site_url.rstrip("/"))


def bundle(src: Path, replacements) -> str:
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

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    for old, new in replacements:
        if old not in html:
            sys.exit(f"{src}: replacement target '{old}' not found")
        html = html.replace(old, new)
    return html


def build_bundles(stamp: str, site_url: str) -> None:
    DIST.mkdir(exist_ok=True)
    for src, name, repl in BUNDLES:
        out = DIST / name
        out.write_text(finish(bundle(ROOT / src, repl), stamp, site_url), encoding="utf-8")
        print(f"dist/{name}  {out.stat().st_size / 1024:.0f} KB")


def build_site(stamp: str, site_url: str) -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    for name in SITE_COPY:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, SITE / name, ignore=lambda d, names: [n for n in names if n in SITE_SKIP])
        else:
            shutil.copy2(src, SITE / name)
    for page in SITE.rglob("*.html"):
        page.write_text(finish(page.read_text(encoding="utf-8"), stamp, site_url), encoding="utf-8")
    (SITE / "downloads").mkdir()
    for _, name, _ in BUNDLES:
        shutil.copy2(DIST / name, SITE / "downloads" / name)
    (SITE / ".nojekyll").touch()
    print(f"_site/  {sum(1 for p in SITE.rglob('*') if p.is_file())} files")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", action="store_true", help="also assemble the website into _site/")
    ap.add_argument("--stamp", default=None, help="build label shown in page headers")
    ap.add_argument("--site-url", default=DEFAULT_SITE_URL, help="public base URL for social tags")
    args = ap.parse_args()
    stamp = args.stamp or default_stamp()
    build_bundles(stamp, args.site_url)
    if args.site:
        build_site(stamp, args.site_url)


if __name__ == "__main__":
    main()
