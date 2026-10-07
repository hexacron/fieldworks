"use strict";
/* Human collection methods (family: human) and the full legal/regulatory rule registry (G()). */

M({
  id: "hum_analyst",
  family: "human",
  name: "Analyst research & curation",
  summary: "Trained analysts manually research, verify and structure information from primary and secondary sources to produce curated, source-graded datasets and finished intelligence.",
  origins: ["o_media", "o_gov", "o_commerce"],
  ratings: {cost:3, scale:1, freshness:2, moat:3, legal:1},
  steps: [
    "Write a sourcing and style guide that ranks source tiers (primary document, named official, press with named sourcing, anonymous/unverified) and sets a minimum tier for each claim type before any analyst touches a record.",
    "Hire analysts for subject-matter and language coverage, not generalist research skill alone; a sanctions or corporate-ownership desk needs company-registry literacy and the target languages, not just English search skill.",
    "Build a case-management queue (ticketing system or custom CMS) that assigns research tasks, tracks source status and prevents two analysts silently duplicating the same entity.",
    "Require every factual claim to carry a citation to a retrievable source (URL, document ID, archive snapshot) stored alongside the record, not just in the analyst's head.",
    "Run a two-source rule for contested or high-impact facts (sanctions status, beneficial ownership, adverse media) and route single-source claims to a senior reviewer before publication.",
    "Schedule re-review cadences by entity risk tier, for example monthly for sanctioned entities and annually for low-risk corporate records, so curated data doesn't silently go stale.",
    "Version every record (who changed what, when, citing what source) so clients can audit why a score or status changed.",
    "Build a taxonomy guide (entity types, relationship types, confidence levels) and train new analysts against the completed cases of senior analysts before they go live on the queue.",
    "Run inter-analyst QA samples: have a second analyst blind-review a percentage of closed cases and track disagreement rate as a quality metric.",
    "Set escalation paths for legal-sensitive findings (defamation risk, sanctions false positives) to a compliance or editorial reviewer before publication."
  ],
  tools: ["Custom CMS or ticketing system (Jira, ServiceNow, in-house tools)", "Source-tiering and style guide documents", "Entity-resolution/graph database for linking records (Neo4j, Palantir)", "Archival/snapshot tools for citation permanence", "Translation tools for non-English sourcing", "Version-control or audit-log layer on the record store"],
  economics: [
    "Cost driver is headcount: experienced sanctions and corporate analysts in the US/UK/EU run roughly ~$60k-150k/yr loaded cost (estimate); offshore research hubs lower this materially.",
    "Scale is bounded by hiring and training time, not infrastructure, so growth is linear with headcount rather than elastic like automated collection.",
    "Monetized as subscription platforms (World-Check, Orbis-style) or per-report sales; the curated dataset itself, not raw access, is the product.",
    "Moat comes from accumulated entity history, source-tiering judgment calls and institutional taxonomy, which a competitor cannot scrape or buy.",
    "Build-vs-buy: most providers build in-house because the taxonomy and quality bar are the product; white-label curation shops exist for narrow verticals."
  ],
  pitfalls: [
    "Single-analyst bias on contested entities (e.g. PEP status) without a second reviewer.",
    "Source rot: citations to pages that later change or disappear without an archived snapshot.",
    "Taxonomy drift as the entity schema grows ad hoc instead of through a governed change process.",
    "Backlog pressure pushing analysts to skip the two-source rule on deadline."
  ],
  defenses: [
    "Subjects dispute adverse-media or PEP classifications through right-of-reply and correction requests, forcing re-review.",
    "Data-protection rectification and erasure requests can force removal or correction of curated records about identifiable individuals.",
    "Primary-source gatekeepers (registries, courts) can restrict bulk or repeated lookups that feed analyst research, slowing the pipeline."
  ],
  legal: [
    "Defamation exposure for adverse-media and sanctions-adjacent records if a two-source or right-of-reply process isn't followed.",
    "GDPR Art. 14 notice and Art. 16/17 rectification/erasure rights apply when curated records are about identifiable EU individuals; see g_gdpr.",
    "FCRA permissible-purpose limits apply if curated records are used for credit, employment or tenant-screening decisions; see g_fcra."
  ],
  rules: ["g_gdpr", "g_fcra", "g_usprivacy"],
  vendors: [
    {name:"Moody's Orbis (Bureau van Dijk)", note:"Corporate-ownership data built on large analyst research and verification teams alongside registry feeds.", evidence:"reported"},
    {name:"LSEG World-Check", note:"PEP and sanctions risk database built by analyst teams curating adverse media and official sources.", evidence:"public"},
    {name:"Jane's", note:"Defense and security analyst desks producing curated assessments from primary and open sources.", evidence:"public"}
  ],
  fieldguide: ["k_sat", "k_report"]
});

M({
  id: "hum_coding",
  family: "human",
  name: "Event coding & structured annotation",
  summary: "Trained coders convert unstructured reports (news, local sources, official statements) into structured event records using a fixed codebook, enabling systematic datasets like conflict or protest event data.",
  origins: ["o_media", "o_people"],
  ratings: {cost:2, scale:2, freshness:2, moat:3, legal:1},
  steps: [
    "Write a codebook that defines every event type, actor category, sub-event, fatality-counting rule and geoprecision level before coding begins; ACLED's public codebook is the reference model for conflict-event coding.",
    "Curate a source list per country or region (local newspapers, radio transcripts, government statements, verified social media, partner-organization reports) and rank source reliability.",
    "Recruit coders with the target region's language and context knowledge; pair each region with at least one native-language coder rather than relying on machine translation alone.",
    "Build or license a coding interface that forces structured fields (date, actor1, actor2, event type, location, fatalities, source) rather than free text, to keep output machine-readable.",
    "Run double-coding on a sample of events, commonly 10-20%, and compute inter-coder reliability (Cohen's kappa or percent agreement) per field; results below a set threshold trigger codebook clarification, not silent correction.",
    "Define a disambiguation and deduplication workflow for the same event reported by multiple sources with conflicting details, documented per rule rather than left to individual judgment.",
    "Geocode events to the finest confirmable precision (point, town, admin-2) using gazetteers, and flag lower-precision events rather than guessing coordinates.",
    "Set a weekly or faster publication cadence with a hard cutoff, and a documented revision process for corrections discovered after publication.",
    "Retrain coders on codebook changes with a calibration batch before they resume live coding, and track each coder's individual agreement-with-consensus rate over time.",
    "Spot-audit a published sample against primary sources quarterly to catch systemic coder drift the inter-coder metric alone wouldn't surface."
  ],
  tools: ["Structured coding interface/CMS", "Codebook and taxonomy documents (actor, event-type, sub-event typologies)", "Translation and transcription tools for non-English sources", "Geocoding gazetteers (GeoNames, OSM Nominatim)", "Inter-coder reliability calculators (Cohen's/Krippendorff's)", "Source-monitoring dashboards for local media"],
  economics: [
    "Cost driver is coder headcount and training time, not infrastructure; coders are often part-time or contract and paid per coded batch or hourly.",
    "Costs scale with the number of source languages and country desks covered, since each needs its own source list and language-qualified coders.",
    "Monetized via subscription data licenses, academic or nonprofit grants, or bundled into a broader analytics platform feeding risk scores or dashboards.",
    "Moat is the codebook plus multi-year back-coded history and coder institutional memory; a competitor can copy the taxonomy but not the historical consistency.",
    "Build-vs-buy: most risk and academic users license existing event datasets (ACLED, UCDP) rather than building a coding operation, since the moat is specifically hard to replicate quickly."
  ],
  pitfalls: [
    "Reporting bias: areas with better media coverage appear to have more events even if the true rate is similar elsewhere.",
    "Codebook ambiguity on edge cases causing silent inconsistency across coders.",
    "Translation loss changing actor names, casualty figures or event severity.",
    "Backfilling historical data from thin sourcing produces false precision in confidence scores."
  ],
  defenses: [
    "Non-state and state actors deny access to conflict zones, restricting the primary and local-media sourcing the method depends on.",
    "Governments and platforms throttle or ban access to local media sites and social accounts coders monitor, especially during active conflict.",
    "Disinformation and staged reports pollute the source pool and require cross-source corroboration to filter."
  ],
  legal: [
    "Codebook-derived datasets about identifiable individuals (named combatants, victims) can trigger GDPR obligations if EU-linked; see g_gdpr.",
    "Licensing terms on the event dataset itself (redistribution, commercial-use restrictions) fall under g_provenance for downstream users.",
    "Scraping or automated monitoring of source media feeding the codebook falls under g_contract for the underlying collection method, not the coding step itself."
  ],
  rules: ["g_gdpr", "g_provenance", "g_contract"],
  vendors: [
    {name:"ACLED", note:"Publishes its conflict-event coding methodology and codebook publicly.", evidence:"public"},
    {name:"Uppsala Conflict Data Program (UCDP)", note:"Academic conflict-event dataset with a published coding methodology.", evidence:"public"}
  ],
  fieldguide: ["p_acled"]
});

