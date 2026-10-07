"use strict";
/* Underground collection: forums/markets/channels, leak sites, breach dumps, stealer logs, covert HUMINT, purchasing.
   Scope note: procurement from criminal sellers, obtaining logs from criminal distribution channels and
   techniques for passing vetting in closed criminal communities are deliberately not documented. */

M({
  id: "ug_forums",
  family: "underground",
  name: "Automated monitoring of forums, markets & channels",
  summary: "Continuous, account-based crawling of cybercrime forums, onion markets, paste sites and public Telegram/Discord channels, turned into searchable posts, actors and alerts. The backbone of every underground-intelligence product.",
  origins: ["o_crime"],
  ratings: {cost:2, scale:2, freshness:3, moat:3, legal:2},
  steps: [
    "Start from requirements, not sources: build per-client watchlists (brands, domains, executive names, IP ranges, BINs, product names, internal codenames). Every source you add must justify itself against those lists.",
    "Maintain a source registry as a first-class dataset: name, type (forum, market, paste, channel), language, access tier (open, registration, reputation-gated), current URLs and onion mirrors, adapter version, last successful crawl and health status. Onion mirrors rotate constantly: monitor each source's own announcement threads and channels for new addresses and update the registry automatically.",
    "Build an isolated collection network: crawler containers that never share IP space, credentials or storage with corporate systems or analyst workstations. Clearnet sources go out through rotating datacenter or residential proxies; onion sources through a pool of Tor instances controlled with `stem` (new circuit per session, `MaxCircuitDirtiness` tuned per source).",
    "Write one adapter per source family (XenForo, vBulletin, IPS, custom PHP boards, market platforms). Use Playwright for sources behind JavaScript challenges or anti-DDoS queue pages, and plain HTTP for everything else. Crawl incrementally: walk section indexes by last-post timestamp and only fetch threads that changed.",
    "Run read-only collection accounts as managed personas: one vault entry per account (credentials, recovery details, creation date, persona notes), never reused across sources. Cap request volume per account to human-plausible levels (tens to low hundreds of page views per day, randomized), never post, and track bans as a health metric.",
    "For Telegram, use MTProto clients (e.g. Telethon) on dedicated numbers to join public channels and groups. Collect messages, forwards, media metadata and member counts. Disable automatic media download; fetch attachments only on analyst request into a malware-isolated store.",
    "Parse every page into structured records: source, section, thread, post ID, author handle, timestamp (normalize the forum's timezone), body, prices and currencies, and referenced contact handles. Store the raw HTML and a full-page screenshot with a SHA-256 hash alongside each record for evidential replay.",
    "Translate on ingest (Russian, Chinese, Arabic, Portuguese and Spanish dominate) but keep the original text. Machine translation garbles slang, so maintain a glossary of cybercrime terms and have native-language analysts review anything that triggers an alert.",
    "Resolve actors across sources by shared Jabber/XMPP, Tox, Session and Telegram handles, PGP key fingerprints, wallet addresses, reused avatars and signatures, and writing-style features. Keep link confidence explicit and never auto-merge on a single weak signal.",
    "Match new records against watchlists with exact, fuzzy and semantic matching, dedupe repeats of the same advert across sources, and route hits to analyst triage. Deliver confirmed hits as alerts, STIX objects and finished reports.",
    "Measure coverage daily: share of registry sources crawled in the last 24 h, median lag from post time to ingestion, adapter failure rate, and account attrition. Coverage silently decays without this dashboard."
  ],
  tools: ["Tor + stem", "Playwright", "Telethon (MTProto)", "Kafka or Redis streams", "OpenSearch/Elasticsearch", "Object storage with WORM retention", "Machine translation + cybercrime glossary", "MISP / OpenCTI for STIX output", "HashiCorp Vault for persona credentials"],
  economics: [
    "The dominant cost is people, not compute: adapter maintenance as sources move and redesign, persona upkeep, and native-language analysts. Infrastructure is modest by comparison (~low thousands of dollars a month for a mid-size crawl fleet, estimate).",
    "The moat is the historical archive. Years of captured threads, including deleted posts and defunct forums, can't be recreated by a newcomer, and they are what investigations query.",
    "Coverage of reputation-gated sections is the second moat. It depends on a covert collection programme (see ug_humint), which is slow and expensive to build.",
    "Typically sold as enterprise subscriptions: an analyst platform plus alerts, priced by modules and seats. Six-figure annual contracts are common for large customers (estimate).",
    "Build vs buy: a basic onion and Telegram monitor is a few engineer-months; matching established vendors' breadth and history is a multi-year, multi-million-dollar effort, which is why many CTI teams license this layer."
  ],
  pitfalls: [
    "Scams and recycled adverts: much of what is advertised is fake, old or resold. Treat a listing as a claim, not evidence of a breach.",
    "Timezone and edit-history errors corrupt timelines. Capture the forum's own timezone setting and keep edit timestamps.",
    "Automatic attachment downloads bring malware and stolen data into your environment, so fetch only on request into quarantine.",
    "Over-merged actor profiles propagate false attributions into client reports.",
    "Quiet adapter failures look like a quiet underground. Alert on drops in per-source volume."
  ],
  defenses: [
    "Ban scoring on account behaviour (view velocity, no posting, Tor exit patterns) and periodic purges of lurker accounts.",
    "Reputation and post-count gates on valuable sections, invite-only boards, and paid entry.",
    "Anti-DDoS queues and CAPTCHAs on onion services that break naive crawlers.",
    "Canary content: unique wording or links shown to suspected researcher accounts to identify leakers when it surfaces in vendor reports."
  ],
  legal: [
    "Reading content that any registered member can see is generally lawful, but account terms still matter for contract-based claims (g_contract).",
    "Collected posts contain personal data about actors and victims; document a lawful basis and retention schedule (g_gdpr).",
    "Collect only content addressed to the forum or channel. Capturing private messages between third parties raises interception issues (g_intercept).",
    "Downloading attached dumps or logs moves you into stolen-data handling (g_stolen)."
  ],
  rules: ["g_contract", "g_gdpr", "g_intercept", "g_stolen"],
  vendors: [
    {name:"Intel 471", note:"Describes combining automated underground collection with human operatives across forums and markets.", evidence:"public"},
    {name:"Flashpoint", note:"Markets collections from illicit forums, markets and chat services, including Telegram.", evidence:"public"},
    {name:"KELA", note:"Cybercrime intelligence platform built on automated collection from underground sources.", evidence:"public"},
    {name:"DarkOwl", note:"Sells a searchable darknet dataset collected from Tor, I2P and other networks.", evidence:"public"},
    {name:"Recorded Future", note:"Ingests dark-web and underground sources into its threat-intelligence platform.", evidence:"public"}
  ],
  fieldguide: ["k_darkweb", "p_intel471", "p_flashpoint", "p_kela", "p_darkowl", "s_darkweb"]
});

