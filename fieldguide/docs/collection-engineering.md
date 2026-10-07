# Collection engineering: scraping, reversing and APIs

A primer on the part of OSINT that is more engineering than searching: getting structured data out of websites and apps when there is no convenient official feed. It complements the **Collection engineering** category in the app. Every entity named here has an ID you can search for or deep-link (`index.html#view=catalog&node=k_mobilere`), and those entities carry practitioner notes in their detail panel.

This document explains how the techniques work and where the legal lines fall. It is not a bypass manual: the specifics of defeating any particular platform's protections go stale within months and carry legal risk that depends on jurisdiction and purpose.

## Why look beyond HTML scraping

Every modern website and app is a thin client over an API. The rendered page is the **least** information-dense view of that data:

- **API responses carry more than the UI shows:** internal numeric IDs, exact creation timestamps (not "3 days ago"), coordinates, counts, moderation flags, linked account IDs.
- **APIs are more stable than markup.** Front-end redesigns break HTML parsers weekly; API contracts change far less often because the platform's own apps depend on them.
- **Pagination is explicit.** Cursors and page sizes replace scrolling simulation.
- **Mobile apps often talk to older, more permissive APIs** than the website, because the client is assumed to be trusted.

The cost is that you are now depending on an interface the operator never promised you, and the further you go from "what a logged-out browser sees", the more legal exposure you take on.

## The access ladder

Collection methods ordered by technical effort and, roughly, by legal exposure. Climb only as far as the requirement needs.

| Rung | Method | App entities | Typical exposure |
|---|---|---|---|
| 1 | **Official APIs and researcher access programs** | `r_api`, `g_dsa`, `p_metacl`, `p_xapi` | Lowest. Contractual terms apply. |
| 2 | **Structured data the page already ships**: JSON-LD, framework hydration state, RSS, sitemaps | `k_scraping` (notes) | Low. Same as viewing the page. |
| 3 | **Rendered-page scraping** with crawlers or headless browsers | `k_scraping`, `t_scrapy`, `p_zyte`, `p_apify` | Low to moderate. Scales with volume, personal data and terms of service. |
| 4 | **Hidden web APIs (unauthenticated)**: the XHR/GraphQL calls the page makes, found via DevTools or the JS bundle | `k_apidisc`, `k_graphql`, `k_jsanalysis`, `t_devtools`, `t_graphql` | Moderate. Usually treated like viewing the page; rate and terms matter. |
| 5 | **Mobile app APIs** found by reversing the app and intercepting its traffic | `k_mobilere`, `k_mitm`, `t_jadx`, `t_frida`, `t_mitmproxy`, `t_mobsf`, `t_emu` | Elevated. EULAs ban reverse engineering; bypassing pinning may be circumvention. |
| 6 | **Authenticated private APIs**: replicating login, tokens and request signatures, or using community private-API libraries | `k_apireplay`, `k_privateclients`, `t_privlibs`, `t_postman` | High. Account-bound, under accepted terms, against an interface reserved for the official client. |
| ✕ | **Authorization flaws and exposed secrets**: enumerating other users' records, using leaked keys, reading misconfigured databases, active fuzzing outside a scoped engagement | `k_apiexploit`, `k_secrets`, `k_apienum`, `t_apifuzz` | **Intrusion territory.** Stop, document minimally, disclose (`g_disclosure`). |

Two cross-cutting concerns apply at every rung:

- **Anti-bot defenses** (`k_antibot`, `r_antibot`, `t_impersonate`, `t_stealth`, `p_brightdata`) decide whether collection works at all. Deliberately defeating them also weakens any "public data" argument.
- **Preservation** (`k_capture`): keep raw requests and responses (HAR files, hashes, timestamps) so collected API data can be reproduced and defended as evidence.

## Hidden web APIs (rung 4)

The highest-value, lowest-risk step up from scraping.

1. **Find the data call.** Open DevTools → Network, filter to Fetch/XHR, perform the action in the UI (scroll, search, open a profile), and find the response containing the data. GraphQL usually shows up as POSTs to a single `/graphql` endpoint, differing only by operation name or query hash.
2. **Minimize the request.** Copy it as cURL and remove headers and parameters one at a time until it breaks. What remains is the real contract: usually a few headers, sometimes a guest token or CSRF cookie.
3. **Understand pagination and limits.** Identify the cursor, page size and any undocumented filters. Responses often include fields the UI doesn't render.
4. **Read the client code.** JS bundles and exposed source maps list every route the front end knows, including ones you haven't triggered (`k_jsanalysis`). For GraphQL, introspection or captured persisted-query IDs map the schema (`k_graphql`).
5. **Engineer for drift.** Hidden APIs change silently. Validate response schemas and alert on missing fields rather than collecting nulls.