M({
  id: "hum_stringers",
  family: "human",
  name: "Stringer & local-researcher networks",
  summary: "Paid local freelancers embedded in a region supply on-the-ground reporting, document retrieval and verification that remote researchers cannot do, feeding wire services, risk firms and investigative outlets.",
  origins: ["o_people", "o_media"],
  ratings: {cost:2, scale:1, freshness:2, moat:3, legal:2},
  steps: [
    "Recruit stringers through existing journalist networks, local press associations, NGO partners or referrals from current stringers, prioritizing language, regional access and an existing reputation for accuracy.",
    "Vet each stringer with background and reference checks and a conflict-of-interest declaration (political affiliations, government employment, PR work) before assignment.",
    "Set a written scope of work and standing instructions covering what to source (document photography, interviews, site visits), safety limits, and what not to do, including no payment for access and no impersonation.",
    "Choose a payment model: per-piece/per-task rates for episodic work, or a modest monthly retainer plus per-task bonuses for stringers in strategically important locations; pay promptly to retain reliable stringers.",
    "Establish secure, low-bandwidth communication channels that work on the stringer's available connectivity, and a check-in cadence appropriate to the risk environment.",
    "Build a duress and safety protocol: a code word or signal for 'I am compromised', an emergency contact and extraction or legal-support plan, and insurance coverage where the stringer operates in a conflict or high-risk area.",
    "Route stringer output through a verification step by a staff editor or analyst before it enters the product: cross-check documents, corroborate claims, confirm the identity of the stringer's own sources.",
    "Track each stringer's accuracy and reliability over time (confirmed vs. retracted items) and adjust assignment trust and rates accordingly.",
    "Provide basic tradecraft training (secure communications, source protection, chain-of-custody documentation for retrieved documents) before first field assignment.",
    "Maintain legal indemnification and, where feasible, press-credential or NGO-affiliation support that gives the stringer a recognized status in-country."
  ],
  tools: ["Signal/encrypted messaging for field comms", "Task/assignment ticketing system", "Secure document transfer (encrypted upload, dead-drop style)", "Translation and transcription services", "Local fixer/press-association networks for recruitment", "Insurance and duty-of-care providers for high-risk postings"],
  economics: [
    "Cost driver is per-task or retainer payment plus duty-of-care overhead (insurance, security training, emergency support), which rises sharply in conflict or authoritarian environments.",
    "Per-piece rates vary widely by region and risk, roughly ~$50-500/item (estimate) for routine reporting tasks, well above that for high-risk assignments.",
    "Scale is capped by recruitment and vetting bandwidth, not budget; a reliable stringer network takes years to build and cannot be instantly expanded.",
    "Monetized indirectly: stringer output feeds wire copy, risk reports or investigative stories sold via subscription or syndication, not sold as raw stringer access.",
    "Moat is the relationship and trust network itself, plus accumulated local verification capability, which is specifically hard for a new entrant to replicate quickly."
  ],
  pitfalls: [
    "Single point of failure: losing one stringer can eliminate coverage of an entire region or beat with no quick replacement.",
    "Local political or commercial pressure on stringers can bias reporting without an outsider noticing.",
    "Inadequate duty-of-care in high-risk postings creates both an ethical failure and a continuity risk if a stringer is detained or harmed.",
    "Verification gaps when editors trust a long-tenured stringer's claims without the same corroboration bar applied to new sources."
  ],
  defenses: [
    "Authoritarian governments monitor, intimidate, detain or expel local stringers working for foreign outlets, directly limiting coverage.",
    "Local actors feed stringers disinformation or stage events, exploiting the trust relationship between stringer and editor.",
    "Access denial, such as visa refusal or checkpoint restrictions, blocks stringers from reaching sites of interest."
  ],
  legal: [
    "Operating stringers in sanctioned jurisdictions or paying local fixers can raise sanctions-compliance questions; screen payments and locations against current sanctions lists.",
    "Stringers are typically engaged as independent contractors; worker-classification and local labor-law exposure varies by jurisdiction and needs local legal review.",
    "Field communications with stringers are subject to interception and communications-privacy law in both the stringer's and the organization's jurisdiction; see g_intercept."
  ],
  rules: ["g_gdpr", "g_intercept"],
  vendors: [
    {name:"OCCRP", note:"Operates a network of partner investigative journalists and local researchers across its member-center countries.", evidence:"public"},
    {name:"Associated Press / Reuters", note:"Wire services maintain paid local stringer networks for regional and conflict coverage.", evidence:"reported"}
  ],
  fieldguide: ["p_aleph"]
});