M({
  id: "ug_leaksites",
  family: "underground",
  name: "Ransomware & extortion leak-site monitoring",
  summary: "Polling the public victim-shaming sites of ransomware and extortion groups to record new victims, deadlines and publication status, then enriching each victim with company data. Fast, cheap and widely replicated.",
  origins: ["o_crime"],
  ratings: {cost:1, scale:1, freshness:3, moat:1, legal:2},
  steps: [
    "Seed a group registry from open trackers (e.g. ransomware.live, RansomLook) and keep your own record per group: aliases and rebrands, every known leak-site and mirror address, site layout version, and active/inactive status.",
    "Poll each site through Tor every 15–60 minutes with a headless browser. Most leak sites are JavaScript-rendered and sit behind anti-DDoS queues; give each group its own parser because layouts differ and change after rebrands.",
    "Extract per victim post: the victim name as written, any domain, country, sector, claimed data volume, countdown or deadline, publication status (announced, partially or fully published) and the post's first-seen time. Keep a screenshot and raw HTML with a hash.",
    "Diff every poll against the last state to emit events: new victim, deadline change, data published, post removed (often a sign of payment or negotiation), site down.",
    "Normalize victim identity: resolve the written name and domain to a canonical organization (firmographic data, LEI or registry IDs), because groups misspell names and use subsidiaries or brand names.",
    "Deduplicate across groups. Affiliates re-list the same victim, rebrands repost old victims, and data brokers re-extort; link these as related events rather than separate incidents.",
    "Decide policy on leaked files before you need it. The default is to record that data was published, not to download it. If a client needs verification of its own exposure, follow the stolen-data custody procedure (g_stolen): counsel sign-off, isolated storage, hashing, minimal access, deletion schedule.",
    "Deliver events as third-party-risk alerts (a supplier was listed), sector and country statistics, and STIX reports. Flag unverified claims clearly: some groups list victims they never breached."
  ],
  tools: ["Tor + Playwright", "ransomware.live / RansomLook (open trackers)", "Firmographic data (OpenCorporates, GLEIF, commercial company data)", "Diff/event store (PostgreSQL)", "Screenshot service with hashing"],
  economics: [
    "Very cheap to operate: a few hundred sites, low bandwidth, and a small crawler cluster.",
    "Minimal moat. Open-source and free trackers publish the same victim lists within minutes, so commercial value comes from enrichment, speed of alerting, verification and integration into risk products.",
    "Monetized mainly inside larger products: third-party risk, cyber insurance underwriting signals, and CTI platforms.",
    "Maintenance spikes when groups rebrand or are taken down by law enforcement, and parsers must follow."
  ],
  pitfalls: [
    "False or exaggerated claims: groups list victims for leverage, recycle old breaches or claim data stolen from a third party.",
    "Name ambiguity: identical company names across countries, and brand vs legal entity.",
    "Takedowns leave stale data: law-enforcement seizure banners replace sites, and entries must be closed out rather than left as live.",
    "Timing: the first-seen time is your observation, not the breach date; never present it as the intrusion date."
  ],
  defenses: [
    "Anti-DDoS queues, CAPTCHAs and frequent onion-address rotation.",
    "Occasional blocking of known scraper behaviour; most groups want visibility, so leak sites are deliberately easy to read."
  ],
  legal: [
    "Recording that an organization was listed is low-risk; republishing claims about named victims carries defamation risk if the claim is false.",
    "Downloading, storing or redistributing leaked files is stolen-data handling, with GDPR obligations for any personal data inside (g_stolen, g_gdpr)."
  ],
  rules: ["g_stolen", "g_gdpr"],
  vendors: [
    {name:"ransomware.live", note:"Free tracker of ransomware leak-site victims with an API.", evidence:"public"},
    {name:"RansomLook", note:"Open-source leak-site and forum monitoring project.", evidence:"public"},
    {name:"Flashpoint", note:"Publishes ransomware victim tracking derived from leak-site monitoring.", evidence:"public"},
    {name:"Intel 471", note:"Reports ransomware activity and victim counts from leak-site observation.", evidence:"public"}
  ],
  fieldguide: ["k_darkweb", "s_darkweb", "p_flashpoint", "p_intel471"]
});

