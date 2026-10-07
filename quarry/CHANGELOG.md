# Changelog

## 0.1.3 — 2026-10-07

First full fact-check: all 33 quarry claims in `upkeep/claims.json` verified against sources.

- **Enforcement:**
  - FTC v. Kochava settled with a 10-year ban (court order, 26 Jun 2026).
  - Gravy Analytics/Venntel and Mobilewalla orders were finalized in January 2025.
  - The GM/OnStar 20-year order was finalized on 14 Jan 2026.
  - FCC carrier location-data fines now carry amounts, plus the Supreme Court's FCC v. AT&T ruling (4 Jun 2026) upholding them.
- **AI and copyright:**
  - The Third Circuit affirmed Thomson Reuters v. Ross (29 Sep 2026).
  - The Bartz v. Anthropic settlement received final approval (20 Jul 2026).
  - Getty v. Stability AI UK judgment (4 Nov 2025).
  - LAION's re-screening partners corrected to IWF and C3P (not NCMEC); Re-LAION-5B date added.
  - OpenAI–DeepSeek described as an unresolved allegation, not litigation.
- **Privacy:**
  - Clearview AI UK appeal history (Upper Tribunal, October 2025; Court of Appeal permission, December 2025).
  - Timeline of Meta's EU AI-training pause (June 2024) and resumption (May 2025).
  - California DROP is live (consumers since 1 Jan 2026; broker processing since 1 Aug 2026).
- **Infrastructure and records:**
  - The CAIDA telescope is now a /9 plus a /10, not a /8.
  - Exact RDAP date.
  - PACER fee increase effective 1 Jan 2027.
- **Vendors:**
  - Hiya's contact-book collection is now documented (evidence `public`).
  - Mapillary was acquired by Facebook (renamed Meta in 2021).
  - Maxar is now Vantor.
  - Microsoft Defender TI is retired.
  - Recorded Future deal closed December 2024.
  - Bright Data's litigation outcome is stated consistently: summary judgment against Meta; the X case partly revived and settled.

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