M({
  id: "hum_expert",
  family: "human",
  name: "Expert networks & surveys",
  summary: "Firms connect paying clients, mainly investors and consultancies, with subject-matter experts for paid one-on-one consultations and structured surveys, under compliance controls designed to prevent the exchange of material non-public information.",
  origins: ["o_people", "o_commerce"],
  ratings: {cost:3, scale:1, freshness:3, moat:3, legal:3},
  steps: [
    "Build an expert database by recruiting via LinkedIn outreach, referrals from existing experts and inbound applications, tagging each expert by employer, industry, role history and compliance status.",
    "Run a compliance screen on each expert before activation: confirm current employer, check the employer's moonlighting/expert-network policy where available, and record any standing restrictions such as board seats or employer competitors.",
    "Match client consultation requests to candidate experts by topic, then send each matched expert a compliance questionnaire asking about recent/current employer, confidentiality obligations and any known restricted-company ties before scheduling.",
    "Require the client, typically an investment fund, to run its own internal compliance check (restricted list, information-barrier review) before the call is confirmed, per its own MNPI policy.",
    "Open every call with a recorded compliance disclaimer stating the expert must not disclose confidential, proprietary or material non-public information, and that the client must stop the expert if such information arises.",
    "Record and retain call audio or transcripts, where consented and legally permitted, for a defined retention period to support compliance review and regulatory inquiries.",
    "For public companies and the healthcare/pharma sector, apply heightened screening, such as blocking current employees of the specific company a client is researching, given historical enforcement in this space.",
    "Design quantitative expert surveys with closed-ended, structured questions when the goal is panel data rather than a single consultation, and track panel composition for representativeness.",
    "Pay experts an hourly honorarium set by market rate for their seniority and specialty, invoiced through the network rather than directly between client and expert.",
    "Audit a sample of completed consultations post-hoc for compliance-flag triggers and escalate confirmed MNPI leaks to the firm's compliance officer and, where required, to the client."
  ],
  tools: ["Expert CRM/matching database", "Compliance questionnaire and e-signature workflow", "Call recording and transcription with retention policy", "Restricted-list/watchlist screening tools", "Survey platforms (Qualtrics-style) for panel surveys", "Audit/compliance case-management system"],
  economics: [
    "Cost driver is expert honoraria plus compliance headcount; expert hourly rates commonly range roughly ~$200-2,000+/hr (estimate) depending on seniority and scarcity of the expertise.",
    "Clients pay the network a markup or subscription on top of the expert honorarium, the network's core revenue.",
    "Scale is bounded by expert recruitment and compliance review capacity, not technology; adding coverage in a new industry means recruiting and vetting a new expert cohort.",
    "Moat is the depth and currency of the expert database plus the compliance infrastructure and reputation needed to operate with investment-fund clients.",
    "Build-vs-buy: buy-side firms almost always use an established network rather than building their own, because the compliance infrastructure and expert reach are the hard part."
  ],
  pitfalls: [
    "Compliance theater: a disclaimer read aloud does not substitute for employer pre-clearance and real-time call monitoring on high-risk topics.",
    "Expert database staleness causing mismatches between the compliance profile on file and the expert's actual current position.",
    "Survey panels skewing toward experts with time to spare rather than the most relevant practitioners.",
    "Client-side compliance gaps, such as no internal restricted-list check, that the network's own process cannot fully substitute for."
  ],
  defenses: [
    "Employers increasingly require employees to disclose or seek approval before joining expert networks, and some prohibit it outright for sensitive roles.",
    "Regulators and company compliance teams monitor expert-network participation by current and former employees as an insider-trading risk surface.",
    "Public companies issue blackout-period guidance to employees around earnings, specifically to reduce expert-network MNPI leakage."
  ],
  legal: [
    "US insider-trading law (Securities Exchange Act Section 10(b), Rule 10b-5) applies directly. The 2010s expert-network prosecutions, including Primary Global Research staff and the SAC Capital / Martoma case (2014), where tips came from a doctor consulting through an expert network, ended in convictions and reshaped industry compliance practice.",
    "SEC Regulation FD constrains what public-company personnel can selectively disclose to expert-network clients and participants.",
    "Employers' confidentiality and non-disclosure agreements bind experts independently of the network's own compliance process; see g_contract.",
    "GDPR and other data-protection law applies to the expert's own personal data held in the network's CRM; see g_gdpr."
  ],
  rules: ["g_gdpr", "g_contract"],
  vendors: [
    {name:"GLG (Gerson Lehrman Group)", note:"One of the largest expert-network platforms. A GLG consultation figured in the Martoma / SAC Capital insider-trading case (2014), one of the cases that reshaped expert-network compliance.", evidence:"reported"},
    {name:"AlphaSights", note:"Major expert-network platform connecting investors and consultancies to industry experts.", evidence:"public"},
    {name:"Guidepoint", note:"Expert-network platform with compliance-focused matching and call monitoring.", evidence:"public"}
  ]
});

M({
  id: "hum_tips",
  family: "human",
  name: "Tip lines, whistleblowers & leak intake",
  summary: "Organizations operate secure, often anonymous intake channels, such as SecureDrop-style dead drops, hotlines and whistleblower programs, so sources can submit documents or information with source-protection guarantees.",
  origins: ["o_people", "o_gov", "o_commerce"],
  ratings: {cost:2, scale:1, freshness:3, moat:2, legal:2},
  steps: [
    "Stand up a SecureDrop instance, or equivalent, as a Tor hidden service on dedicated, air-gapped hardware, following the Freedom of the Press Foundation's hardened installation guide rather than a generic server build.",
    "Publish the tip-line's existence, onion address and a plain-language explanation of source protections and limitations on the organization's main site and in relevant reporting.",
    "Generate a dedicated PGP keypair for submission encryption, publish the public key, and restrict private-key access to a small, named set of staff with documented access-control procedures.",
    "Set up a secondary, lower-security channel, such as encrypted email or a Signal number, for sources who won't use Tor, and document the materially weaker metadata protection each channel offers so intake staff can advise sources accurately.",
    "Define a triage workflow: a small team reviews new submissions on the air-gapped machine first, assesses metadata risk, and routes credible leads to the relevant desk without copying files onto networked machines prematurely.",
    "Build a verification pipeline for submitted documents, including authentication against known formatting, corroboration from a second source and forensic metadata review, before any claim derived from the tip is published or acted on.",
    "Get legal review on source-protection obligations and on handling documents that may themselves be stolen or classified, before publication; see g_stolen.",
    "For regulatory whistleblower programs, such as SEC, CFTC or False Claims Act qui tam intake, build a separate path that captures the information needed to preserve statutory award eligibility without compromising anonymity where the source wants it.",
    "Retain submissions and triage logs for a defined period under access controls, with a destruction/retention policy that doesn't create a discoverable record exposing source identity.",
    "Run periodic security review of the whole pipeline, including a penetration test of the intake system and a review of who holds decryption access, since a compromise here can expose every source who ever submitted."
  ],
  tools: ["SecureDrop (Freedom of the Press Foundation)", "Tor Browser / Tor hidden services", "GPG/PGP for submission encryption", "Signal for lower-friction source contact", "Document forensics/metadata-review tools", "Whistleblower case-management system for regulatory programs"],
  economics: [
    "Cost driver is secure infrastructure (dedicated hardware, Tor hidden-service hosting) plus staff time for triage and verification, not bulk data acquisition cost.",
    "SecureDrop itself is free and open-source; cost is mainly hardware and the ongoing staff time to monitor and triage it.",
    "Scale is inherently low volume by design: the value is a small number of high-credibility, high-impact tips, not throughput.",
    "Monetized indirectly through the stories, reports or enforcement actions the tips enable; for regulatory programs, the whistleblower's own statutory award share funds the incentive rather than the recipient.",
    "Moat is trust and a track record of protecting sources, which takes years to build and is destroyed instantly by a single exposure incident."
  ],
  pitfalls: [
    "Metadata leakage on lower-security channels exposing a source who believed they were anonymous.",
    "Hoax or bad-faith submissions consuming triage capacity; a documented verification bar is the only real defense.",
    "Over-retention of submission logs creating a discoverable record that undermines the source-protection promise.",
    "Staff turnover without documented access-control hygiene leaving stale decryption access on departed employees' devices."
  ],
  defenses: [
    "Organizations and governments monitor for leaks internally, including access logging and forensic watermarking, to identify the source after a leak surfaces.",
    "Legal process can compel a recipient organization to identify a source; jurisdiction-specific reporter's-privilege law determines how resistible this is.",
    "Technical compromise of the intake channel itself, such as server seizure or deanonymization, is the primary way source protection fails in practice."
  ],
  legal: [
    "Receiving documents a source obtained without authorization does not generally create criminal liability for the recipient simply for receiving and reporting on them in most democracies, but publishing or acting on stolen trade secrets or classified material carries separate legal risk; see g_stolen.",
    "Reporter's-privilege and shield-law protection against compelled source disclosure varies sharply by jurisdiction and does not reliably cover non-journalists or non-US recipients.",
    "SEC, CFTC and False Claims Act whistleblower programs have specific statutory requirements, including original information and timing rules, that must be followed for the source to preserve award eligibility.",
    "GDPR and similar law applies to any personal data about identifiable individuals contained in submitted documents; see g_gdpr."
  ],
  rules: ["g_stolen", "g_gdpr", "g_intercept"],
  vendors: [
    {name:"SecureDrop (Freedom of the Press Foundation)", note:"Open-source whistleblower submission system used by major newsrooms and NGOs for anonymous tip intake.", evidence:"public"},
    {name:"NAVEX Global (EthicsPoint)", note:"Corporate compliance and whistleblower hotline platform used widely for internal reporting programs.", evidence:"public"}
  ],
  fieldguide: ["p_icij"]
});