M({
  id: "ug_dumps",
  family: "underground",
  name: "Breach-dump collection & verification",
  summary: "Taking in leaked databases from open publication, researcher submissions, breached-organization disclosures and law-enforcement sharing; verifying they are genuine; and loading the minimum needed for notification and exposure search.",
  origins: ["o_crime", "o_platforms"],
  ratings: {cost:2, scale:3, freshness:1, moat:2, legal:3},
  steps: [
    "Define acceptable intake channels in policy: dumps already published openly (public paste sites, open forum posts), submissions from researchers and journalists, disclosures from breached organizations, and law-enforcement sharing. Purchasing is a separate, exceptional decision (ug_purchase).",
    "Run intake through a secure upload with a chain-of-custody record: submitter, date, claimed source, file hashes, and the analyst who received it.",
    "Quarantine every archive on an isolated, offline analysis host. Scan for malware, expand archives safely (zip bombs are common), and never open files on networked workstations.",
    "Identify the format (SQL dump, CSV, JSON lines, MongoDB/Elasticsearch export, vBulletin/WordPress user tables) and map columns to your schema: email, username, name, phone, IP, password hash and hash type, DOB, address, and site-specific fields.",
    "Verify authenticity before publishing anything:\n- Check internal consistency (sequential IDs, timestamp ranges matching the site's history, hash formats matching the platform's known stack).\n- Cross-check against prior breaches to spot recycled combolists.\n- Confirm with a sample of affected people or the organization.\n- Where you already hold credentials as a legitimate user, check that the site's own account flows behave consistently with the data. Never log into others' accounts.",
    "Classify data classes (emails, passwords, phone numbers, physical addresses, government IDs) and record the breach date, the date it was added, the record count and a verification status.",
    "Load the minimum. For notification services that is identifier → breach membership. Passwords should be stored, if at all, only as hashes queried via k-anonymity range lookups, never as plaintext pairs. Drop sensitive fields you don't need.",
    "Notify: contact the breached organization before publication where practical, and let domain owners verify control to see their exposure.",
    "Apply retention and access controls: raw dumps encrypted at rest, access limited to named staff, deletion of raw files once processing is complete unless counsel requires preservation."
  ],
  tools: ["Air-gapped analysis hosts", "7-Zip / bsdtar with resource limits", "ClamAV + YARA", "csvkit / DuckDB for schema mapping", "PostgreSQL or ClickHouse for loaded identifiers", "k-anonymity range API pattern (SHA-1/NTLM prefix)", "Chain-of-custody log"],
  economics: [
    "Storage and compute are cheap even at billions of rows; verification labour and legal review are the real costs.",
    "Trust is the moat. Organizations and the public submit data to, and accept notifications from, services they regard as careful and neutral.",
    "Monetized via domain-search and API subscriptions, enterprise account-takeover prevention, and identity-protection products resold through consumer brands.",
    "Volume is not quality: well-verified, deduplicated breaches with accurate dates are worth far more than raw combolist counts."
  ],
  pitfalls: [
    "Fabricated breaches: dumps assembled from older leaks and attributed to a new victim for credibility or extortion.",
    "Combolists and URL:login:password (ULP) lists with no provenance inflate counts and can't be attributed to a breach.",
    "Wrong breach dates mislead victims and customers; distinguish breach date, first-seen date and load date.",
    "Malware and zip bombs in archives."
  ],
  defenses: [
    "Not applicable in the usual sense; the adversarial pressure is fabrication and poisoned dumps, handled in verification."
  ],
  legal: [
    "Possessing and processing breached personal data needs a documented lawful basis (often legitimate interest in notification and fraud prevention) and data-minimization measures (g_gdpr).",
    "Receiving and handling stolen data carries criminal-law and civil risk that varies by jurisdiction; policy, counsel review and custody records are essential (g_stolen).",
    "Verification must never involve authenticating to accounts with leaked credentials (g_cfaa)."
  ],
  rules: ["g_stolen", "g_gdpr", "g_cfaa"],
  vendors: [
    {name:"Have I Been Pwned", note:"Loads verified breaches for notification; publishes its verification process and offers k-anonymity Pwned Passwords. The FBI and UK NCA share compromised passwords with it.", evidence:"public"},
    {name:"SpyCloud", note:"Markets ‘recaptured’ breach and malware data for account-takeover prevention.", evidence:"public"},
    {name:"Constella Intelligence", note:"Identity-exposure dataset built from breach and public sources.", evidence:"public"},
    {name:"Intelligence X", note:"Archives leaks and dumps alongside darknet and paste content.", evidence:"public"},
    {name:"DeHashed", note:"Searchable breach-data engine.", evidence:"public"}
  ],
  fieldguide: ["k_breach", "s_breach", "p_hibp", "p_spycloud", "p_constella", "p_intelx", "p_dehashed"]
});

