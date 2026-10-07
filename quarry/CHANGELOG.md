# Changelog

## 0.1.2 — 2026-10-07

- Page head: description and social-preview tags, favicon, and a build stamp in the header.
- Single-file build moved to the repository-level `tools/build.py` (replaces `tools/bundle.py`).

## 0.1.1 — 2026-10-07

- Single-file HTML bundles: the repository-level `tools/bundle.py` builds `dist/quarry.html` and `dist/fieldguide.html`, with quarry's fieldguide links rewritten to the sibling file.
- Moved into the `fieldworks` repository alongside fieldguide.

## 0.1.0 — 2026-10-07

Initial release.

- 10 method families and 70 acquisition methods, each with:
  - operating instructions and tools;
  - economics, pitfalls and source defenses;
  - legal exposure and applicable rules;
  - evidence-tagged vendors and fieldguide links.
- 26 provider archetypes with weighted method recipes, build-from-zero playbooks, economics, risks, pipeline stages and products, including AI archetypes (pretraining corpus, post-training/RLHF vendor, AI data licensing) and web & app market intelligence.
- 9 data origins, 10 pipeline stages with operating steps and failure modes, 10 product/delivery models, and 16 law & precedent entries.
- Six views: supply-chain flow (methods or families mode, with end-to-end hover tracing), recipes matrix, playbooks catalog, pipeline, economics grid (any two ratings), law & precedent.
- Family and legal-exposure filters, full-text search, deep links (`#view=…&item=…`), and load-time reference validation (`window.__quarry`).
- No build step and no dependencies; runs offline from `file://`.
