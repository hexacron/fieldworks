# Changelog

Repository-level changes: site, tooling and maintenance. Content changes are logged per project in [`fieldguide/CHANGELOG.md`](fieldguide/CHANGELOG.md) and [`quarry/CHANGELOG.md`](quarry/CHANGELOG.md). Releases use calendar versions, `vYYYY.MM.N`.

## Unreleased

- `upkeep/claims.json`: all 59 claims verified against primary sources (16 corrected, catalogue text updated); every cited URL checked to resolve. Details in the project changelogs.
- `upkeep/links.json`: Shodan and NASA Earthdata acknowledged (they block GitHub runner IPs).

## v2026.10.0 — 2026-10-07

First tagged release.

- **Website:** landing page (`index.html`) linking both tools and their single-file downloads; social-preview images and tags; favicons; a build stamp (version and date) on every page.
- **Build:** `tools/build.py` replaces `tools/bundle.py`. It builds both single-file bundles into `dist/` and, with `--site`, the website into `_site/`.
- **Validation:** `tools/validate.mjs` checks both catalogues, cross-project links, the claims register and upkeep config; it runs in CI on every push and pull request.
- **Living-document maintenance:**
  - `upkeep/claims.json` claims register (59 dated facts with verification status and sources);
  - `tools/upkeep.py` checks for claims due, link health (including archived GitHub repositories) and a news watch over 17 regulator, court, security and OSINT feeds;
  - a weekly upkeep issue opened by GitHub Actions.
- **GitHub:** CI, Pages deploy (enabled once the repository is public), release (single files attached to tagged releases) and weekly-upkeep workflows; correction and new-entry issue forms; PR template.
- **Docs:** `MAINTAINING.md` (cadence, weekly routine, releases, going public), `CONTRIBUTING.md` (evidence standard, scope boundaries, licensing of contributions).
- **Licences:** code MIT (`LICENSE`), content CC BY 4.0 (`LICENSE-CONTENT`).