M({
  id: "ug_stealer",
  family: "underground",
  name: "Infostealer-log processing",
  summary: "Turning infostealer logs (per-victim bundles of saved credentials, cookies, autofill data and system details harvested by malware) into deduplicated exposure records matched to organizations and individuals for remediation.",
  origins: ["o_crime", "o_people"],
  ratings: {cost:2, scale:3, freshness:3, moat:2, legal:3},
  steps: [
    "Scope note: this playbook covers processing logs that reach you through lawful channels (law-enforcement and CERT sharing, research partners, victim organizations, and your organization's own approved collection programme under ug_forums). It does not cover obtaining logs from criminal distribution channels.",
    "Quarantine first. Log archives frequently contain malware and password-protected nested archives; process them on isolated hosts with resource limits.",
    "Identify the stealer family from folder layout and file names, then apply a family-specific parser. Families differ in where they store passwords, cookies, autofill, credit-card fields and the system-information file.",
    "Normalize each victim bundle into one infection record: a pseudonymous machine ID (hash of HWID plus username), infection timestamp, malware family, country, OS. Attach child records for each URL/username/credential triple, cookie (domain, name, expiry; never the value in analyst-visible stores), and autofill entry.",
    "Deduplicate aggressively. The same logs are repackaged and reshared many times, so key on machine ID plus infection time and on credential-triple hashes, and record every sighting rather than duplicating records.",
    "Separate genuine logs from ULP/combolists (bare url:login:pass lines). ULP lines lack infection context, can't be dated and must be flagged as lower-confidence.",
    "Match to organizations: corporate email domains, SSO and IdP hostnames, VPN and remote-access portals, internal application hostnames and code-repository URLs. Corporate-access credentials on an infected personal device are the highest-severity finding.",
    "Protect secrets at rest. Hash or encrypt credentials, restrict cookie values to an automated matching service, and never replay credentials or session cookies against any service, including to ‘verify’ them.",
    "Deliver remediation-oriented outputs: per-organization exposure alerts (affected user, application, infection date, malware family) for password resets and session revocation; consumer notification where you run such a service; aggregate trend data.",
    "Retention: keep minimal derived records for as long as the remediation purpose requires, and purge raw bundles on a short schedule."
  ],
  tools: ["Isolated processing cluster", "Family-specific log parsers", "ClickHouse or OpenSearch for credential triples", "HMAC-SHA256 with a secret pepper for credential hashing", "Domain and SSO hostname matcher", "Alerting/case management integration"],
  economics: [
    "Volumes are huge (billions of credential lines across reshares) but compress well after deduplication; storage is a minor cost.",
    "Freshness drives value: an alert days after infection lets a company revoke sessions before account takeover, while a months-old log is mostly historical.",
    "Priced per protected domain, per employee or per identity. Sold to security teams (account-takeover and session-hijack prevention), identity-protection products and law enforcement.",
    "The moat is collection breadth combined with historical depth and the quality of deduplication and enterprise matching."
  ],
  pitfalls: [
    "Counting reshared logs as new infections inflates exposure figures.",
    "Infection timestamps are taken from the victim's clock and can be wrong; corroborate with the first-seen date.",
    "ULP lists masquerade as stealer logs.",
    "Analyst access to raw cookies and passwords creates insider and breach risk of its own."
  ],
  defenses: [
    "Distribution channels churn, and sellers watermark or withhold full logs from suspected researchers.",
    "Malware embedded in log archives targets the people who process them."
  ],
  legal: [
    "Stolen-data handling rules apply in full (g_stolen); document intake channels and purpose.",
    "Logs are dense with sensitive personal data; minimization, purpose limitation and short retention are mandatory under data-protection law (g_gdpr).",
    "Testing a credential or cookie against a live service is unauthorized access (g_cfaa)."
  ],
  rules: ["g_stolen", "g_gdpr", "g_cfaa"],
  vendors: [
    {name:"SpyCloud", note:"Markets malware-infected device data for remediating stolen credentials and session cookies.", evidence:"public"},
    {name:"Hudson Rock", note:"Infostealer intelligence focused on infected-machine data and enterprise exposure.", evidence:"public"},
    {name:"Flare", note:"Threat-exposure management that includes stealer-log monitoring.", evidence:"public"},
    {name:"KELA", note:"Tracks infostealer markets and log exposure for customers.", evidence:"public"},
    {name:"Have I Been Pwned", note:"Has loaded large stealer-log corpora for notification, with credential-to-website mappings for domain owners.", evidence:"public"}
  ],
  fieldguide: ["r_stealer", "k_breach", "p_spycloud", "p_flare", "p_kela", "p_hibp"]
});