G({
  id: "g_gdpr",
  name: "GDPR & UK GDPR (lawful basis, Art. 14 notice, scraping guidance)",
  jurisdiction: "EU / UK",
  summary: "EU and UK data-protection law requiring a lawful basis for processing personal data, notice to individuals even when data wasn't collected directly from them, and honoring access, rectification, erasure and objection rights. It applies to essentially any method that collects, licenses or curates data about identifiable people connected to the EU or UK, regardless of where the collecting company is based.",
  points: [
    "Lawful basis (GDPR Art. 6) is required for any processing of personal data about an identifiable EU/UK individual; legitimate interest is the usual basis for scraping or brokering public data but requires a documented balancing test weighed against the individual's expectations.",
    "Art. 14 requires notifying individuals when data is collected about them from a source other than themselves, within one month, unless a disproportionate-effort exemption applies; most bulk-scraping and data-broker operations rely on this exemption and should document why individual notice isn't feasible.",
    "Individuals have a right to erasure (Art. 17), rectification (Art. 16) and to object to processing (Art. 21), including profiling; data-broker and curated-dataset operators need a working intake process to honor these requests across every downstream copy, not just the primary database.",
    "Special-category data (Art. 9: health, biometric, political opinions, sexual orientation) needs an explicit additional condition beyond ordinary lawful basis; bidstream, SDK and telemetry data frequently contain inferred special-category signals, such as health-app usage, that trigger this.",
    "France's CNIL and Italy's Garante (2022), followed by Greece and the Netherlands, fined Clearview AI millions of euros each for scraping facial images without a legal basis and ordered deletion of residents' data. This establishes that scraping publicly posted images is still GDPR-regulated processing. The UK ICO's 2022 fine was overturned on jurisdictional grounds in 2023, and the case went on to further appeal.",
    "EU regulators pushed Meta to pause and then restructure, with an opt-out mechanism, its plan to train AI models on EU users' public posts in 2024, illustrating that 'legitimate interest' for AI training on user content is contested and needs a real opt-out, not just a public-post rationale.",
    "Practical compliance: maintain a Records of Processing Activities (Art. 30) entry per method, run a Data Protection Impact Assessment before launching any new bulk personal-data collection method, and build erasure/rectification propagation into the data pipeline from day one rather than retrofitting it.",
    "UK GDPR mirrors the EU regime post-Brexit with largely equivalent obligations enforced by the ICO; treat the two as a single compliance programme with jurisdiction-specific notice templates."
  ],
  applies: ["web_crawl", "web_focused", "web_scrape", "web_hiddenapi", "web_mobileapi", "web_serp", "web_proxy", "web_archive", "net_pdns", "sen_capture", "crowd_mapping", "crowd_submissions", "crowd_contacts", "crowd_sharing", "emb_sdk", "emb_bidstream", "emb_panel", "emb_security", "emb_telco", "emb_iot", "rec_bulk", "rec_foia", "rec_courts", "com_license", "com_marketplace", "com_coop", "com_credit", "hum_analyst", "hum_coding", "hum_stringers", "hum_expert", "hum_tips", "ug_forums", "ug_dumps", "ug_stealer", "ug_humint", "ai_crawl", "ai_corpus", "ai_annotation", "ai_userdata", "ai_rights", "ai_multimodal", "ai_speech"]
});

G({
  id: "g_usprivacy",
  name: "US state privacy & data-broker laws (incl. California Delete Act, broker registries)",
  jurisdiction: "US (state)",
  summary: "A patchwork of US state comprehensive privacy laws, including California, Virginia and Colorado, plus dedicated data-broker registration statutes, including California's Delete Act creating a single consumer deletion portal across all registered brokers. Obligations center on consumer access, delete and opt-out rights and, for brokers specifically, public registration and reporting.",
  points: [
    "California (CCPA/CPRA), Virginia (VCDPA), Colorado (CPA) and a growing list of states grant consumers rights to access, delete and opt out of the sale/sharing of personal data, with broker-specific obligations layered on top in several states.",
    "California, Vermont, Oregon and Texas require data brokers to register annually with a state registry, California's with the California Privacy Protection Agency; operating an unregistered broker business in these states risks per-day penalties.",
    "California's Delete Act (SB 362, 2023) requires the CPPA to build a single deletion portal, the DROP system, so consumers can request deletion from every registered broker at once; registered brokers must process DROP deletion requests on the statutory timeline once the portal is live.",
    "State laws generally define 'sale' broadly enough to cover data-sharing arrangements beyond cash transactions, so bidstream and SDK data-sharing arrangements commonly qualify even without a traditional sale.",
    "Practical compliance: maintain a consumer-rights-request intake and fulfillment pipeline with state-specific timelines, register in every state with a broker registry before commencing operations there, and track which downstream licensees received data subject to a since-received deletion request.",
    "Sensitive-data categories, such as precise geolocation, health and immigration status, trigger opt-in consent requirements in several states rather than opt-out, which is stricter than the default sale/share framework."
  ],
  applies: ["web_scrape", "web_hiddenapi", "web_mobileapi", "crowd_contacts", "crowd_sharing", "emb_sdk", "emb_bidstream", "emb_panel", "emb_security", "emb_telco", "emb_iot", "rec_bulk", "rec_feeds", "com_license", "com_marketplace", "com_coop", "com_credit", "com_mna", "ai_userdata"]
});

