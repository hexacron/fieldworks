# quarry

An interactive map of **how data providers acquire data**: where data physically originates, the methods used to collect it, which mix of methods builds each kind of provider, how raw collection becomes a product, and the economics and law around every step. AI training-data acquisition is covered as its own family.

Companion to [`../fieldguide`](../fieldguide), which maps *who* sells OSINT data and how investigators use it. quarry covers *how that data gets made*. Methods and archetypes link into fieldguide entries where they correspond.

Static web page with no build step, no dependencies and no network calls. Works offline from `file://`.

## Quick start

```sh
open index.html                 # macOS; or double-click it
# or, if a browser blocks file:// scripts:
python3 -m http.server 8000     # then visit http://localhost:8000
```

For the fieldguide links to work, keep `quarry/` and `fieldguide/` side by side.

## What's in it

| Kind | Count | |
|---|---|---|
| Method families | 10 | Web & platform · network measurement · owned sensors · contributor & crowd networks · embedded & device data · public records · commercial supply chain · human collection · underground collection · AI training data |
| Acquisition methods | 70 | Each a full playbook: operating instructions, tools, economics, pitfalls, how sources defend, legal exposure, applicable rules, named vendors with evidence level, fieldguide links |
| Provider archetypes | 26 | Recipes of weighted methods plus a build-from-zero playbook, economics, risks, critical pipeline stages, products and vendors. Examples: internet scanners, passive DNS, breach data, people-search, corporate registries, flight/maritime tracking, location brokers, face search, foundation-model corpora, RLHF vendors, AI data licensing |
| Data origins | 9 | People & devices, platforms, internet infrastructure, governments, commerce, the physical world, media, criminal ecosystems, AI models |
| Pipeline stages | 10 | Ingestion → parsing → normalization → dedup → entity resolution → enrichment → labelling → QA & poisoning defense → history → compliance |
| Products | 10 | API, bulk, platform, feeds, CTI feeds, integrations, reports, marketplace, training datasets, models |
| Law & precedent | 16 | GDPR, US state privacy and broker laws, FTC broker orders, bulk-data rule, FCRA, GLBA/DPPA, CFAA and scraping cases, contract, copyright/TDM and AI cases, EU AI Act, robots/AI opt-outs, interception, stolen data, provenance, radio, remote sensing |

Ratings are editorial, on a 1–3 scale: cost to operate, achievable scale, freshness, defensibility, legal exposure. Each vendor is tagged with an evidence level: **public** (documented by the vendor), **reported** (press, courts or regulators) or **inferred** (industry-typical, unconfirmed).

## Sharing as a single file

From the repository root, `python3 tools/build.py` builds `dist/quarry.html` and `dist/fieldguide.html`: self-contained single files with all CSS and scripts inlined (tagged releases attach them automatically). In the bundle, quarry's "In fieldguide" links point at `fieldguide.html` in the same folder, so share the two files together (or `quarry.html` alone, minus those links). See the [repository README](../README.md#build).

## Views

| View | What it shows |
|---|---|
| **Supply chain** | Flow diagram: origins → methods (or families) → archetypes → products, with link width proportional to recipe weight. Hover any node to trace its entire upstream and downstream chain. |
| **Recipes** | Archetype × method matrix shaded by weight. Rows open build playbooks; columns open method playbooks. |
| **Playbooks** | Method cards by family, with rating pips and legal-exposure badges. |
| **Pipeline** | The ten processing stages, with failure modes and the archetypes for which each stage is critical. |
| **Economics** | Methods placed on any two ratings. The default, cost × defensibility, shows which collection investments build moats. |
| **Law & precedent** | Rules with key holdings, enforcement cases and compliance steps, plus the methods each one constrains. |

Shared controls:
- **Detail panel:** opens on click, for every entity.
- **Family filter:** with an **only** shortcut to isolate one family.
- **Legal-exposure filter.**
- **Search:** covers every field, including steps and vendors. `/` focuses it, Enter opens the first match, Esc closes the panel.
- **Deep links:** e.g. `index.html#view=playbooks&item=ug_stealer`.

## Scope boundaries

Operating instructions are deliberately specific. Three areas are bounded:

- **Underground collection** covers:
  - monitoring forums, markets and leak sites;
  - breach-dump verification and ingestion;
  - stealer-log processing;
  - the governance of covert collection and of purchasing decisions.

  It does **not** document buying from criminal sellers, obtaining logs from criminal distribution channels, or passing vetting in criminal communities.
- **Consumer and device data** (SDKs, bidstream, panels, telemetry, telco, IoT, contact books, user-interaction data) is written as the disclosed, consented, contracted version. Covert variants appear only as what enforcement actions found.
- **Pirated content** (shadow libraries) appears only as documented practice and its legal outcomes.

Nothing here is legal advice.

## What lives where

| Path | What it is |
|---|---|
| `index.html` | Page shell; loads the CSS, then `src/data/core.js`, every data file and finally `src/app.js`. |
| `src/data/core.js` | Families, rating scales, evidence levels, empty registries and the `O M S D A G` helpers. |
| `src/data/web-records.js` | Web & platform and public-records methods. |
| `src/data/network.js` | Network & infrastructure measurement methods. |
| `src/data/sensors-crowd.js` | Owned-sensor and crowd-network methods. |
| `src/data/embedded-commercial.js` | Embedded/device and commercial-supply-chain methods. |
| `src/data/human-rules.js` | Human-collection methods and all law & precedent entries. |
| `src/data/underground.js` | Underground collection methods. |
| `src/data/ai.js` | AI training-data acquisition methods. |
| `src/data/chain.js` | Origins, pipeline stages, products and provider archetypes. |
| `src/app.js` | Reference resolution, validation, all six views, detail panel, search and URL state. |
| `src/styles.css` | Styling. |
| `docs/data-model.md` | Schemas, ID prefixes, derived relationships, text markup, recipes for adding content. |
| `docs/architecture.md` | Load order, filtering semantics per view, supply-chain layout algorithm, how to add a view. |
| `docs/maintenance.md` | Verification checklist, curation rules, time-sensitive claims to re-check, known gaps. |
| `CHANGELOG.md` | Release notes. |

## Editing content

Each family lives in one file, and every entry is a single helper call. See [`docs/data-model.md`](docs/data-model.md), then run the checklist in [`docs/maintenance.md`](docs/maintenance.md#verification-after-editing). The short version: reload the page and confirm `window.__quarry.missing` is empty.

## Caveats

- Compiled in October 2026 from general domain knowledge, not vendor disclosures. Vendor sourcing practices are often undisclosed, which is why every vendor carries an evidence level.
- Cost figures marked `~` / `(estimate)` are orders of magnitude, not quotes.
- Case law, enforcement and AI-training litigation move fast; [`docs/maintenance.md`](docs/maintenance.md#time-sensitive-claims) lists what to re-check.
