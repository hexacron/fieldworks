#!/usr/bin/env python3
"""Recurring upkeep checks that keep fieldworks a living document. Python 3.9+ standard library only.

  python3 tools/upkeep.py claims             claims due for (re-)verification (upkeep/claims.json)
  python3 tools/upkeep.py links              broken/blocked catalogue URLs and archived GitHub repos
  python3 tools/upkeep.py watch [--days 7]   recent news mentioning catalogued vendors/tools or watched topics
  python3 tools/upkeep.py report [--days 7]  all three as one Markdown report (what the weekly issue contains)

Options: --index dist/index.json (written by `node tools/validate.mjs --index`), --out FILE.
Environment: GITHUB_TOKEN (optional, raises the GitHub API rate limit for the repo-status check),
SITE_URL (base URL for deep links; defaults to the GitHub Pages address).
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import email.utils
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = os.environ.get("SITE_URL", "https://hexacron.github.io/fieldworks").rstrip("/")
UA_BOT = "fieldworks-upkeep/1.0 (+https://github.com/hexacron/fieldworks)"
UA_BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36"
TODAY = dt.datetime.now(dt.timezone.utc)


def deep_link(project, entity_id):
    if project == "fieldguide":
        return f"{SITE_URL}/fieldguide/#view=catalog&node={entity_id}"
    return f"{SITE_URL}/quarry/#view=playbooks&item={entity_id}"


class _Redirects(urllib.request.HTTPRedirectHandler):
    """Follow 307/308 like 301/302 (Python < 3.11 does not handle 308)."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if code in (307, 308):
            code = 302
        return super().redirect_request(req, fp, code, msg, headers, newurl)


    http_error_307 = http_error_308 = urllib.request.HTTPRedirectHandler.http_error_302


_OPENER = urllib.request.build_opener(_Redirects)


def fetch(url, ua=UA_BOT, timeout=20, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": ua, **(headers or {})})
    return _OPENER.open(req, timeout=timeout)


# ---------------------------------------------------------------- claims
def claims_section():
    data = json.loads((ROOT / "upkeep" / "claims.json").read_text(encoding="utf-8"))
    interval = dt.timedelta(days=data["review_interval_days"])
    never, due, soon = [], [], 0
    for c in data["claims"]:
        checked = dt.datetime.strptime(c["checked"], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
        if c["status"] != "verified":
            never.append(c)
        elif checked + interval <= TODAY:
            due.append(c)
        elif checked + interval <= TODAY + dt.timedelta(days=30):
            soon += 1

    def line(c):
        ents = ", ".join(f"[`{e}`]({deep_link(c['project'], e)})" for e in c["entities"])
        return f"- [ ] **{c['id']}** ({c['project']}: {ents}): {c['claim']} _(last checked {c['checked']})_"

    out = ["## Claims to verify", ""]
    if not never and not due:
        out.append(f"Nothing due. {soon} claim(s) come due in the next 30 days.")
    if never:
        out += [f"### Never verified against a source ({len(never)})", ""] + [line(c) for c in never] + [""]
    if due:
        out += [f"### Due for re-verification ({len(due)})", ""] + [line(c) for c in sorted(due, key=lambda c: c["checked"])] + [""]
    out.append("To clear a claim: check it against a primary source, fix the catalogue text if needed, then set "
               "`status: \"verified\"`, `checked` to today and add the source URL(s) in `upkeep/claims.json`.")
    return "\n".join(out), len(never) + len(due)


# ---------------------------------------------------------------- links
GH_REPO = re.compile(r"^https://github\.com/([^/]+)/([^/#?]+)")


def check_url(item):
    url = item["url"]
    m = GH_REPO.match(url)
    if m:
        headers = {"Accept": "application/vnd.github+json"}
        if os.environ.get("GITHUB_TOKEN"):
            headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
        try:
            with fetch(f"https://api.github.com/repos/{m.group(1)}/{m.group(2)}", headers=headers) as r:
                repo = json.load(r)
            if repo.get("archived"):
                return item, "archived", "repository is archived"
            return item, "ok", ""
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return item, "broken", "repository not found"
            if e.code in (403, 429):
                return item, "blocked", f"GitHub API {e.code} (rate limit?)"
        except Exception as e:  # network errors fall through to a plain fetch
            pass
    try:
        with fetch(url, ua=UA_BROWSER) as r:
            return item, "ok", str(r.status)
    except urllib.error.HTTPError as e:
        kind = "blocked" if e.code in (401, 403, 405, 429, 503) else "broken"
        return item, kind, f"HTTP {e.code}"
    except Exception as e:
        return item, "broken", type(e).__name__ + (f": {e.reason}" if hasattr(e, "reason") else "")


def links_section(index):
    items = [e for e in index["entities"] if e.get("url")]
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check_url, items))
    ack = json.loads((ROOT / "upkeep" / "links.json").read_text(encoding="utf-8"))
    acknowledged = {"archived": set(ack.get("archived_ok", [])), "blocked": set(ack.get("blocked_ok", []))}
    groups = {"broken": [], "archived": [], "blocked": []}
    skipped = 0
    for item, kind, detail in results:
        if item["id"] in acknowledged.get(kind, ()):
            skipped += 1
        elif kind in groups:
            groups[kind].append((item, detail))
    out = ["## Links", "", f"Checked {len(items)} catalogue URLs ({skipped} acknowledged finding(s) in upkeep/links.json hidden)."]
    titles = {"broken": "Broken (fix or remove)", "archived": "Archived GitHub repositories (mark as unmaintained or replace)",
              "blocked": "Blocked automated checks (open manually to confirm)"}
    for kind in ("broken", "archived", "blocked"):
        if groups[kind]:
            out += ["", f"### {titles[kind]} ({len(groups[kind])})", ""]
            out += [f"- [ ] **{i['name']}** ([`{i['id']}`]({deep_link(i['project'], i['id'])})): {i['url']}, {d}" for i, d in groups[kind]]
    if not any(groups.values()):
        out.append("All OK.")
    return "\n".join(out), len(groups["broken"]) + len(groups["archived"])