G({
  id: "g_ftc",
  name: "FTC enforcement on data brokers & telemetry (Kochava, X-Mode, InMarket, Gravy/Mobilewalla, Avast)",
  jurisdiction: "US (federal)",
  summary: "FTC Act Section 5 unfair/deceptive-practices enforcement against data brokers and telemetry vendors that sell sensitive data, such as precise location, without adequate consent, evidenced by a run of 2022-2024 orders against location and telemetry brokers. These orders increasingly ban entire categories of sensitive-data sale rather than just requiring better disclosure.",
  points: [
    "The FTC treats sale of sensitive data, such as precise location tied to health clinics, places of worship or shelters, without adequate consent as an unfair practice under FTC Act Section 5, even absent a sale-specific statute.",
    "FTC v. Kochava (filed 2022, amended complaint 2023) alleged Kochava's location-data products could reveal visits to reproductive-health clinics, places of worship and addiction-treatment centers from a feed sold with inadequate anonymization.",
    "The FTC's 2024 order against X-Mode/Outlogic banned the sale of sensitive location data entirely and required deletion of historical sensitive data, the first order to flatly prohibit a category of data sale rather than just require consent.",
    "The 2024 FTC settlement with InMarket Media and the proposed order against Gravy Analytics/Venntel similarly restricted sale of precise and sensitive location data collected through SDKs embedded in third-party apps.",
    "The FTC's 2024 order against Avast ($16.5M) found that selling 'anonymized' browsing data collected by antivirus/VPN products, which could be re-identified, violated the company's own privacy promises to users.",
    "The FTC's 2024 Mobilewalla settlement restricted collection and sale of sensitive location and demographic data gathered via bidstream without adequate consent.",
    "Practical compliance: avoid selling or deriving sensitive inferences, such as health, religion, immigration or reproductive status, from location or telemetry data even when the underlying data is technically anonymized, and build consent flows that are specific about SDK-based third-party data sharing rather than buried in a general privacy policy."
  ],
  applies: ["emb_sdk", "emb_bidstream", "emb_panel", "emb_security", "emb_telco", "emb_iot", "com_license", "com_marketplace", "com_credit", "crowd_contacts", "ai_userdata"]
});

G({
  id: "g_bulkdata",
  name: "US bulk sensitive-data restrictions (PADFA 2024, DOJ rule 2025)",
  jurisdiction: "US (federal)",
  summary: "Two overlapping US regimes, PADFA and the Executive Order 14117-driven DOJ rule, restrict or prohibit transferring bulk sensitive personal data and government-related data to China, Russia and other listed countries of concern, whether by sale, licensing or structured business transaction. They target the data-broker and bulk-licensing supply chain specifically, not individual one-off transfers.",
  points: [
    "Executive Order 14117 (Feb 2024) directed DOJ to restrict bulk transactions involving Americans' sensitive personal data, including genomic, biometric, precise geolocation, health and financial data, and government-related data, with countries of concern: China, Russia, Iran, North Korea, Cuba and Venezuela.",
    "DOJ's implementing rule, effective 2025, prohibits or restricts data brokers and other companies from selling or transferring bulk sensitive data to covered persons/entities in those countries, with volume thresholds defining 'bulk' per data category.",
    "The Protecting Americans' Data from Foreign Adversaries Act (PADFA, enacted April 2024) separately bans data brokers from selling or licensing Americans' sensitive personal data, including precise location, health, biometric and financial data, to foreign adversary countries or entities they control.",
    "Both regimes cover not just direct sales but structured transactions, such as joint ventures and vendor or investment agreements, that give a covered entity access to bulk sensitive data, so downstream licensing terms in commercial data deals need a covered-persons screen.",
    "Practical compliance: screen buyers and licensees against the covered-persons/countries-of-concern list before any bulk sensitive-data transaction, build volume tracking per data category against the rule's bulk thresholds, and add contractual flow-down restrictions prohibiting re-transfer to covered entities."
  ],
  applies: ["com_license", "com_marketplace", "com_mna", "emb_sdk", "emb_bidstream", "emb_panel", "emb_telco", "emb_iot", "rec_bulk", "rec_feeds", "crowd_contacts", "ai_userdata"]
});

G({
  id: "g_fcra",
  name: "FCRA & permissible purpose",
  jurisdiction: "US (federal)",
  summary: "The Fair Credit Reporting Act restricts use of consumer-report data to permissible purposes, such as credit, employment and housing, and imposes accuracy and dispute obligations on anything that functions as a consumer report, regardless of how the provider labels itself. Liability turns on how a customer uses the data, so classification by end use is the central compliance task.",
  points: [
    "FCRA (15 U.S.C. §1681 et seq.) restricts use of 'consumer report' data to permissible purposes (credit, employment, insurance, tenant screening) and requires consumer-reporting agencies to follow accuracy and dispute procedures.",
    "A data broker or background-check product can become a 'consumer reporting agency' by function, regardless of self-description, once its data is used for an FCRA-covered eligibility decision; the determining factor is use, not the seller's label.",
    "TransUnion LLC v. Ramirez (2021), the Supreme Court held that FCRA plaintiffs must show concrete injury, not just a bare statutory violation, for Article III standing, limiting class-action damages to consumers whose inaccurate reports were actually disseminated to a third party.",
    "Credit-header data, such as name, address and SSN fragments from credit bureau files, sold to people-search and data-broker products sits in a regulatory gray zone; using it for an FCRA-covered purpose without FCRA-compliant process creates liability even when the broker isn't a traditional credit bureau.",
    "Practical compliance: classify every product by end use, not data type, and apply full FCRA process, including permissible-purpose certification, adverse-action notices and dispute handling, to any product a customer could plausibly use for credit, employment, housing or insurance eligibility decisions."
  ],
  applies: ["com_credit", "com_license", "com_marketplace", "rec_courts", "rec_bulk"]
});

