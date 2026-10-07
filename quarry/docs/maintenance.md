# Maintenance

## Verification after editing

There is no test suite. The data is the product, and the page validates it on load.

1. Reload `index.html` with the devtools console open.
2. **No console warnings.**
   - `Unresolved references:` lists every id that doesn't exist or has the wrong kind (e.g. a rule id in `origins`), plus unknown families and invalid ratings.
   - `Duplicate id` means two entries share an id; the later one wins.
3. Run `window.__quarry` in the console. `missing` must be `[]`; `counts` and `perFamily` should change by exactly what you added.
4. **Orphans.** `METHODS.filter(m => !m.uses.length).map(m => m.id)` lists methods no archetype uses. Only `ug_purchase` is intentionally unused (no archetype should be built on it).
5. **fieldguide links.** Every id in a `fieldguide` array must exist in `../fieldguide/src/data.js`. Click one from the detail panel to confirm it opens the right entry.
6. Check each view:
   - **Supply chain:** the new entity appears in both Methods and Families modes, and hovering it traces the expected chain.
   - **Recipes:** the cells and weights are correct.
   - **Playbooks:** the card shows the right badge and pips.
   - **Pipeline, Economics and Law:** the entity sits where expected.
7. Open `index.html#view=playbooks&item=<new id>`. It should load with the detail panel open.

Update the counts in `README.md` and add a `CHANGELOG.md` entry when content changes.

## Curation rules

- **Operating instructions are the point.** Steps should be specific enough that an engineer could start building: tools, commands, parameters, sequencing, scale and coverage metrics. Generic advice is a defect.
- **Boundaries (keep them when editing):**
  - Underground: no procurement from criminal sellers, no instructions for obtaining logs from criminal channels, no techniques for passing vetting in criminal communities.
  - Consumer and device data: write the disclosed, consented, contracted version only; covert variants appear only as enforcement findings.
  - No instructions for unauthorized access or exploitation.
  - Pirated content appears only as practice plus legal outcome.
- **Vendor evidence is mandatory.** Use `public` only when the vendor documents the practice, `reported` for press, court or regulator sources, and `inferred` sparingly (say so in the note). Don't attribute a sourcing method to a named vendor without one of these.
- **Numbers.** Costs are orders of magnitude marked `~` and `(estimate)`. Never invent statistics, prices or case outcomes.
- **Maintainer notes stay out of content.** Phrases like "verify" or "time-sensitive" belong in the table below, not in user-facing text.
- **Neutral tone.** Legal exposure goes in `legal`, `risks` and the rules, not sprinkled through steps.

## Time-sensitive claims

Collected from the authors of each data file at creation (October 2026). Re-check these first when refreshing.

| Where | Claim |
|---|---|
| `web_officialapi`, `a_social` | X API 2023 pricing overhaul; Reddit 2023 paid API; CrowdTangle shutdown 2024; Dataminr's X data partnership status |
| `web_scrape`, `web_hiddenapi`, `g_cfaa`, `g_contract`, `a_scrapeinfra` | Meta v. Bright Data (Jan 2024) and X Corp v. Bright Data (May 2024) outcomes; hiQ v. LinkedIn procedural history |
| `rec_courts` | PACER $0.10/page fee and quarterly waiver threshold |
| `rec_customs` | CBP AMS manifest confidentiality mechanism and which vendors redistribute |
| `rec_bulk` | Current name and format of Companies House bulk products |
| `net_zones` | RDAP replacing WHOIS as the required gTLD protocol (January 2025); CZDS access terms |
| `net_pdns`, `a_pdns` | DomainTools' 2021 acquisition of Farsight Security |
| `net_probe` | JARM origin and maintainer |
| `net_telescope` | UCSD/CAIDA telescope address-space size |
| `net_sinkhole`, `net_honeypot` | Named historical botnet takedowns and who led them |
| `sen_satrx` | Spire's 2021 acquisition of exactEarth |
| `sen_eo`, `sen_rf`, `g_remote` | NOAA 15 CFR Part 960 licensing reform (2020) and its application to RF systems |
| `crowd_feeders` | ADS-B Exchange's 2023 sale; adsb.lol and airplanes.live as alternatives |
| `crowd_mapping` | Meta's 2020 acquisition of Mapillary |
| `crowd_contacts` | Hiya's contact-book collection (evidence: inferred) |
| `emb_*`, `g_ftc`, `a_location` | FTC orders: Kochava (litigated), X-Mode/Outlogic, InMarket, Gravy Analytics/Venntel, Mobilewalla (2024); Avast/Jumpshot 2024 order ($16.5m) |
| `emb_telco` | FCC carrier location-data fines (2024) |
| `emb_iot` | GM/OnStar Smart Driver sharing with LexisNexis; FTC proposed order January 2025 |
| `com_mna`, `a_cti` | Mastercard–Recorded Future (closed December 2024); Equifax–Kount (2021); Google Threat Intelligence branding |
| `g_bulkdata` | PADFA (2024) and DOJ bulk sensitive-data rule effective dates (2025) |
| `g_usprivacy` | California Delete Act DROP platform rollout |
| `g_gdpr` | Clearview AI fines (CNIL, Garante, Greece, Netherlands); UK ICO appeal; Meta EU AI-training opt-out |
| `g_copyright`, `ai_books`, `a_llm` | Bartz v. Anthropic ruling and $1.5B settlement (2025); Kadrey v. Meta ruling (June 2025); Thomson Reuters v. Ross (Feb 2025); NYT v. OpenAI (pending) |
| `g_aiact`, `ai_rights` | GPAI obligations and application dates; training-content summary template; AI-preference opt-out standards |
| `g_robots`, `ai_crawl` | Cloudflare pay-per-crawl (2025); AI crawler user-agent tokens and IP-range publication |
| `ai_license`, `a_ailicense` | Reddit–Google, News Corp, Axel Springer, AP and Shutterstock licensing deals; Getty v. Stability AI |
| `ai_multimodal` | LAION-5B CSAM finding (December 2023) and re-release |
| `ai_synthetic` | OpenAI–DeepSeek distillation dispute |
| `ai_annotation`, `ai_expert` | Rater and expert pay ranges (estimates) |
| `a_posttrain` | Meta's 2025 stake in Scale AI |
| `a_face` | Clearview AI fines and restrictions by jurisdiction |
| `a_webintel` | BuzzFeed News 2020 report on Sensor Tower-owned VPN and ad-blocking apps |
| `hum_expert` | Expert-network insider-trading cases (Primary Global Research, Martoma / SAC Capital) |
| all files | Every `~ … (estimate)` cost figure |

## Known gaps

- **Western and US-heavy.** Records, law and vendors skew US/UK/EU; Chinese, Russian, Indian and Latin American data markets are thin.
- **Undisclosed sourcing.** Many vendors don't say how they acquire data. Recipes describe archetypes, and vendor-level attribution is limited to what the evidence supports.
- **Ratings are editorial** and coarse (1–3); treat the Economics view as orientation, not measurement.
- **Archetype coverage.** Some markets are folded into broader archetypes rather than modelled separately, e.g. weather and environmental data, financial alternative data beyond web/app intelligence, and healthcare data.