## Mobile app APIs (rung 5)

Used when the data or endpoint exists only in the app, or the app's API is richer than the web's.

1. **Static analysis** (`k_mobilere`). Decompile the APK (Android decompiles to fairly readable Java/Kotlin). Start with the manifest, network-security config, string resources and the list of bundled SDKs. Hosts, endpoint paths, auth schemes and third-party data flows usually surface quickly. iOS App Store binaries are encrypted and native, so they need decryption on a jailbroken device and a disassembler.
2. **Dynamic interception** (`k_mitm`). Run the app on a dedicated emulator or test phone with a throwaway account, route traffic through an intercepting proxy, and watch real requests. Since Android 7, apps ignore user-installed CAs by default, so interception typically needs a system-level CA on a rooted test device. Certificate pinning and root detection are defeated by runtime instrumentation rather than by editing the app.
3. **Expect non-HTTP traffic.** gRPC/protobuf, WebSockets, MQTT and custom binary protocols need schema recovery, either from the decompiled code or from observed messages.
4. **Request signing** (`k_apireplay`). Many apps sign requests with an HMAC over path, body and timestamp using an app-derived key, and some add device-attestation tokens (Play Integrity, App Attest). Signing can often be reproduced once the routine is found; attestation is designed not to be (`r_attest`), and where it's enforced the practical route is automating the genuine app on real hardware.
5. **Attribution as a by-product** (`k_appattrib`). Signing-certificate fingerprints, developer accounts, SDK keys and backend hosts link apps to operators and to each other, and feed straight into infrastructure pivots. This is often the most valuable OSINT output of app analysis, and it is entirely passive.

## Where OSINT ends

The useful test is **authorization**, not technique. The same proxy that shows you your own feed can be used to pull a stranger's private data.

You have probably crossed from collection into intrusion if any of these is true:

- You are retrieving records about **other users that the platform doesn't intend you to see**, e.g. by incrementing IDs (BOLA/IDOR, `k_apiexploit`, `g_owaspapi`).
- You are **using credentials or keys you weren't issued**: leaked API keys, tokens from a breach or stealer log, someone else's session (`k_secrets`).
- You are reading a **misconfigured database or bucket** to get its contents rather than noting that it exists.
- You are **actively fuzzing** a host for routes or parameters without a scoped authorization (`k_apienum`).
- You **had to defeat a login or access-control mechanism**, as opposed to a rate limit or bot heuristic, to get the data.

Regulators treat mass enumeration as a breach even when every individual field was "public": the Irish DPC fined Meta €265m in 2022 over a dataset scraped through a contact-lookup feature. The right response to finding such a flaw is coordinated disclosure (`g_disclosure`). The US DOJ's 2022 CFAA charging policy declines to prosecute good-faith security research, but that is prosecutorial discretion, not a legal safe harbor, and it doesn't cover harvesting the data.

## Legal reference points

These are reference points, not legal advice. Get counsel for anything at rung 5 or above.

| Topic | Reference | App entity |
|---|---|---|
| Unauthorized access | CFAA (Van Buren 2021 narrowed "exceeds authorized access"); UK Computer Misuse Act | `g_cfaa` |
| Scraping public data | hiQ v. LinkedIn; Meta v. Bright Data (summary judgment for Bright Data, Jan 2024); X v. Bright Data (largely dismissed May 2024, partly revived, settled 2025) | `g_cfaa`, `p_brightdata` |
| Reverse engineering and circumvention | DMCA §1201 and its security-research exemptions; EU software decompilation limited to interoperability; EULA bans | `g_dmca` |
| Personal data | GDPR/UK GDPR apply to public personal data; minimization and lawful basis | `g_gdpr` |
| Crawl etiquette | robots.txt (RFC 9309) is not access control but affects good-faith standing | `g_robots` |
| Facial data | EU AI Act bans untargeted facial-image scraping for recognition databases | `g_aiact` |
| Methodology references | OWASP MASTG/MASVS (mobile), OWASP API Security Top 10 (API flaws) | `g_mastg`, `g_owaspapi` |

## Operational hygiene

- **Isolate:** dedicated emulators and test devices (`t_emu`), investigation VMs (`t_vm`), and research personas that are never linked to personal accounts.
- **Throttle:** slow, cached, incremental collection is the cheapest way past anti-bot systems and the easiest to defend.
- **Log everything:** raw requests, raw responses, tool versions and timestamps. API data without provenance is weak evidence.
- **Expect breakage:** private-API libraries and hidden endpoints fail without warning. Pin versions and validate output against the live UI.
- **Watch for poisoning:** some anti-bot systems serve plausible fake data instead of blocking. Spot-check samples manually.