G({
  id: "g_glba",
  name: "GLBA, DPPA & sector data rules",
  jurisdiction: "US (federal)",
  summary: "Gramm-Leach-Bliley privacy and security obligations for financial institutions, the Driver's Privacy Protection Act's restrictions on DMV record disclosure, and other sector-specific statutes layer permissible-use restrictions on top of general privacy law. Each sector, such as financial, motor-vehicle or insurance, has its own exceptions that courts tend to read narrowly.",
  points: [
    "GLBA requires financial institutions to give customers privacy notices and an opt-out before sharing nonpublic personal information with unaffiliated third parties, and its Safeguards Rule, amended 2021 with a June 2023 compliance deadline, imposes specific data-security program requirements.",
    "The Driver's Privacy Protection Act (DPPA, 1994) restricts disclosure of personal information in state DMV records to enumerated permissible uses, such as law enforcement, insurance and research with safeguards; bulk resale for marketing is not a permissible use.",
    "Maracich v. Spears (2013), the Supreme Court narrowly construed DPPA's litigation exception, holding that attorney solicitation of clients using DMV data did not qualify even when framed as litigation-related, signaling courts will read DPPA exceptions narrowly.",
    "Sector-specific records, such as insurance, healthcare and education under FERPA, carry their own disclosure restrictions layered on top of general privacy law; a bulk records or feeds operation spanning sectors needs a permissible-use screen per data type, not one blanket policy.",
    "Practical compliance: map every bulk/feed data source to its governing sector statute, certify and audit downstream licensees' stated permissible use before each DMV, financial or insurance-record transfer, and retain certification records for regulator audit."
  ],
  applies: ["com_credit", "com_license", "rec_bulk", "rec_feeds", "rec_physical"]
});

G({
  id: "g_cfaa",
  name: "Computer-misuse law & scraping case law",
  jurisdiction: "US / UK",
  summary: "US and UK computer-misuse law criminalizes access to a computer system without authorization or beyond authorized access, with scraping-specific case law establishing that collecting from logged-out public web pages generally falls outside the statute while circumventing a technical access barrier after an explicit revocation does not. The line runs through whether a technical gate was bypassed, not through purpose or volume.",
  points: [
    "CFAA (18 U.S.C. §1030) criminalizes accessing a computer 'without authorization' or 'exceeding authorized access'; the UK's Computer Misuse Act 1990 imposes a structurally similar unauthorized-access offense.",
    "Van Buren v. United States (2021), the Supreme Court adopted a narrow 'gates-up-or-down' reading: exceeding authorized access means entering parts of a system off-limits to you, not misusing access you're otherwise entitled to, rejecting purpose-based theories of CFAA liability.",
    "hiQ Labs v. LinkedIn (9th Cir. 2019, reaffirmed 2022 after Van Buren remand) held that scraping data from a publicly accessible website, where no login or password gate exists, doesn't violate the CFAA even after a cease-and-desist letter, because there's no technical access barrier.",
    "Facebook, Inc. v. Power Ventures, Inc. (9th Cir. 2016) reached a different outcome: continuing to access Facebook after an explicit cease-and-desist and circumventing an IP block was found to exceed authorized access, showing that a technical access barrier plus an individualized revocation changes the CFAA analysis versus hiQ's purely public-page facts.",
    "Active scanning and probing of systems you don't own risks unauthorized-access theories distinct from scraping case law; the practical shield is confining activity to passive observation of what a server voluntarily returns to any requester, not exploiting a vulnerability or bypassing a login.",
    "Practical compliance: confine automated collection to logged-out, publicly reachable pages; do not bypass CAPTCHAs, IP blocks or logins; stop and seek legal review if a target sends a cease-and-desist naming an access control rather than just a ToS objection; and keep scan targets to ranges where blanket authorization or an opt-out mechanism exists."
  ],
  applies: ["web_crawl", "web_focused", "web_scrape", "web_hiddenapi", "web_mobileapi", "web_serp", "web_proxy", "web_archive", "net_scan", "net_probe", "net_honeypot", "net_sandbox", "ai_crawl"]
});

G({
  id: "g_contract",
  name: "Terms of service & contract",
  jurisdiction: "US / EU (general)",
  summary: "Breach-of-contract claims based on a platform's terms of service require the collector to have actually agreed to those terms; recent rulings have rejected ToS claims against scrapers who never created an account or clicked to accept anything. Account-gated API and SDK access sits on much firmer contractual ground than logged-out scraping.",
  points: [
    "Most platforms' ToS prohibit automated access or scraping; breach-of-contract claims require the scraper to have agreed to the terms via clickwrap or account creation, and courts have been skeptical that a non-account-holder scraping public pages is bound by terms they never accepted.",
    "Meta Platforms, Inc. v. Bright Data Ltd. (N.D. Cal., Jan 2024): the court granted summary judgment largely in Bright Data's favor on Meta's breach-of-contract claims over scraping logged-out, public Facebook/Instagram pages, reasoning Bright Data hadn't agreed to Meta's terms by accessing public pages without an account.",
    "X Corp. v. Bright Data Ltd. (N.D. Cal., May 2024): the court dismissed most of X's claims on similar reasoning, with the court noting that using ToS to block scraping of logged-out public data raised public-interest concerns about data access for research and journalism.",
    "Browsewrap terms, such as buried links with no affirmative click, are less reliably enforceable than clickwrap terms with an explicit checkbox or button acceptance; account-gated APIs and SDKs where a developer agreement was affirmatively accepted are on much firmer contractual footing than open scraping of public pages.",
    "Practical compliance: for account-gated methods, keep records of the accepted agreement version and don't exceed the agreed scope; for logged-out public scraping, contract exposure is lower but doesn't eliminate CFAA, copyright or data-protection exposure covered under other rules."
  ],
  applies: ["web_crawl", "web_focused", "web_scrape", "web_hiddenapi", "web_mobileapi", "web_officialapi", "web_serp", "web_proxy", "web_archive", "crowd_submissions", "emb_sdk", "emb_panel", "ai_crawl", "ai_corpus"]
});

G({
  id: "g_copyright",
  name: "Copyright, database rights & TDM exceptions (incl. AI training cases)",
  jurisdiction: "US / EU",
  summary: "Copyright law, the EU's sui generis database right, and the EU's text-and-data-mining exceptions govern whether copying content for collection, curation or AI training infringes the rights of the content's creator or database compiler. A fast-moving set of 2025 US rulings has started to separate training on lawfully acquired copies, which can be fair use, from acquiring the copies by piracy, which is not.",
  points: [
    "In the US, fair use (17 U.S.C. §107) is a four-factor test; Authors Guild v. Google (2d Cir. 2015) found that full-text scanning of books to build a searchable index with snippet-view output was fair use, a foundational precedent for later AI-training fair-use arguments.",
    "Thomson Reuters v. Ross Intelligence (D. Del., Feb 2025): the court ruled that Ross's use of Westlaw headnotes to train a competing legal-research AI was not fair use, rejecting Ross's defense because the output was a market substitute for Westlaw's own product.",
    "Bartz v. Anthropic (N.D. Cal., 2025): the court ruled that training an LLM on legally acquired or scanned books is fair use, but that acquiring the training copies from pirated sources was not protected and exposed Anthropic to separate liability for the piracy itself; Anthropic agreed to a roughly $1.5 billion settlement, announced September 2025, with the author class over the pirated-acquisition claims.",
    "Kadrey v. Meta (N.D. Cal., June 2025): the court ruled Meta's use of the plaintiffs' books to train Llama was fair use on that specific record, but the judge explicitly cautioned the ruling didn't bless AI training on copyrighted books generally and flagged that a market-dilution theory could succeed for other plaintiffs with stronger evidence.",
    "The New York Times v. OpenAI and Microsoft (S.D.N.Y., filed Dec 2023) alleges copyright infringement from training on NYT articles and verbatim regurgitation of paywalled content; the case remains pending.",
    "In the EU, the Digital Single Market Directive (2019/790) Art. 3 gives research and cultural-heritage institutions a mandatory TDM exception, while Art. 4 gives a broader TDM exception for any purpose that rightsholders can opt out of via machine-readable rights reservation; the separate EU sui generis database right (Directive 96/9/EC) independently protects databases built with substantial investment against extraction of a substantial part, on top of any copyright in the contents.",
    "Practical compliance: track source licensing status per corpus segment, such as licensed, public-domain, opted-out or unknown-provenance; exclude pirated or shadow-library sources from training corpora regardless of the Anthropic ruling's narrow fair-use holding; and honor Art. 4(3) machine-readable opt-outs for any EU-sourced content."
  ],
  applies: ["web_crawl", "web_scrape", "web_archive", "rec_bulk", "rec_feeds", "com_license", "ai_crawl", "ai_corpus", "ai_license", "ai_books", "ai_code", "ai_multimodal", "ai_speech", "ai_synthetic"]
});