M({
  id: "ug_humint",
  family: "underground",
  name: "Covert human collection (virtual HUMINT)",
  summary: "Trained operators maintaining long-lived online personas in criminal communities to observe and converse, producing intelligence that automated collection can't reach. Run as a governed programme rather than individual initiative.",
  origins: ["o_crime"],
  ratings: {cost:3, scale:1, freshness:2, moat:3, legal:3},
  steps: [
    "Scope note: this covers how such a programme is structured and governed. Techniques for gaining access to, or passing vetting in, closed criminal communities are deliberately not documented here.",
    "Write the authority first. Counsel-approved rules of engagement should specify: what operators may and may not do (no participation in crime, no inducement, no purchases without separate approval under ug_purchase); what to do when offered data or access; when to stop; and how to deconflict with law enforcement.",
    "Build personas as documented legends: background, language and dialect, timezone, interests, claimed skills, and a history plan. Each persona has a single handler and a written file kept outside the persona's own infrastructure.",
    "Give every persona its own infrastructure: a dedicated VM or device, a consistent residential or Tor egress, its own messaging accounts and keys, and its own wallet if one is ever approved. Never cross-link personas, and never touch them from corporate or personal environments.",
    "Keep behaviour consistent with the legend: active hours in the claimed timezone, language and slang, and a steady participation level. Inconsistency, not technology, is what usually exposes personas.",
    "Document every interaction in a contact report: verbatim logs, screenshots with hashes, context, and the operator's assessment. Grade source reliability and information credibility (Admiralty scale).",
    "Corroborate before reporting. Claims made in conversation are leads; confirm them against automated collection, technical indicators or a second source.",
    "Manage the persona lifecycle: periodic security reviews, compromise indicators (sudden suspicion, canary content, doxxing attempts), and a burn procedure that retires the persona without exposing others.",
    "Protect operators: rotation, psychological support for exposure to harmful content, and separation of real identities from all persona activity."
  ],
  tools: ["Persona-dedicated VMs or devices", "Residential or Tor egress per persona", "Separate messenger accounts and PGP keys", "Contact-report and case-management system", "Admiralty source grading", "Secure document store for legends"],
  economics: [
    "The most expensive collection per unit of insight: native-language specialists, months to years to mature a persona, and low throughput.",
    "Also the strongest moat. Mature personas and the access they hold can't be bought or quickly replicated, and their output differentiates premium intelligence reports.",
    "Monetized indirectly through finished intelligence, actor profiles and early warning that automated feeds can't produce.",
    "Key-person and compromise risk: losing an operator or burning a persona destroys years of investment."
  ],
  pitfalls: [
    "Circular reporting: other researchers' personas and vendor reports get mistaken for independent criminal sources.",
    "Operator drift into active participation that breaches the rules of engagement.",
    "Overvaluing boasts and rumours without corroboration.",
    "Cross-contamination between personas that burns several at once."
  ],
  defenses: [
    "Communities vet newcomers, test them with requests that would require committing crimes, and share suspected-researcher lists.",
    "Canary information fed to suspected personas to trace leaks into vendor reports.",
    "Doxxing and counter-intelligence against suspected researchers."
  ],
  legal: [
    "Private-sector operators have no law-enforcement authority; rules of engagement must prevent participation in, or facilitation of, offences.",
    "Misrepresentation may breach platform terms (g_contract), and any data offered or received triggers stolen-data rules (g_stolen).",
    "Personal data about actors still falls under data-protection law (g_gdpr)."
  ],
  rules: ["g_stolen", "g_contract", "g_gdpr"],
  vendors: [
    {name:"Intel 471", note:"Publicly describes a global network of human operatives alongside automated collection.", evidence:"public"},
    {name:"Flashpoint", note:"Describes analyst-led engagement in illicit communities as part of its collection.", evidence:"public"}
  ],
  fieldguide: ["k_sockpuppet", "k_opsec", "g_ethics", "p_intel471", "p_flashpoint"]
});

