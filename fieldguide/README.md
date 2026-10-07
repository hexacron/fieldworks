# fieldguide

An interactive map of the **OSINT (open-source intelligence) ecosystem**. It covers where open data comes from, who sells or publishes access to it, how investigators collect and exploit it, which tools do the work, and the law, ethics and trends around all of it.

It is a static web page with no build step, no dependencies and no network calls. It works offline from `file://`; only the outbound "Open website" links need a connection.

## Quick start

```sh
open index.html                 # macOS; or double-click it
# or serve it, if a browser blocks file:// scripts:
python3 -m http.server 8000     # then visit http://localhost:8000
```

## Sharing as a single file

From the repository root, `python3 tools/build.py` builds a self-contained `dist/fieldguide.html` with all CSS and scripts inlined; tagged releases attach it automatically. See the [repository README](../README.md#build).

## What's in it

302 entities and 681 connections across nine layers:

| Layer | Count | Covers |
|---|---|---|
| Data Sources | 37 | Social and messaging platforms, web archives, WHOIS/DNS, certificate transparency, internet scan data, code repos, web and mobile app APIs, app packages and client code, registries, sanctions lists, trade/customs, blockchain, satellite imagery, AIS/ADS-B, breach data, dark web |
| Data Providers | 92 | Threat intel, internet infrastructure, search and image, social and media monitoring, identity and breach, corporate risk and compliance, strategic/defense, geospatial and tracking, blockchain analytics, dark web, scraping infrastructure, app intelligence, open/nonprofit data |
| Collection Techniques | 50 | Search operators, passive DNS pivoting, username enumeration, geolocation, verification, vessel/aircraft tracking, ownership and money tracing, blockchain tracing, **collection engineering** (scraping, hidden API discovery, GraphQL mapping, client-code analysis, mobile app reversing, traffic interception and pinning bypass, request-signing replication, private-API clients, anti-bot evasion, app attribution, and the authorization line at API flaws and exposed secrets), structured analysis |
| Tools & Platforms | 50 | Link analysis, recon automation, identity enumeration, media forensics, geospatial, scraping, API and traffic analysis, mobile reverse engineering, secret scanning, fingerprint evasion, capture and preservation, CTI platforms, OPSEC, AI and language |
| Disciplines (INTs) | 11 | OSINT and its sub-disciplines (SOCMINT, GEOINT, CTI, FININT, …) plus adjacent HUMINT/SIGINT/forensics |
| Use Cases & Sectors | 14 | Public sector, private sector, civil society and research |
| Frameworks, Law & Ethics | 20 | Intelligence cycle, Berkeley Protocol, source grading, ACH, ATT&CK, STIX/TAXII, DISARM, C2PA, RFC 9309, OWASP API Top 10, OWASP MASTG/MASVS, coordinated disclosure, GDPR, computer-misuse law, anti-circumvention law, EU AI Act, DSA Art. 40, US IC OSINT policy |
| Community & Training | 13 | Investigative collectives, training and certification, directories, practice challenges |
| Trends & Challenges | 15 | API lockdowns, login walls, anti-bot arms race, hardened mobile clients, WHOIS→RDAP, synthetic media, AI-augmented OSINT, infostealer logs, GNSS/transponder spoofing, privacy regulation |

The 13 collection-engineering techniques carry **practitioner notes**: workflow, pitfalls and legal exposure, shown in the detail panel and included in search. [`docs/collection-engineering.md`](docs/collection-engineering.md) ties them together as an access ladder, from official APIs up to the line where collection becomes intrusion.

## Views

| View | What it shows |
|---|---|
| **Ecosystem map** | Network graph with sources at the centre and the other layers grouped around them. Node size is the number of connections. Hover to trace, click for details, drag a node to move it, drag the background to pan, scroll to zoom. |
| **Catalog** | Cards grouped by layer and category, with access-model badges and a per-layer count of each entity's connections. |
| **Workflow** | Techniques, tools and frameworks placed on the five intelligence-cycle stages, plus a separate row for OPSEC, legal and ethics. |
| **Source × technique** | Grid of which techniques work on which sources, with a bar for how many providers serve each source. |

Shared controls:

- **Detail panel:** click any entity to see its description, any practitioner notes, and its connections grouped by layer. Click a chip to pivot to it; **Show on map** centres it in the graph.
- **Search:** filters or highlights every view. Press `/` to focus it, Enter to jump to the first match, Esc to clear the selection.
- **Layer toggles:** each has an **only** button that isolates a single layer.
- **Access-model filter:** commercial, freemium, free, open source, public sector.
- **Deep links:** the URL tracks the current view and selection, e.g. `index.html#view=catalog&node=t_maltego`.

## What lives where

| Path | What it is |
|---|---|
| `index.html` | Page shell: header, sidebar, one `<section>` per view, the detail panel. Loads the CSS and two scripts. |
| `src/data.js` | **The catalogue.** Layer definitions, access models, workflow stages and every entity row with its relations. Content changes happen here. |
| `src/app.js` | Builds the graph model from `data.js` and renders the four views, the sidebar, search, the detail panel and URL state. |
| `src/styles.css` | All styling (dark theme, per-view layouts). |
| `docs/collection-engineering.md` | Primer on scraping, hidden APIs, mobile app reversing and private APIs: the access ladder, web and mobile workflows, where OSINT ends, legal reference points. |
| `docs/data-model.md` | Row schema, ID prefixes, relation rules, enums, practitioner notes, and step-by-step instructions for adding entities or layers. |
| `docs/architecture.md` | How `app.js` works: state, filtering semantics per view, the force layout, rendering, URL state, how to add a view. |
| `docs/maintenance.md` | Post-edit verification checklist, curation rules, time-sensitive claims to re-check, known gaps. |
| `CHANGELOG.md` | Release notes. |

## Editing content

Everything is in `src/data.js`. Adding an entity is one array row; connections only need declaring on one side. See [`docs/data-model.md`](docs/data-model.md). Then run the checklist in [`docs/maintenance.md`](docs/maintenance.md#verification-after-editing). The short version: reload the page and confirm `window.__fieldguide.missing` is empty in the console.

## Caveats

- The catalogue is hand-curated from general domain knowledge as of October 2026. It is not a market survey. Vendor details (acquisitions, rebrands, pricing, API terms) go stale quickly; [`docs/maintenance.md`](docs/maintenance.md#time-sensitive-claims) lists the claims most likely to need re-checking.
- Inclusion is not endorsement. Several listed sources and providers (people-search, breach data, face search, ad-tech location data, scraping) are legal only for some purposes or in some jurisdictions. Confirm legal basis and platform terms before use.
- Connections are editorial. Where they are sparse, the matrix and node sizes reflect the catalogue, not the market. For example, job postings show zero providers.