G({
  id: "g_aiact",
  name: "EU AI Act (GPAI training-data duties, facial-scraping ban)",
  jurisdiction: "EU",
  summary: "The EU AI Act imposes training-data transparency duties on general-purpose AI model providers and flatly prohibits untargeted internet or CCTV facial-image scraping to build facial-recognition databases. It layers AI-specific obligations on top of, and cross-references, the existing EU copyright TDM opt-out regime.",
  points: [
    "The EU AI Act (Regulation (EU) 2024/1689) entered into force in August 2024; Art. 5(1)(e) prohibits untargeted scraping of facial images from the internet or CCTV footage to build or expand a facial-recognition database, a provision aimed squarely at Clearview AI-style collection.",
    "GPAI (general-purpose AI model) providers must maintain and publish a sufficiently detailed summary of training content, using a template from the EU AI Office, and must have a policy to comply with EU copyright law, including honoring Art. 4(3) DSM Directive TDM opt-outs.",
    "GPAI obligations apply to new models placed on the market after the Act's GPAI provisions take effect, with a longer transition period for models already on the market; providers training on EU-sourced content need a documented opt-out-honoring pipeline before that deadline.",
    "The prohibited-practices provisions, including the facial-scraping ban, carry among the highest penalty tiers in the Act, calculated as a percentage of global annual turnover.",
    "Practical compliance: exclude facial-image datasets built by untargeted internet or CCTV scraping from any EU-facing product, build and retain the training-data summary documentation from the start of a training run rather than reconstructing it after the fact, and implement a DSM Art. 4(3) opt-out scanner in the EU-sourced portion of any crawl pipeline."
  ],
  applies: ["ai_crawl", "ai_corpus", "ai_license", "ai_books", "ai_code", "ai_multimodal", "ai_speech", "ai_annotation", "ai_expert", "ai_synthetic", "ai_rights", "web_scrape"]
});

G({
  id: "g_robots",
  name: "robots.txt, AI-crawler opt-outs & pay-per-crawl",
  jurisdiction: "Global (technical norm) / EU (legal effect under DSM)",
  summary: "robots.txt is a voluntary technical opt-out that major crawlers generally honor by convention, with no inherent legal force in the US; the EU's DSM Directive gives an equivalent machine-readable opt-out actual legal effect for AI training specifically. A paid alternative to a flat block emerged in 2025 as AI crawling volume made simple blocking commercially costly for publishers.",
  points: [
    "robots.txt, standardized as RFC 9309 in 2022, is a voluntary technical exclusion protocol, not a legally binding instrument in the US on its own; compliance depends on the crawler operator choosing to honor it, though courts have treated a site's robots.txt as evidence of the owner's stated access intent in related disputes.",
    "In the EU, DSM Directive Art. 4(3) gives rights reservation expressed in machine-readable form, which robots.txt-style directives can satisfy, actual legal effect: honoring it removes the general TDM exception, so an EU rightsholder's opt-out there is not merely a technical courtesy.",
    "Major AI crawlers, such as OpenAI's GPTBot, Common Crawl's CCBot and Anthropic's ClaudeBot, publish distinct user-agent tokens so sites can opt out of AI training specifically while still allowing search indexing, and generally state they honor robots.txt directives for their own crawlers.",
    "Cloudflare launched a 'pay per crawl' mechanism in 2025 letting publishers charge AI crawlers per request as a paid alternative to a flat block, shifting the robots.txt opt-out from binary allow/deny toward a priced-access model.",
    "Practical compliance: publish crawler-specific opt-out directives if you want to allow search indexing but block AI training, treat an EU site's Art. 4(3)-compliant opt-out as legally binding rather than just impolite to ignore, and log robots.txt fetch and compliance decisions per crawl run for audit."
  ],
  applies: ["web_crawl", "web_focused", "web_scrape", "web_archive", "ai_crawl"]
});

G({
  id: "g_intercept",
  name: "Interception & communications-privacy law (ECPA, ePrivacy)",
  jurisdiction: "US / EU",
  summary: "Wiretap and communications-privacy law restricts interception of communications content in transit and access to stored communications, alongside state call-recording consent rules and the EU's ePrivacy Directive governing cookies and device-level tracking. Methods that capture metadata rather than content generally face lower exposure than those capturing payload or recorded calls.",
  points: [
    "ECPA's Wiretap Act (Title I) prohibits intercepting the content of electronic communications in transit without consent or another exception; the Stored Communications Act (Title II) separately restricts access to stored communications held by a service provider.",
    "US state call-recording laws split between one-party consent, where recording is legal if one participant consents, and all-party/two-party consent, where every participant must consent, such as California; a national expert-network or tip-line call-recording programme needs to default to the strictest applicable state's rule.",
    "The EU ePrivacy Directive (2002/58/EC) requires consent before storing or accessing information on a user's terminal equipment, such as cookies, SDKs and tracking pixels, layered on top of GDPR's general lawful-basis requirement for the resulting personal data.",
    "Passive network-telemetry methods that observe traffic in transit, such as passive DNS sensors, sinkholes and honeypots, generally avoid Wiretap Act exposure when they capture metadata or routing information rather than communications content, but content-bearing telemetry, such as spam-trap email bodies, sits closer to the interception line and needs a clear consent or exception basis.",
    "Practical compliance: get explicit two-party consent and disclosure for any recorded call regardless of jurisdiction, deploy network sensors to capture metadata rather than payload content wherever the use case allows, and run an ePrivacy-compliant consent flow for any EU-facing bidstream or telemetry collection."
  ],
  applies: ["net_pdns", "net_honeypot", "net_sinkhole", "net_spamtrap", "emb_telco", "emb_bidstream", "hum_tips", "hum_expert", "hum_stringers"]
});