M({
  id: "ug_purchase",
  family: "underground",
  name: "Purchasing data & access",
  summary: "Paying criminal sellers for breach data, logs or samples. Rarely disclosed, contested and high-risk. Most reputable providers prohibit it; this entry covers the governance around that decision, not how to buy.",
  origins: ["o_crime"],
  ratings: {cost:2, scale:2, freshness:2, moat:1, legal:3},
  steps: [
    "Scope note: procurement steps (finding sellers, negotiating, paying, receiving) are deliberately not documented. These steps describe the decision process organizations use.",
    "Default policy: do not pay. Payments fund the activity being monitored, reward the theft, invite fabricated ‘breaches’ made for sale, and can identify the buyer to criminals.",
    "Identify the request type: verifying a client's own exposure, supporting an incident response, or building a commercial dataset. The last is almost never justifiable.",
    "Exhaust alternatives: freely posted samples, the breached organization's own investigation, law-enforcement partners, CERTs, and other researchers who already hold the data.",
    "Legal review: sanctions screening (OFAC and equivalents prohibit payments to designated persons and groups); receiving-stolen-property and money-laundering exposure; data-protection obligations for anything received; contractual commitments to customers.",
    "Coordinate with law enforcement before, not after, any engagement, and record that coordination.",
    "If an exceptional, counsel-approved case proceeds, everything received goes through the ug_dumps custody and verification procedure, and the decision record (purpose, approvals, amounts, outcome) is retained.",
    "Run a post-action review and update the policy; ad hoc exceptions become precedent quickly."
  ],
  tools: ["Written payment policy", "Sanctions-screening process", "Legal and law-enforcement deconfliction log", "Custody procedure (see ug_dumps)"],
  economics: [
    "Purchased data has no moat: what one buyer can buy, so can any other, including competitors and criminals.",
    "The hidden costs are reputational (customer and regulator trust), legal (sanctions and stolen-property exposure) and a market signal that encourages fabrication.",
    "Data obtained through free publication, sharing partnerships and victim cooperation is usually close enough in coverage at a fraction of the risk."
  ],
  pitfalls: [
    "Paying for fabricated or recycled data.",
    "Being identified, profiled or extorted by the seller.",
    "Creating a precedent that staff treat as permission."
  ],
  defenses: [
    "Sellers screen buyers, withhold full sets from suspected researchers and watermark data to trace resale."
  ],
  legal: [
    "Payments to sanctioned persons, including some ransomware groups, can violate sanctions law regardless of intent (g_stolen).",
    "Purchasing personal data from criminals is very hard to reconcile with data-protection principles (g_gdpr).",
    "Customer contracts and data-provenance warranties may prohibit criminally sourced data (g_provenance)."
  ],
  rules: ["g_stolen", "g_gdpr", "g_provenance"],
  vendors: [
    {name:"Have I Been Pwned", note:"States that it does not pay for breach data.", evidence:"public"}
  ],
  fieldguide: ["k_breach", "g_ethics"]
});
