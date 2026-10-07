# Changelog

## 0.2.2 — 2026-10-07

First full fact-check: all 26 fieldguide claims in `upkeep/claims.json` verified against sources.

- `p_maxar`: renamed **Vantor**. Maxar Intelligence rebranded in October 2025 after Advent International's 2023 take-private and split.
- `p_msti`: renamed **Threat intelligence in Microsoft Defender**. The standalone Defender Threat Intelligence portal was retired on 1 Aug 2026 and folded into Defender XDR and Sentinel.
- `p_brightdata`, `docs/collection-engineering.md`: X v. Bright Data was largely dismissed in May 2024, partly revived on amendment and settled in 2025, so Bright Data did not simply "win" against X.
- `r_whois`: exact WHOIS sunset date (28 January 2025).

## 0.2.1 — 2026-10-07

- `t_telethon`: notes that Telethon's GitHub repository was archived in 2026 (found by the first upkeep link check).
- `p_edgar`: URL updated to `https://www.sec.gov/search-filings` (the old `/edgar` path now redirects to filing submission).
- Page head: description and social-preview tags, favicon, and a build stamp in the header.

## 0.2.0 — 2026-10-07

Collection engineering: scraping, reverse engineering and API collection beyond web crawling.

- **Sources:** added web & mobile app APIs (`s_apis`) and app packages & client code (`s_clientcode`). `s_mobile` is narrowed to ad-tech & location data.
- **Techniques:** added a Collection engineering category of 12 new techniques:
  - hidden API discovery, client-code & source-map analysis, GraphQL schema mapping, active endpoint discovery;
  - mobile app reverse engineering, traffic interception & pinning bypass, request signing & session replication, unofficial private-API clients;
  - anti-bot evasion, app attribution pivoting;
  - API authorization flaws, exposed keys & cloud misconfiguration.
  
  `k_scraping` is renamed "Web crawling & HTML scraping" and moved into the category.
- **Tools:** 15 new tools across API & traffic analysis, mobile reverse engineering, secret scanning, fingerprint evasion and private-API libraries. yt-dlp is now linked to private-API clients.
- **Providers:** added scraping infrastructure (Bright Data, Oxylabs, Zyte, Apify) and app intelligence (Exodus Privacy, Sensor Tower).
- **Governance:** added Robots Exclusion Protocol (RFC 9309), OWASP API Security Top 10, OWASP MASTG/MASVS, coordinated vulnerability disclosure, and anti-circumvention & reverse-engineering law. `g_cfaa` now covers the 2024 Bright Data rulings and the authorization line.
- **Trends:** added the anti-bot arms race, hardened mobile clients, and login walls.
- **Practitioner notes:** new optional `notes` field on entities. Notes render in the detail panel, are flagged on catalog cards and are searchable. All 13 collection-engineering techniques have them.
- **Docs:** new `docs/collection-engineering.md` primer (access ladder, web and mobile workflows, where OSINT ends, legal reference points). Data model, architecture, maintenance and README updated.
- Catalogue is now 302 entities and 681 connections.

## 0.1.0 — 2026-10-07

Initial release.

- Catalogue of 259 entities and 572 connections across nine layers: data sources, data providers, collection techniques, tools and platforms, disciplines, use cases, frameworks/law/ethics, community and training, trends.
- Four views: ecosystem map (clustered force-directed graph), catalog, intelligence-cycle workflow, source × technique matrix.
- Detail panel with connections grouped by layer; search, layer and access-model filters; deep links via `#view=…&node=…`.
- No build step and no dependencies; runs offline from `file://`.