# ---------------------------------------------------------------- watch
def watch_terms(index, cfg):
    ignore = set(cfg.get("ignore_names", []))
    names = set()
    raw = [e["name"] for e in index["entities"] if e["project"] == "fieldguide" and e["kind"] in ("provider", "tool", "community")]
    raw += index.get("vendors", [])
    for name in raw:
        if name in ignore:
            continue
        for part in re.split(r"\s+/\s+", re.sub(r"\s*\(.*?\)", "", name)):
            part = part.strip()
            if len(part) < 4 or "&" in part or part in ignore or part.lower() == part or len(part.split()) > 4:
                continue
            names.add(part)
    return sorted(names), cfg.get("keywords", [])


def compile_terms(names, keywords):
    pats = []
    for t in names + keywords:
        exact = (t in names) or (t.isupper() and len(t) <= 5)  # proper nouns and short acronyms: case-sensitive
        pats.append((t, re.compile(r"(?<!\w)" + re.escape(t) + r"(?!\w)", 0 if exact else re.I)))
    return pats


def parse_date(text):
    if not text:
        return None
    try:
        return email.utils.parsedate_to_datetime(text)
    except (TypeError, ValueError):
        pass
    try:
        return dt.datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    except ValueError:
        return None


def strip_tags(text):
    return html.unescape(re.sub(r"<[^>]+>", " ", text or "")).strip()


def read_feed(feed):
    with fetch(feed["url"], ua=UA_BROWSER if feed.get("ua") == "browser" else UA_BOT) as r:
        root = ET.fromstring(r.read())
    items = []
    for it in root.iter():
        tag = it.tag.split("}")[-1]
        if tag not in ("item", "entry"):
            continue
        get = lambda name: next((c for c in it if c.tag.split("}")[-1] == name), None)
        title = strip_tags((get("title").text if get("title") is not None else "") or "")
        link_el = get("link")
        link = (link_el.get("href") or link_el.text or "").strip() if link_el is not None else ""
        # Elements without children are falsy, so `a or b` would skip a present element; test for None.
        date_el = next((e for e in map(get, ("pubDate", "published", "updated", "date")) if e is not None), None)
        summary_el = next((e for e in map(get, ("description", "summary", "content")) if e is not None), None)
        items.append({"title": title, "link": link, "date": parse_date(date_el.text if date_el is not None else ""),
                      "summary": strip_tags(summary_el.text if summary_el is not None else "")[:2000]})
    return items


