# Maintenance

## Verification after editing

There is no test suite. The catalogue is data and the page is the test. After any edit:

1. Reload `index.html` with the browser devtools console open.
2. **Console has no warnings.** `Unresolved relations:` means a relation names an ID that doesn't exist. `Duplicate id` means two rows share an ID: both render, but every relation naming that ID (and deep links to it) resolves to the later row.
3. In the console, run `window.__fieldguide`. `missing` must be `[]`. `nodes` and `links` should change by what you expect.
4. Header counter reads `N of N entities` with all filters reset.
5. **Ecosystem map:** clusters don't overlap, and the new entity sits in its layer's cluster. Hover shows its connections.
6. **Catalog:** the entity appears under the intended category, with the correct badge. Entities with notes show "N practitioner notes" and list them in the detail panel.
7. **Workflow:** if you set a stage on a technique, tool or governance entity, it appears in that column.
8. **Source × technique:** if you touched source↔technique relations, the cells and provider bars match.
9. Open `index.html#view=catalog&node=<new id>`. It should load with the detail panel open on that entity.

Update the counts in `README.md` ("What's in it") and add a `CHANGELOG.md` entry when the catalogue changes.

## Curation rules

- **Inclusion:** an entity earns a row if a practitioner would plausibly reach for it, or needs to know it exists, for open-source collection or analysis. Prefer well-established names over long tails; directories like OSINT Framework already cover the long tail.
- **Neutral descriptions:** what it is and what it's for. No marketing language and no rankings. Mention legal or ethical sensitivity in the description where it materially affects use (breach data, face search, ad-tech location data, people-search).
- **No personal data:** describe services and categories; never include example identities, handles or records.
- **Confident facts only:** ownership, dates and policy changes go in only when they're well established. When in doubt, describe the capability and leave the corporate history out. URLs only for official sites you're sure of.
- **Relations are claims too:** link only where the relationship is substantive (the provider actually covers that source; the tool actually implements that technique).
- **Practitioner notes stay generic:** explain how a technique works, what signals to look for, common pitfalls and the legal exposure. Don't write platform-specific bypass recipes (exact endpoints, keys, signing secrets, current evasion settings); they go stale within months and turn a reference into an operational playbook. Every note that crosses into restricted territory names the legal line.
- **Keep the ladder honest:** techniques that amount to unauthorized access (`k_apiexploit`, using keys found by `k_secrets`) are catalogued so practitioners recognize the boundary. Their descriptions and notes must say so, and they sit in the Workflow view's cross-cutting legal row or carry disclosure guidance.

## Time-sensitive claims

These statements in `src/data.js` reflect the landscape as of October 2026 and are the most likely to go stale. Re-check them when refreshing the catalogue.

| ID | Claim |
|---|---|
| `p_rf` | Recorded Future acquired by Mastercard (2024) |
| `p_flashpoint` | Flashpoint absorbed Echosec |
| `p_msti` | Microsoft Defender TI built on the RiskIQ acquisition |
| `p_vt` | VirusTotal is Google-owned |
| `p_domaintools` | DomainTools offers Farsight DNSDB |
| `p_orbis`, `p_worldcheck` | Moody's / Bureau van Dijk Orbis; LSEG World-Check |
| `p_metacl` | Meta Content Library succeeded CrowdTangle, which shut down in August 2024 |
| `p_xapi`, `r_api` | X API moved to paid tiers in 2023; Reddit API pricing change in 2023 |
| `p_adsbx` | ADS-B Exchange sold in 2023; adsb.lol and airplanes.live as community alternatives |
| `p_clearview` | Fined by several European data-protection authorities |
| `p_maxar` | Brand name; Maxar's corporate structure has been changing |
| `t_spiderfoot` | 200+ modules |
| `r_whois` | ICANN replaced WHOIS with RDAP as the required gTLD lookup protocol in January 2025 |
| `g_aiact` | EU AI Act prohibits untargeted facial-image scraping for facial-recognition databases |
| `g_dsa` | DSA Art. 40 vetted-researcher data access |
| `g_ic`, `r_gov` | ODNI/CIA IC OSINT Strategy 2024–2026 and 2024 CAI policy framework |
| `g_cfaa` | Van Buren, hiQ v. LinkedIn, Meta and X v. Bright Data as the reference cases |
| `p_brightdata` | Won 2024 rulings against Meta and X over scraping logged-out public data |
| `p_zyte` | Formerly Scrapinghub; maintains Scrapy |
| `k_apiexploit` | Irish DPC €265m fine on Meta (2022) over scraped user data |
| `g_disclosure` | US DOJ 2022 CFAA charging policy on good-faith security research |
| `g_robots`, `g_owaspapi` | RFC 9309 (2022); BOLA ranked first in OWASP API Security Top 10 2023 |
| `k_mitm` | Android 7+ apps ignore user-installed CAs unless they opt in |
| `k_mobilere` | App Store binaries are encrypted until decrypted on a jailbroken device |
| `r_attest`, `k_apireplay` | Play Integrity and App Attest as the current attestation APIs |

## Known gaps

- **Western/English-leaning.** Providers and registries skew US/UK/EU. Regional registries, Chinese/Russian-language platforms and regional providers are thin.
- **Sparse sources.** Some sources have few or no linked providers: `s_jobs` has 0; `s_video` and `s_code` have 1. The matrix's provider bars show this directly.
- **Discipline and use-case relations are coarse.** They link to representative sources and techniques, not exhaustive ones.
- **Layout is tuned for the current size.** Adding many entities to one layer may need the force constants retuned (see [architecture.md](architecture.md#layout)).