G({
  id: "g_stolen",
  name: "Handling stolen data & paying criminals",
  jurisdiction: "US / Global (sanctions)",
  summary: "The legal and sanctions exposure of receiving, handling or paying for data obtained through unauthorized access or theft is distinct from the exposure of the original intrusion itself. Passive receipt and reporting on leaked material is treated differently from any transaction that pays or otherwise provides value to the people who stole it.",
  points: [
    "Receiving and reporting on leaked material a source obtained without authorization is, in most democracies, distinguishable from participating in the underlying theft; Bartnicki v. Vopper (2001), the US Supreme Court held a broadcaster wasn't liable for airing an illegally intercepted call it had no role in intercepting, on First Amendment grounds, where the content was a matter of public concern.",
    "United States v. Aleynikov (2d Cir. 2012) held that stealing purely intangible data transmitted electronically did not violate the National Stolen Property Act, because the statute requires a physical 'good, ware or merchandise'; prosecutors now rely on the Computer Fraud and Abuse Act, the Economic Espionage Act and state trade-secret law to reach electronic data theft instead.",
    "OFAC's 2021 ransomware advisory warns that facilitating a ransomware payment to a sanctioned actor or jurisdiction can violate US sanctions regulations as a strict-liability matter regardless of whether the payer knew the recipient was sanctioned, and recommends voluntary self-disclosure and law-enforcement engagement before paying.",
    "Purchasing stolen data, breach dumps or unauthorized access from criminal sellers creates direct liability distinct from merely monitoring criminal forums for intelligence; paying for access itself can constitute material support to a criminal enterprise in some jurisdictions.",
    "Practical compliance: never pay a criminal actor for data or access without a sanctions screen against OFAC's SDN list and legal sign-off; separate passive monitoring of what criminals have published, which is lower risk, from any transaction that moves money or access to them, which is high risk; and route any inbound leak that may itself be stolen corporate or government data through legal review before acting on or publishing it."
  ],
  applies: ["ug_leaksites", "ug_dumps", "ug_stealer", "ug_purchase", "ug_humint", "hum_tips"]
});

G({
  id: "g_provenance",
  name: "License chains, warranties & data provenance",
  jurisdiction: "Global (contract law)",
  summary: "The contractual practice of tracking a dataset's chain of title, license terms and any rights reservations through every reseller, license and sublicense, backed by warranty and indemnification clauses. It matters most where the underlying legal protection, such as database right, copyright or consent, is itself uncertain or jurisdiction-dependent.",
  points: [
    "A data license is only as good as the licensor's own chain of title; downstream buyers routinely require representations and warranties that the seller has the rights it's purporting to license, plus indemnification if that turns out to be false.",
    "The EU sui generis database right (Directive 96/9/EC) protects a database built with substantial investment independent of any copyright in its contents, so a licensee needs to confirm the licensor's own extraction rights, not just rights in the underlying records.",
    "M&A due diligence for data-driven acquisitions needs to specifically audit the target's data provenance: was training or licensing data itself properly licensed, are there unresolved TDM opt-outs, and do any contracts prohibit the exact kind of resale or sublicensing the acquirer plans.",
    "AI data-licensing deals, such as those with Reddit, Shutterstock, Getty Images and news publishers, typically require the licensee to represent how the data will be used and to indemnify against third-party claims the content wasn't the licensor's to license in the first place.",
    "Practical compliance: maintain a per-dataset provenance record covering original source, license terms, any opt-outs honored and chain of custody through every reseller; require warranty and indemnification clauses in every inbound license; and flow down the same representations to every outbound sublicense so liability doesn't dead-end at whichever party has the least information."
  ],
  applies: ["com_license", "com_marketplace", "com_coop", "com_mna", "rec_feeds", "ai_license", "ai_books", "ai_code", "ai_multimodal", "ai_speech", "ai_rights", "ai_corpus", "hum_coding"]
});

G({
  id: "g_radio",
  name: "Radio-reception & spectrum rules",
  jurisdiction: "US / International (ITU)",
  summary: "Spectrum-licensing and radio-interception law governs who may transmit on allocated frequencies and what may be done with received radio signals. Passive reception of unencrypted, openly broadcast safety signals is generally lawful without a license, while transmission and interception of private communications are separately restricted.",
  points: [
    "In the US, 47 U.S.C. §605 and FCC rules prohibit intercepting and divulging the contents of certain radio communications without authorization, but receiving unencrypted, openly broadcast signals intended for general reception, such as ADS-B at 1090MHz and AIS on marine VHF, for personal or research monitoring is generally permitted and needs no license to receive.",
    "The International Telecommunication Union (ITU) Radio Regulations allocate spectrum internationally; operating a transmitter, as opposed to a passive receiver, in licensed bands requires national licensing, such as FCC Part 97 amateur-radio rules in the US, while passive reception of open broadcasts generally does not.",
    "Community receiver networks operate lawfully specifically because ADS-B and AIS are unencrypted broadcasts designed for safety-of-navigation purposes and openly receivable by anyone with appropriate equipment, unlike encrypted or licensed private radio traffic.",
    "Some jurisdictions restrict re-transmission or commercial redistribution of received radio data even when reception itself is lawful; check national telecoms law before monetizing a feeder network's output in a new country.",
    "Practical compliance: confine feeder/receiver deployments to unencrypted, openly broadcast signal types, verify no national prohibition on passive reception exists before deploying hardware in a new jurisdiction, and keep transmission activity within licensed amateur or commercial spectrum allocations."
  ],
  applies: ["sen_rf", "sen_satrx", "crowd_feeders"]
});

G({
  id: "g_remote",
  name: "Remote-sensing licensing & shutter control",
  jurisdiction: "US",
  summary: "US commercial remote-sensing operators need a NOAA license under the Land Remote Sensing Policy Act, historically including shutter-control authority to restrict imaging during security-sensitive events, now reformed toward a faster tiered review. Export-control law separately restricts high-resolution imagery and SAR technology transfers.",
  points: [
    "In the US, the Land Remote Sensing Policy Act of 1992 requires commercial Earth-observation operators to hold a license from NOAA's Commercial Remote Sensing Regulatory Affairs office before operating a satellite imaging system.",
    "NOAA's 2020 Part 960 licensing reform moved from case-by-case shutter control toward a tiered, risk-based review that approves most imaging conditions by default and reserves specific operating restrictions for genuine national-security conflicts, making US commercial EO licensing significantly faster than under the prior regime.",
    "The government retains authority to impose temporary operating restrictions, a form of shutter control, on licensed systems during a security-sensitive event, though this is now the exception rather than the default review posture.",
    "High-resolution imagery and SAR technology exports, and some foreign-sourced imagery, are subject to export-control regimes (ITAR/EAR) separate from the operating license itself.",
    "Aerial and drone capture fleets face a different regime: national aviation-authority rules, such as FAA Part 107 in the US, for drone operation, plus separate privacy and overflight restrictions in some jurisdictions, rather than the satellite-specific remote-sensing license.",
    "Practical compliance: secure the NOAA, or equivalent national, remote-sensing license before launch, build a compliance process for any government-imposed temporary imaging restriction during active licensing, and classify imagery products by export-control sensitivity before offering them to non-US customers."
  ],
  applies: ["sen_eo", "sen_tasking", "sen_capture"]
});