def watch_section(index, days):
    cfg = json.loads((ROOT / "upkeep" / "watch.json").read_text(encoding="utf-8"))
    names, keywords = watch_terms(index, cfg)
    pats = compile_terms(names, keywords)
    since = TODAY - dt.timedelta(days=days)

    def scan(feed):
        error = None
        for attempt in range(2):  # one retry: feeds sharing a host (CourtListener) occasionally reset connections
            try:
                return feed, read_feed(feed), None
            except Exception as e:
                error = e
        return feed, [], f"{type(error).__name__}: {getattr(error, 'reason', error)}"

    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(scan, cfg["feeds"]))

    groups, failed, total = {}, [], 0
    for feed, items, error in results:
        if error:
            failed.append(f"- {feed['name']} ({feed['url']}): {error}")
            continue
        for it in items:
            if it["date"] and it["date"].tzinfo is None:
                it["date"] = it["date"].replace(tzinfo=dt.timezone.utc)
            if not it["date"] or it["date"] < since:
                continue
            text = f"{it['title']} {it['summary']}"
            # A feed mentioning its own publisher (e.g. Cloudflare's blog naming Cloudflare) is not news.
            hits = [t for t, p in pats if p.search(text) and t.lower() not in feed["name"].lower()]
            if not hits and not feed.get("all"):
                continue
            entity_hits = [h for h in hits if h in names]
            groups.setdefault(feed.get("group", "Other"), []).append((feed, it, entity_hits, [h for h in hits if h not in names]))
            total += 1

    out = ["## News watch", "", f"Items from the last {days} days that mention a catalogued vendor/tool ({len(names)} names) "
           f"or a watched topic ({len(keywords)} keywords). **Bold** = catalogued entity: check whether the entry needs updating."]
    for group in sorted(groups):
        rows = sorted(groups[group], key=lambda r: r[1]["date"], reverse=True)
        out += ["", f"### {group} ({len(rows)})", ""]
        for feed, it, ents, topics in rows[:40]:
            tags = ", ".join([f"**{e}**" for e in ents] + topics[:4])
            out.append(f"- [ ] [{it['title'] or '(untitled)'}]({it['link']}) · {feed['name']} · {it['date']:%Y-%m-%d}" + (f" · {tags}" if tags else ""))
    if not groups:
        out += ["", "No matching items."]
    if failed:
        out += ["", "### Feeds that failed", ""] + failed
    return "\n".join(out), total


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["claims", "links", "watch", "report"])
    ap.add_argument("--index", default="dist/index.json")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--out")
    args = ap.parse_args()

    index = None
    if args.command in ("links", "watch", "report"):
        p = Path(args.index)
        if not p.exists():
            sys.exit(f"{p} not found: run `node tools/validate.mjs --index {p}` first")
        index = json.loads(p.read_text(encoding="utf-8"))

    sections, counts = [], {}
    if args.command in ("claims", "report"):
        text, counts["claims"] = claims_section(); sections.append(text)
    if args.command in ("links", "report"):
        text, counts["links"] = links_section(index); sections.append(text)
    if args.command in ("watch", "report"):
        text, counts["watch"] = watch_section(index, args.days); sections.append(text)

    if args.command == "report":
        head = [f"Weekly upkeep for **{TODAY:%Y-%m-%d}**: {counts['claims']} claim(s) to verify · {counts['links']} link problem(s) · "
                f"{counts['watch']} news item(s) to triage.", "",
                "Work through the checkboxes, fix the catalogue in a PR (one PR can close several items), then close this issue. "
                "See MAINTAINING.md for the routine.", ""]
        sections = ["\n".join(head)] + sections
    body = "\n\n".join(sections) + "\n"
    if args.out:
        Path(args.out).write_text(body, encoding="utf-8")
        print(f"wrote {args.out}: " + ", ".join(f"{k}={v}" for k, v in counts.items()))
    else:
        sys.stdout.write(body)


if __name__ == "__main__":
    main()
