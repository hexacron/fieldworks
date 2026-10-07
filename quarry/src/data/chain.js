"use strict";
/* chain.js: origins, pipeline stages, products and provider archetypes that tie acquisition methods together. */

/* ===================== Origins ===================== */

O({ id:"o_people", name:"People & personal devices", summary:"Individuals and the phones, apps and accounts they use: the ultimate source of identity, location, contact and behavioral data." });
O({ id:"o_platforms", name:"Platforms, websites & apps", summary:"Websites, social networks, marketplaces and apps that host user content and expose it through pages or APIs." });
O({ id:"o_infra", name:"Internet infrastructure", summary:"The internet's own plumbing: IP space, DNS, certificates, routing and the hosts attached to it." });
O({ id:"o_gov", name:"Governments, registries & courts", summary:"Government agencies, company and land registries, courts and regulators that create and publish official records." });
O({ id:"o_commerce", name:"Commerce, finance & trade", summary:"Businesses, financial institutions, credit bureaus and trade/customs systems generating transactional and ownership data." });
O({ id:"o_physical", name:"The physical world (earth, sea, air, spectrum)", summary:"Terrain, vessels, aircraft and the electromagnetic spectrum, observed via satellites, receivers and capture fleets." });
O({ id:"o_media", name:"News, publishing & creative works", summary:"News organizations, publishers and creators producing articles, books, images and other creative works." });
O({ id:"o_crime", name:"Criminal ecosystems", summary:"Forums, markets, leak sites and malicious infrastructure operated by criminal actors." });
O({ id:"o_models", name:"AI models & generated content", summary:"Outputs and interactions of deployed AI models: generated text/images, user prompts and model telemetry." });

/* ===================== Pipeline stages ===================== */

S({
  id:"p_ingest", name:"Ingestion & raw storage", order:1,
  summary:"Landing every acquisition method's output in durable, provenance-tagged raw storage before any transformation.",
  steps:[
    "Land every acquisition method's output in its original form before any transformation, tagged with source, method id, collection timestamp and a content hash.",
    "Write to an append-only object store (S3/GCS/MinIO) partitioned by source and date, e.g. `s3://raw/web_scrape/2026-10-07/`.",
    "Queue inbound records through a durable broker (Kafka, Kinesis, Pub/Sub) so downstream failures don't block upstream collectors.",
    "Capture collector metadata (IP/proxy used, HTTP status, response headers, request latency) for later defense-evasion tuning and audit.",
    "Apply schema-on-read, not schema-on-write: store raw bytes/JSON as-is and defer structure to the parsing stage.",
    "Checksum and deduplicate at the object level before paying for downstream parse compute on identical payloads.",
    "Set retention tiers from day one: hot storage (7-30 days) for active reprocessing versus cold/archive tiers for years-long retention.",
    "Instrument ingest-rate and backlog-depth dashboards; alert when a collector's volume drops or spikes outside its historical band."
  ],
  tools:["Kafka / Kinesis / Pub-Sub","S3 / GCS / MinIO","Parquet / Avro","xxhash / SHA-256 content hashing","Prometheus / Grafana"],
  failures:[
    "Silent collector breakage: the source changed format and ingest keeps accepting empty or malformed payloads unnoticed.",
    "Unbounded raw-storage cost growth without lifecycle/retention policies.",
    "Losing source and collection-method provenance makes later compliance and defense-evasion tuning impossible.",
    "Backpressure from a slow downstream stage stalling the entire pipeline without a durable queue to absorb it."
  ],
  economics:[
    "Storage itself is cheap (~$0.02/GB-month for object storage, estimate), but compute to reprocess years of raw history is not.",
    "Raw-retention length is a direct cost/legal-exposure tradeoff between deletion obligations and future reprocessing ability."
  ]
});

S({
  id:"p_parse", name:"Parsing & extraction", order:2,
  summary:"Turning raw bytes (HTML, PDFs, binary formats, API payloads) into structured records.",
  steps:[
    "Build HTML/DOM extraction with CSS/XPath selectors or readability-style heuristics for article/profile content.",
    "Parse binary and document formats (PDF via pdfplumber/Apache Tika, images via EXIF extraction) into text and metadata fields.",
    "Map API JSON/XML payloads to an internal schema, pinning against the upstream API's documented version.",
    "Apply OCR (Tesseract, AWS Textract, Google Document AI) to scanned documents and image-embedded text.",
    "Handle pagination, infinite scroll and multi-step API cursors so extraction captures full result sets, not just the first page.",
    "Version parsers per source, since site layouts and API schemas change without notice.",
    "Run parser regression tests against a golden-fixture set on every parser change to catch silent breakage before deployment.",
    "Route malformed or unparseable records to a dead-letter queue for manual triage rather than silently dropping them."
  ],
  tools:["BeautifulSoup / lxml / Scrapy","Apache Tika","Tesseract / AWS Textract / Google Document AI","jq / jmespath","golden-fixture regression suites"],
  failures:[
    "Brittle selectors breaking silently after a source redesign.",
    "OCR misreads propagating downstream as false facts.",
    "Encoding/locale mishandling corrupting non-ASCII names and addresses.",
    "Schema drift from upstream APIs when parsers aren't pinned to a documented version."
  ],
  economics:[
    "Parser maintenance is the dominant recurring cost for any web-sourced archetype (~1 engineer per 20-50 actively maintained scrapers, estimate).",
    "Investment in resilient, declarative extraction over ad hoc regex reduces breakage rate and is a real, if unglamorous, moat."
  ]
});

S({
  id:"p_normalize", name:"Normalization & standardization", order:3,
  summary:"Mapping parsed fields into canonical, comparable formats across every source.",
  steps:[
    "Define a canonical schema per entity type (person, organization, domain, address, IP) before onboarding new sources.",
    "Normalize units and formats: dates to ISO 8601, phone numbers to E.164, free-text addresses via libpostal.",
    "Normalize names (casing, diacritics, transliteration, nickname expansion) consistently across every source.",
    "Maintain controlled vocabularies for categorical fields (country codes, industry codes, currency codes).",
    "Convert currency values using timestamped FX rates rather than a single static rate.",
    "Geocode free-text addresses to structured coordinates where downstream products need spatial queries.",
    "Refresh reference-data tables (country/currency/code lists) on a scheduled cadence as they change.",
    "Gate data at a schema-validation checkpoint (JSON Schema/Avro) before it proceeds to deduplication."
  ],
  tools:["libpostal","JSON Schema / Avro / Protobuf","ISO 8601 / E.164 normalizers","Nominatim / Google Geocoding","currency-rate feeds"],
  failures:[
    "Inconsistent normalization across sources creates false non-matches downstream in entity resolution.",
    "Lossy normalization destroys legally significant distinctions, e.g. collapsing legal-entity suffixes.",
    "Stale reference/code tables silently miscategorize new countries, currencies or industry codes."
  ],
  economics:[
    "Normalization is a one-time-per-source engineering cost that pays off at every downstream stage.",
    "Under-investing here multiplies entity-resolution and labeling cost later in the pipeline."
  ]
});

S({
  id:"p_dedup", name:"Deduplication", order:4,
  summary:"Collapsing exact and near-duplicate records before they inflate downstream processing cost or coverage claims.",
  steps:[
    "Run exact dedup via content hash before any other processing, the cheapest possible filter.",
    "Detect near-duplicate documents with MinHash or SimHash plus LSH banding rather than pairwise comparison.",
    "Fuzzy-dedup structured records using shingling and Jaccard similarity on key fields (name, address, identifiers).",
    "Set a similarity threshold per entity type, validated against a labeled sample rather than a guessed constant.",
    "Maintain a canonical-record pointer so duplicates are suppressed, not deleted, preserving provenance for audit.",
    "Re-run dedup incrementally on each new ingest batch rather than full reprocessing of historical data.",
    "Track dedup-rate and false-merge-rate metrics over time to catch threshold drift."
  ],
  tools:["MinHash / SimHash","datasketch / LSH libraries","Spark / Dask for batch dedup at scale","Bloom filters for exact-dedup membership tests"],
  failures:[
    "Over-aggressive fuzzy thresholds merge distinct entities into one record.",
    "Under-aggressive thresholds let near-duplicate noise inflate perceived coverage.",
    "Dedup state drifting out of sync with the live dataset after a schema change."
  ],
  economics:[
    "Compute cost scales roughly quadratically with record count without LSH-based blocking, making LSH a hard requirement at scale.",
    "Dedup quality is invisible to customers but directly determines the credibility of any coverage/scale claim the product makes."
  ]
});

S({
  id:"p_er", name:"Entity resolution", order:5,
  summary:"Linking records across sources into stable, confidence-scored real-world entity clusters.",
  steps:[
    "Define blocking keys (name+DOB token, domain root, address postcode) to avoid all-pairs comparison at scale.",
    "Score candidate pairs with a probabilistic or ML matcher: a Fellegi-Sunter model as in Splink, or a trained classifier as in Senzing or Zingg.",
    "Use deterministic rules for high-confidence fields (exact tax-ID or email match) and probabilistic scoring for fuzzy fields (name, address, date of birth).",
    "Maintain a cluster/graph of linked records per real-world entity with a stable internal entity ID.",
    "Support human review queues for borderline-confidence matches rather than forcing an automatic decision.",
    "Version the matching model and track precision/recall against a labeled gold-standard match set.",
    "Handle entity splits and merges over time, e.g. a person changes name or a company re-registers under a new identifier.",
    "Expose match confidence and supporting evidence to downstream consumers rather than hiding it behind a flat merged record."
  ],
  tools:["Splink","Senzing","Zingg","Dedupe.io","Neo4j or other graph databases for entity clusters","labeled gold-standard match sets"],
  failures:[
    "False merges collapse distinct people or companies into one record, serious in a people-search or screening product.",
    "False splits fragment one entity's history across multiple records, hiding risk.",
    "Blocking keys too narrow miss true matches; too broad blow up comparison compute.",
    "Model drift as the population or source mix changes without periodic re-evaluation."
  ],
  economics:[
    "Entity-resolution quality is the core product differentiator for people-search, corporate-registry and screening archetypes; it is the actual moat, not the raw data.",
    "Cost scales with both record volume and the number of distinct source systems being reconciled."
  ]
});

S({
  id:"p_enrich", name:"Enrichment & joining", order:6,
  summary:"Attaching additional fields from internal and third-party sources onto resolved entities.",
  steps:[
    "Define a join-key strategy per entity type keyed off the entity-resolution stage's stable ID, not raw name text.",
    "Pull from internal reference tables first before calling paid third-party enrichment APIs.",
    "Cache enrichment API responses with TTLs to control repeat-lookup cost on the same entity.",
    "Build a field-level lineage graph recording which source populated which field, for later audit and dispute resolution.",
    "Rate-limit and batch external enrichment calls rather than issuing one call per record in real time.",
    "Fall back gracefully when an enrichment source is unavailable rather than blocking the whole pipeline on it.",
    "Track enrichment coverage (percentage of entities with a given field populated) per source to spot degrading suppliers."
  ],
  tools:["internal reference/lookup tables","third-party enrichment APIs","Redis / Memcached response caching","Airflow / Dagster DAG orchestration"],
  failures:[
    "Enrichment latency blocking a real-time product's response path.",
    "Paying repeatedly for the same lookup without a caching layer.",
    "Silently degraded coverage when a paid upstream source changes its terms or pricing without notice."
  ],
  economics:[
    "External enrichment API calls are often the single largest variable cost line in the pipeline.",
    "Building owned reference data rather than perpetually buying is the standard build-vs-buy inflection once volume justifies it."
  ]
});

S({
  id:"p_label", name:"Scoring, labeling & classification", order:7,
  summary:"Applying structured categories, risk scores and confidence labels to resolved and enriched records.",
  steps:[
    "Define the label taxonomy (risk categories, event types, sentiment classes) before labeling starts.",
    "Build a human-labeled gold set first to calibrate any automated classifier against.",
    "Use a supervised model (gradient-boosted trees or a fine-tuned transformer) for high-volume categorical labeling.",
    "Route low-confidence predictions to human review as an active-learning loop that improves the model over time.",
    "Track inter-annotator agreement (Cohen's kappa) on human-labeled subsets to catch an unreliable rubric.",
    "Version label schemas since taxonomies evolve and old labels may need remapping to a new scheme.",
    "Expose a confidence score alongside every label rather than a bare class assignment."
  ],
  tools:["Label Studio / Prodigy","XGBoost / LightGBM","fine-tuned transformer classifiers","active-learning frameworks"],
  failures:[
    "Label-schema drift breaking historical comparability across versions.",
    "Automated labels overriding human judgment on genuinely ambiguous cases.",
    "Unmonitored model drift as the underlying population changes, e.g. new malware families or new event types."
  ],
  economics:[
    "Human labeling cost scales linearly with volume and is the largest recurring OpEx for archetypes like CTI and event coding.",
    "Investment in active learning reduces the human-labeled fraction needed as the model matures."
  ]
});

S({
  id:"p_qa", name:"Quality assurance & poisoning defense", order:8,
  summary:"Detecting statistical anomalies, silent breakage and deliberate poisoning before data reaches customers.",
  steps:[
    "Run statistical outlier detection on every new batch before production (value-range checks, distribution-shift tests).",
    "Maintain known-answer test records seeded through the pipeline to detect silent breakage end-to-end.",
    "Rate-limit and anomaly-score any single contributor or source whose submission volume or pattern changes abruptly, a poisoning or Sybil signal.",
    "Cross-validate high-stakes fields against at least two independent sources before trusting them.",
    "Run canary deployments of pipeline changes against a holdout set before full rollout.",
    "Maintain a human escalation path for flagged batches rather than auto-publishing or auto-rejecting.",
    "Log every QA rejection with a reason code to support trend analysis on recurring failure modes."
  ],
  tools:["Great Expectations / dbt tests","canary and holdout pipelines","isolation-forest anomaly detection","contributor reputation scoring"],
  failures:[
    "Coordinated poisoning (bulk fake submissions to a crowd source, adversarial document injection) passing undetected without contributor-level anomaly scoring.",
    "QA that only checks schema validity and misses semantic or factual errors.",
    "Alert fatigue from unfiltered QA flags burying the genuinely actionable ones."
  ],
  economics:[
    "QA is pure cost with no direct revenue line, but a single public poisoning or data-quality incident can destroy the trust that is the product's actual moat.",
    "Cost scales with the number of untrusted or crowd-sourced inputs feeding the pipeline."
  ]
});

S({
  id:"p_history", name:"Versioning, history & retention", order:9,
  summary:"Preserving point-in-time state so customers can query what was known as of any past date, not just the current record.",
  steps:[
    "Store every record as an append-only sequence of versioned snapshots rather than in-place updates.",
    "Timestamp every field change with effective-from/effective-to validity intervals, a bitemporal model.",
    "Expose point-in-time query capability so customers can ask what was known as of a given date.",
    "Define per-source retention policies balancing storage cost against the product value of historical depth.",
    "Archive cold history to cheaper storage tiers while keeping an index for fast point-in-time lookup.",
    "Snapshot schema versions alongside data versions so old records remain correctly interpretable."
  ],
  tools:["bitemporal / event-sourced data models","Delta Lake / Apache Iceberg","SCD Type 2 patterns","tiered hot/warm/cold storage"],
  failures:[
    "In-place updates silently destroy historical state that products like passive DNS or WHOIS history depend on.",
    "Unindexed history makes point-in-time queries impractically slow at scale.",
    "Schema evolution breaking the ability to reinterpret old snapshots correctly."
  ],
  economics:[
    "Historical depth is a direct, hard-to-copy moat for archetypes like passive DNS and corporate registries; a new entrant cannot buy years of history.",
    "Storage cost for full history is usually small relative to the price premium customers pay for depth."
  ]
});

S({
  id:"p_compliance", name:"Compliance processing (PII, opt-outs, deletion)", order:10,
  summary:"Propagating lawful-basis, opt-out and deletion obligations through every copy of a record, not just the primary table.",
  steps:[
    "Maintain a per-record data-subject-rights (DSR) queue for access, correction and deletion requests with SLA tracking.",
    "Implement cascading deletion that propagates through raw storage, derived tables, caches, backups and downstream product exports.",
    "Maintain an opt-out/suppression list checked at both ingest and serving time, not only at collection.",
    "Log lawful basis and source-collection-method per PII field to satisfy Art. 14/documentation obligations.",
    "Honor robots.txt and documented AI-crawler opt-out signals at the collector level.",
    "Run periodic data-minimization passes to purge fields no longer serving a documented purpose.",
    "Maintain jurisdiction-aware handling, since obligations differ across GDPR, CCPA/Delete Act and sector-specific rules."
  ],
  tools:["DSR case-management systems","suppression-list services","consent/lawful-basis metadata tags","robots.txt / ai-crawler opt-out parsers","data-minimization audit jobs"],
  failures:[
    "Deletion that only touches the primary table while the record lingers in caches, backups, search indices or already-shipped exports.",
    "Opt-out lists checked only at collection time so re-matched or re-enriched records resurface deleted subjects.",
    "Undocumented lawful basis making a regulator inquiry unanswerable."
  ],
  economics:[
    "Compliance processing is a fixed regulatory cost of doing business in consumer-data archetypes (people-search, location, breach, caller ID).",
    "Under-investment here is the leading cause of FTC/DPA enforcement actions and resulting restrictions on sale of data."
  ]
});

/* ===================== Products ===================== */

D({ id:"d_api", name:"Query API", summary:"Programmatic lookup access, typically metered per query or per subscription tier.",
  pricing:["Per-query/lookup pricing with volume tiers","Monthly subscription with an included query quota plus overage","Freemium tier with rate limits to drive paid conversion"],
  examples:["Shodan REST API","Pipl Search API","OpenCorporates API"] });

D({ id:"d_bulk", name:"Bulk files & snapshots", summary:"Point-in-time or periodically refreshed full-dataset exports delivered as files rather than queried live.",
  pricing:["Annual or multi-year bulk-license fee","One-time snapshot purchase","Tiered by field coverage or geographic scope"],
  examples:["DomainTools Whois bulk feed","Common Crawl archive","OpenCorporates bulk data dump"] });

D({ id:"d_platform", name:"Analyst platform", summary:"A seat-based interactive application for human investigators to search, pivot and build cases on top of the dataset.",
  pricing:["Per-seat annual license","Enterprise site license with usage caps","Tiered by module or data-source access"],
  examples:["Recorded Future Intelligence Cloud","Maltego","Sayari investigative platform"] });

D({ id:"d_feed", name:"Real-time feeds & alerts", summary:"Low-latency streaming delivery of new or changed records, typically pushed rather than pulled.",
  pricing:["Subscription priced by feed volume/latency tier","Per-alert-rule pricing","Enterprise firehose licensing"],
  examples:["Dataminr real-time alerts","GreyNoise real-time scanner feed","Flightradar24 live feed"] });

D({ id:"d_cti", name:"Threat-intel feeds & blocklists", summary:"Machine-consumable indicator feeds (IPs, domains, hashes) built for direct ingestion into security tooling.",
  pricing:["Per-indicator-volume subscription","Free community tier with a paid enterprise tier (freemium)","Bundled into broader security-platform licensing"],
  examples:["abuse.ch URLhaus","VirusTotal Intelligence","Recorded Future threat-intel feeds"] });

D({ id:"d_integration", name:"Integrations (Maltego, SIEM, SOAR, CRM)", summary:"Pre-built connectors embedding the dataset directly into a customer's existing security or business tooling.",
  pricing:["Per-integration connector licensing","Bundled at no extra cost to drive platform lock-in","Usage-metered API calls through the integration"],
  examples:["Maltego Transform Hub entries","Splunk/Sentinel threat-intel connectors","Salesforce data-enrichment plugins"] });

D({ id:"d_reports", name:"Finished intelligence & reports", summary:"Human-written narrative analysis and assessments, sold as a discrete deliverable rather than raw data access.",
  pricing:["Per-report or per-engagement fee","Subscription to a recurring report series","Bundled into an advisory/consulting retainer"],
  examples:["ACLED situation reports","Recorded Future analyst reports","Sayari due-diligence reports"] });

D({ id:"d_marketplace", name:"Marketplace listings", summary:"Third-party-brokered distribution of a dataset through a shared data-exchange platform.",
  pricing:["Commission/take-rate on dataset sales","Listing fee for data suppliers","Direct marketplace-brokered licensing fee"],
  examples:["AWS Data Exchange","Snowflake Marketplace","Dawex data marketplace"] });

D({ id:"d_dataset", name:"Licensed training datasets", summary:"Bulk content or structured data licensed specifically for AI model training.",
  pricing:["Flat licensing fee per dataset/corpus","Per-token or per-record pricing","Ongoing royalty tied to model revenue or usage"],
  examples:["Shutterstock AI training licensing","Reddit data-licensing deal","Getty Images licensed training sets"] });

D({ id:"d_model", name:"Models & AI products", summary:"The trained model or model-backed product itself, sold as the end deliverable of the data supply chain.",
  pricing:["Per-token API pricing","Subscription to a hosted product (chat, copilot)","Enterprise licensing with usage caps"],
  examples:["OpenAI API","Anthropic Claude API","Google Gemini API"] });

/* ===================== Archetypes ===================== */

A({
  id:"a_scanner", name:"Internet scan search engine",
  summary:"Internet-wide active scanning indexed into a searchable database of exposed services and devices.",
  recipe:[
    ["net_scan",3,"Core: periodic full-internet port/service scans are the primary data source"],
    ["net_bgp",1,"Supporting: BGP and ASN data attribute scanned IPs to networks and organizations"],
    ["net_probe",3,"Core: banner grabbing and protocol fingerprinting turn open ports into structured service data"],
    ["net_ct",2,"Major: CT log tailing supplies hostnames to correlate with scanned IPs"],
    ["net_zones",1,"Supporting: zone files and RDAP add ownership/registration context"],
    ["net_pdns",1,"Supporting: passive DNS links IPs to historical hostnames"]
  ],
  stages:["p_ingest","p_parse","p_normalize","p_label"],
  products:["d_api","d_platform","d_bulk"],
  vendors:[
    {name:"Shodan", note:"Runs its own global scanning infrastructure continuously since 2009.", evidence:"public"},
    {name:"Censys", note:"Spun out of the University of Michigan ZMap research project.", evidence:"public"},
    {name:"FOFA", note:"Chinese internet-scan search engine with its own scanning infrastructure.", evidence:"reported"}
  ],
  build:[
    "Stand up distributed scanning hosts across multiple clean-reputation ASNs; publish reverse-DNS and an opt-out page on each.",
    "Build a scan scheduler that cycles through the full IPv4 space and a sampled slice of IPv6 across the top 1,000-2,000 ports on a rolling multi-day cadence using ZMap or MASSCAN.",
    "Layer in application-layer probing (banner grabs, TLS handshakes, protocol handshakes) to turn open ports into structured service fingerprints.",
    "Tail certificate-transparency logs in real time to catch new hostnames between scan cycles and seed targeted re-scans.",
    "Pull zone files and RDAP/WHOIS data to attach registrant and ownership metadata to scanned IPs.",
    "Normalize banners and fingerprints into a canonical service/version schema; build a fingerprint-signature library for common software.",
    "Index results in a search-optimized store supporting structured queries like `product:apache country:US`.",
    "Build a historical snapshot layer so customers can query point-in-time exposure, not just current state.",
    "Expose a query API and a web search UI; add a vulnerability-correlation layer mapping fingerprints to CVEs.",
    "Publish an opt-out/scan-exclusion process and honor abuse complaints to keep scanning infrastructure's IP reputation usable."
  ],
  economics:[
    "Primary cost is scanning/probing infrastructure and bandwidth, plus storage and compute for continuous full-internet result sets.",
    "Monetized via tiered API/subscription access (a free community tier drives discovery, paid tiers unlock full query volume and history) and enterprise attack-surface-management contracts.",
    "Moat comes from scan history depth, fingerprint-signature library breadth, and clean-reputation scanning infrastructure that takes years to build without being blocked.",
    "Building a comparable scan engine from scratch requires months of infrastructure buildout plus an ongoing abuse-complaint operation (estimate); most competitors license this data rather than re-scanning.",
    "Vulnerability-correlation and exposure-management layers built atop raw scan data command the highest-margin enterprise pricing."
  ],
  risks:[
    "Scanning activity can trigger abuse complaints, blocklisting of scanning IP ranges, and CFAA-adjacent legal questions depending on jurisdiction and target consent posture.",
    "Exposed service data can reveal exploitable misconfigurations, creating dual-use risk if used to find attack targets rather than defend them.",
    "Fingerprint libraries require continuous maintenance as software versions and banners change; stale fingerprints degrade product trust."
  ],
  fieldguide:["p_shodan","p_censys","p_fofa","k_scan"]
});

A({
  id:"a_pdns", name:"Passive DNS & domain intelligence",
  summary:"Historical DNS resolution and registration data built from sensor networks and registry feeds, sold for domain/infrastructure investigation.",
  recipe:[
    ["net_pdns",3,"Core: passive DNS sensors at resolver chokepoints are the primary resolution-history source"],
    ["emb_security",2,"Major: resolver and security-product DNS telemetry contributed by partners extends sensor coverage"],
    ["net_zones",3,"Core: zone files and RDAP supply registration and ownership data"],
    ["net_ct",2,"Major: CT logs catch certificate-driven hostname issuance between DNS resolutions"],
    ["rec_bulk",1,"Supporting: bulk WHOIS/registry downloads fill gaps for ccTLDs without RDAP"]
  ],
  stages:["p_ingest","p_normalize","p_er","p_history"],
  products:["d_api","d_bulk","d_feed"],
  vendors:[
    {name:"DomainTools (Farsight DNSDB)", note:"Acquired Farsight Security's passive-DNS sensor network and DNSDB product in 2021.", evidence:"public"},
    {name:"SecurityTrails", note:"Maintains its own passive DNS and historical WHOIS datasets, sold via API.", evidence:"public"},
    {name:"WhoisXML API", note:"Aggregates bulk WHOIS/RDAP and DNS data across TLD registries.", evidence:"public"}
  ],
  build:[
    "Deploy or contract passive-DNS sensors at ISP/resolver vantage points that export every DNS resolution observed, anonymizing the querying client but retaining the resolved record.",
    "Centralize sensor feeds into a streaming ingest pipeline; dedupe identical resolution events while preserving first-seen/last-seen timestamps per unique (name, record type, value) tuple.",
    "Acquire zone-file access agreements with TLD registries (e.g. ICANN's Centralized Zone Data Service for gTLDs) and pull nightly zone files for registered-domain inventories.",
    "Pull RDAP, and legacy WHOIS where RDAP is unavailable, for registrant, registrar and registration-date metadata.",
    "Tail certificate-transparency logs to catch hostnames appearing in certificates before or without a corresponding passive-DNS observation.",
    "Build a bitemporal resolution-history store: every (hostname, record type, value) tuple with a validity interval, queryable as of any historical date.",
    "Run entity resolution linking domains, IPs, registrants and name servers into infrastructure clusters for shared-infrastructure analysis.",
    "Expose historical and current lookups via API and bulk export; build a change-detection/alerting layer for monitored domains.",
    "Negotiate ongoing sensor-network contracts or build proprietary sensor placements to keep the historical record growing without gaps."
  ],
  economics:[
    "Cost is dominated by sensor-network acquisition/maintenance (ISP partnerships) and long-term storage of a continuously growing historical resolution record.",
    "Monetized via API subscriptions tiered by query volume, bulk-feed licensing to security vendors, and premium historical-depth access.",
    "Moat is almost entirely historical depth and sensor-network breadth: a new entrant starting today cannot retroactively produce a decade of resolution history.",
    "Standing up a comparable sensor network from scratch takes years of ISP relationship-building (estimate); most CTI vendors license passive-DNS data rather than building their own.",
    "Zone-file and RDAP access is comparatively cheap and standardized, so differentiation concentrates in sensor coverage and resolution-history length."
  ],
  risks:[
    "Passive-DNS sensor data sits close to communications metadata; sensor placement and anonymization practices face scrutiny under interception/communications-privacy law.",
    "Registrant WHOIS/RDAP data is subject to GDPR redaction for EU registrants, reducing attribution fidelity for many ccTLD and gTLD records.",
    "Sensor-network contracts are a single point of failure: losing an ISP partnership creates a permanent gap in historical coverage."
  ],
  fieldguide:["p_domaintools","p_strails","p_whoisxml","k_pdns","k_ct"]
});

A({
  id:"a_noise", name:"Internet noise & scanner intelligence",
  summary:"Honeypot and darknet-telescope sensor networks that classify who is scanning the internet, used to suppress security-alert noise.",
  recipe:[
    ["net_honeypot",3,"Core: distributed honeypot sensors are the primary source of who-is-scanning telemetry"],
    ["net_bgp",1,"Supporting: routing data maps scanner IPs to ASNs, hosting providers and countries"],
    ["net_telescope",2,"Major: darknet IP-space monitoring observes unsolicited traffic at scale with no interaction"],
    ["net_scan",2,"Major: outbound scanning cross-references observed scanner IPs against known-good crawlers"],
    ["net_sinkhole",1,"Supporting: sinkhole telemetry adds botnet/malware-scanner attribution"]
  ],
  stages:["p_ingest","p_label","p_qa"],
  products:["d_api","d_feed","d_cti"],
  vendors:[
    {name:"GreyNoise", note:"Operates a global honeypot sensor network to classify internet scan-and-attack traffic.", evidence:"public"},
    {name:"Shadowserver Foundation", note:"Nonprofit running honeypot and scanning sensor infrastructure, providing internet background-noise and exposure telemetry to network owners and CERTs free of charge.", evidence:"public"}
  ],
  build:[
    "Deploy a geographically distributed fleet of low- and medium-interaction honeypot sensors across diverse ASNs and cloud providers, emulating common services (SSH, HTTP, RDP, IoT protocols).",
    "Stand up network telescopes on announced-but-unused dark IP space to passively capture unsolicited scan/probe traffic with zero interaction risk.",
    "Centralize sensor telemetry (source IP, target port, payload, timing) into a streaming pipeline; tag every observed source IP with first-seen/last-seen and scan-pattern fingerprints.",
    "Classify observed scanners into benign, malicious and unknown buckets using a labeled training set plus rule-based heuristics.",
    "Cross-reference scanner IPs against published crawler IP ranges (Shodan, Censys, academic scanners) to suppress false-positive malicious tags.",
    "Build a reputation/IP-intent scoring API so security teams can ask whether an IP is mass-scanning the internet or targeting them specifically.",
    "Run continuous QA sampling of classifications against analyst review to catch classifier drift as new scanning tools and botnets emerge.",
    "Publish a free community-tier lookup to build brand trust and a feedback loop, reserving full historical/bulk access for paid tiers."
  ],
  economics:[
    "Cost is sensor-fleet operation (cloud instance fees across many regions/ASNs) plus classification-model maintenance, comparatively cheap versus full-internet scanning.",
    "Monetized via API/feed subscriptions to SOC and SIEM teams who use it to suppress noise rather than chase every scan hit.",
    "Moat is sensor-fleet breadth and accumulated scanner-IP classification history; a new entrant needs months of sensor dwell time to build an equivalently reliable classifier.",
    "Primary value proposition is noise reduction, not detection; pricing reflects SOC analyst-hours saved rather than raw data volume."
  ],
  risks:[
    "Honeypots must be clearly isolated from production networks to avoid becoming a pivot point for real compromise.",
    "Misclassifying a malicious scanner as benign, or vice versa, directly degrades customer SOC decisions, so classification QA is a continuous operational requirement."
  ],
  fieldguide:["p_greynoise","k_scan"]
});

A({
  id:"a_malware", name:"Malware & URL intelligence",
  summary:"Multi-engine scanning and sandbox detonation of submitted files/URLs, fed by community and partner submissions.",
  recipe:[
    ["net_sandbox",3,"Core: automated sandbox detonation of submitted files/URLs produces behavioral indicators"],
    ["crowd_submissions",3,"Core: free public submission of files and URLs is the main collection engine; every upload enlarges the corpus"],
    ["emb_security",2,"Major: partner antivirus engines and security-product telemetry contribute verdicts and samples"],
    ["crowd_sharing",3,"Core: community and industry submission/sharing is the primary volume driver"],
    ["net_spamtrap",1,"Supporting: spam-trap-sourced URLs feed the detonation queue"],
    ["web_hiddenapi",1,"Supporting: hidden-API harvesting of third-party AV/reputation engines enriches verdicts"]
  ],
  stages:["p_ingest","p_label","p_enrich"],
  products:["d_api","d_cti","d_feed"],
  vendors:[
    {name:"VirusTotal", note:"Aggregates dozens of antivirus-engine verdicts plus community and partner submissions; owned by Google since 2012.", evidence:"public"},
    {name:"urlscan.io", note:"Public URL-submission sandbox that renders and screenshots submitted pages for analysis.", evidence:"public"},
    {name:"abuse.ch", note:"Community threat-sharing platform (URLhaus, MalwareBazaar) run as a nonprofit project.", evidence:"public"}
  ],
  build:[
    "Stand up a multi-engine scanning backend that runs every submitted file/URL against dozens of licensed antivirus/reputation engines in parallel.",
    "Build a sandbox detonation farm of isolated VMs/containers that executes submitted files and visits submitted URLs, capturing network calls, file-system changes, registry changes and screenshots.",
    "Open a free public submission portal so security researchers and the public upload samples/URLs, which both grows the corpus and gives submitters free lookups in return.",
    "Partner with security vendors and CERTs for bulk automated feed submissions (endpoint malware telemetry, spam-trap-sourced phishing URLs).",
    "Build a YARA/signature-matching layer so analysts can retroactively search historical submissions for newly discovered indicators.",
    "Score every submission with a composite verdict (count of engines flagging malicious, sandbox behavioral score) rather than relying on any single engine.",
    "Expose results via a free rate-limited manual-lookup UI and a paid API/intelligence tier with bulk access, retro-hunting and premium sandbox detail.",
    "Build relationship-graph features linking files, URLs, domains and IPs that co-occur across submissions for pivoting."
  ],
  economics:[
    "Primary cost is sandbox compute at submission volume plus AV-engine licensing fees paid to each participating antivirus vendor.",
    "Monetized via a freemium model: free public lookups build submission volume and brand trust, paid API/intelligence tiers fund the operation through SOC and threat-intel-team subscriptions.",
    "Moat is submission volume and historical corpus depth; the network effect of more submitters producing more coverage is hard for a new entrant to replicate quickly.",
    "Community-shared feeds rely more on sponsorship/grants than subscription revenue, trading margin for broader community trust and submission volume.",
    "Running a competitive multi-engine plus sandbox pipeline requires licensing a dozen-plus AV engines and sandbox infrastructure (estimate: meaningful fixed cost before first customer)."
  ],
  risks:[
    "Public submission portals can leak sensitive customer files/URLs that then become visible to other users of shared-intelligence tiers.",
    "Sandbox environments must be hardened against sandbox-aware malware and against becoming a staging ground for live malicious infrastructure.",
    "Composite AV verdicts can be gamed or can disagree sharply across engines, requiring clear methodology disclosure to maintain analyst trust."
  ],
  fieldguide:["p_vt","p_urlscan","p_abusech"]
});

A({
  id:"a_cti", name:"Threat-intelligence platform",
  summary:"Finished threat intelligence combining broad technical collection with analyst research and attribution.",
  recipe:[
    ["hum_analyst",3,"Core: analyst research and curation turns raw signals into finished intelligence"],
    ["web_serp",1,"Supporting: search-engine harvesting finds exposed documents, phishing kits and brand abuse"],
    ["net_bgp",1,"Supporting: routing data supports infrastructure attribution"],
    ["hum_tips",1,"Supporting: victim, researcher and insider tips seed investigations"],
    ["web_crawl",2,"Major: broad and focused crawling of forums, news, paste sites and technical sources feeds raw signal"],
    ["ug_forums",2,"Major: automated underground-forum monitoring surfaces threat-actor activity and chatter"],
    ["net_sandbox",1,"Supporting: malware detonation enriches technical indicators"],
    ["crowd_sharing",1,"Supporting: industry ISAC/ISAO sharing adds corroborating signal"]
  ],
  stages:["p_enrich","p_label","p_er","p_history"],
  products:["d_platform","d_feed","d_reports","d_cti"],
  vendors:[
    {name:"Recorded Future", note:"Combines large-scale web/technical crawling with analyst teams; acquired by Mastercard in a deal announced 2024.", evidence:"reported"},
    {name:"Google Threat Intelligence", note:"Combines Mandiant incident-response/analyst intelligence with VirusTotal data following Google's 2022 Mandiant acquisition.", evidence:"public"}
  ],
  build:[
    "Stand up broad and focused web crawlers covering news, technical blogs, paste sites, vulnerability databases and vendor advisories, with change detection on high-value sources.",
    "Layer in automated underground-forum and marketplace monitoring for threat-actor chatter and exploit/credential sales.",
    "Ingest technical telemetry (scan data, sandbox detonation results, sinkhole feeds) to ground qualitative reporting in observable indicators.",
    "Build an entity-resolution layer linking threat actors, malware families, infrastructure and CVEs into a knowledge graph.",
    "Hire and train an analyst team to triage automated collection, write finished assessments, and apply structured frameworks (MITRE ATT&CK, Diamond Model) to raw signal.",
    "Build a scoring/risk-labeling pipeline, e.g. IP/domain risk scores, that updates automatically as new corroborating signal arrives.",
    "Package output into three tiers: a raw indicator/feed API for automated consumption, a browsable analyst platform for human investigation, and narrative finished reports for executive consumption.",
    "Establish information-sharing relationships with ISACs, law enforcement and other vendors to corroborate and enrich proprietary collection.",
    "Build a historical timeline/versioning layer so analysts can trace how an assessment of an actor or campaign evolved."
  ],
  economics:[
    "Cost splits between collection infrastructure (crawling, sandboxing, sensor feeds) and analyst headcount, which scales with actor/region breadth and is the dominant recurring OpEx.",
    "Monetized via tiered enterprise subscriptions (indicator feed, platform seats, bespoke reporting) priced per seat or data volume, often bundled into broader security-platform deals.",
    "Moat is the combination of proprietary technical collection depth plus analyst expertise and relationships that are slow to replicate.",
    "Finished-report/advisory revenue carries the highest margin since it leverages existing collection infrastructure with incremental analyst time.",
    "Consolidation (CTI bundled into larger security or financial-services platforms through acquisition) is changing competitive dynamics."
  ],
  risks:[
    "Attribution claims about threat actors carry reputational and sometimes legal risk if wrong; sourcing and confidence levels must be documented.",
    "Underground-forum monitoring infrastructure touches ToS and jurisdiction-specific computer-misuse questions depending on access method.",
    "Analyst-dependent production doesn't scale linearly with customer growth, creating margin pressure as the customer base grows faster than the analyst bench."
  ],
  fieldguide:["p_rf","p_msti","k_ct"]
});

A({
  id:"a_underground", name:"Underground & cybercrime intelligence",
  summary:"Continuous monitoring and human analysis of criminal forums, marketplaces and leak sites.",
  recipe:[
    ["ug_forums",3,"Core: automated forum/market/channel monitoring is the primary collection surface"],
    ["ug_leaksites",2,"Major: ransomware leak-site monitoring tracks extortion activity and victim disclosure"],
    ["ug_dumps",2,"Major: breach-dump collection and verification supports identity-exposure and credential products"],
    ["ug_humint",1,"Supporting: covert human collection (virtual HUMINT) builds trusted access to closed communities"],
    ["hum_analyst",2,"Major: analyst curation turns raw forum/market signal into attributed, structured intelligence"]
  ],
  stages:["p_ingest","p_er","p_label","p_qa"],
  products:["d_platform","d_feed","d_cti","d_reports"],
  vendors:[
    {name:"Intel 471", note:"Maintains automated monitoring and human analyst teams covering cybercrime forums and marketplaces.", evidence:"public"},
    {name:"Flashpoint", note:"Covers deep and dark web communities including forums, marketplaces and messaging platforms.", evidence:"public"},
    {name:"KELA", note:"Focuses on darknet threat intelligence including credential and access-broker marketplaces.", evidence:"public"}
  ],
  build:[
    "Establish and maintain access to target forums/marketplaces/channels (registration, reputation-building where required, Tor/I2P connectivity).",
    "Build automated scrapers/bots for each platform's structure (forum software, Telegram channels, marketplace listings), handling CAPTCHAs and invite gating within each platform's own access rules.",
    "Monitor ransomware/extortion leak sites on a scheduled crawl cycle, capturing victim listings, proof-of-breach samples and negotiation deadlines as published.",
    "Collect and verify breach dumps that become publicly circulated on monitored forums/markets, confirming authenticity through structural and cross-source checks rather than purchase.",
    "Run entity resolution linking handles/personas across platforms, using stylometric and metadata correlation, to build actor profiles over time.",
    "Layer in trained human analysts fluent in the relevant languages and platform cultures to interpret jargon, verify claims and build source relationships within ethical/legal bounds.",
    "Classify and tag collected content (actor, TTP, target sector, credential type) using a structured taxonomy for downstream search and alerting.",
    "Build victim-notification and alerting workflows so customers learn about their own exposure as early as possible.",
    "Maintain continuous access-renewal operations, since forums rotate domains, require re-vetting, or get seized or shut down."
  ],
  economics:[
    "Cost is dominated by access-maintenance operations (persona management, platform-specific engineering) and multilingual analyst headcount, not raw storage/compute.",
    "Monetized via enterprise subscriptions priced per seat or data volume, plus bespoke investigative engagements for high-value clients.",
    "Moat is depth and continuity of platform access and persona history, built over years, plus actor-attribution history that compounds over time.",
    "Verification capability, confirming a claimed breach is real rather than a scam, is itself a differentiator customers pay a premium for."
  ],
  risks:[
    "Access methods on closed forums/markets must stay within computer-misuse and platform-access law; no unauthorized-access or criminal-purchase methods are in scope here.",
    "Breach-dump handling carries legal exposure around possession/redistribution of stolen data even when collected for defensive intelligence purposes.",
    "Persona and analyst operational security against de-anonymization by forum members is an ongoing operational risk."
  ],
  fieldguide:["p_intel471","p_flashpoint","p_kela","s_darkweb","k_darkweb"]
});

A({
  id:"a_breach", name:"Breach & identity-exposure data",
  summary:"Collection, verification and indexing of credential and breach data for consumer lookup and enterprise exposure monitoring.",
  recipe:[
    ["ug_dumps",3,"Core: breach-dump collection and verification is the primary record source"],
    ["ug_stealer",3,"Core: infostealer-log processing adds live, credential-level exposure data"],
    ["crowd_sharing",1,"Supporting: community/victim submission intake supplements collection"],
    ["web_scrape",1,"Supporting: scraping public breach-notification and paste sites catches disclosures early"]
  ],
  stages:["p_ingest","p_dedup","p_er","p_compliance"],
  products:["d_api","d_feed","d_integration"],
  vendors:[
    {name:"Have I Been Pwned", note:"Troy Hunt's breach-notification service aggregates and indexes publicly circulated breach dumps for free lookup.", evidence:"public"},
    {name:"SpyCloud", note:"Specializes in recaptured breach and infostealer-log data for account-takeover prevention.", evidence:"public"},
    {name:"Constella Intelligence", note:"Aggregates breach and leaked-credential data for identity-exposure monitoring.", evidence:"public"}
  ],
  build:[
    "Monitor the same underground forums, marketplaces and paste sites covered by underground-intelligence collection, specifically for newly circulated breach dumps and infostealer logs.",
    "Verify each dump's authenticity through structural analysis matching the claimed source's known schema/format, cross-referencing against prior known breaches, and, where lawful, notifying the apparently breached organization.",
    "Parse heterogeneous dump formats (SQL exports, CSV, plaintext credential lists, infostealer log bundles) into a canonical (email/username, source-breach, exposed-field-set, date) schema.",
    "Hash and deduplicate records across overlapping dumps so the same exposed credential isn't double-counted across re-circulated copies of the same breach.",
    "Build a free public lookup by email/domain to drive trust, awareness and inbound organic traffic, reserving bulk/API/enterprise monitoring for paid tiers.",
    "Build enterprise continuous-monitoring products that alert a company when employee or customer credentials appear in newly processed dumps/logs.",
    "Apply compliance processing at ingest: flag sensitive-category records, honor data-subject deletion/correction requests, and restrict bulk plaintext-credential export to vetted enterprise use cases.",
    "Maintain a breach-attribution database (which company, which date, what fields) separate from the raw credential records, since the attribution metadata is reusable even where raw record access is restricted."
  ],
  economics:[
    "Cost is collection/verification operations, the same underground-monitoring cost base as underground intelligence, plus parsing engineering for heterogeneous dump formats.",
    "Monetized via free consumer lookups for brand/trust building, paid enterprise API/monitoring subscriptions, and B2B integrations into identity-protection and account-takeover-prevention products.",
    "Moat is verified-dump corpus size and freshness, especially recent infostealer logs which are far more perishable and valuable than old breach dumps, plus deduplication/matching quality.",
    "Infostealer-log data commands a pricing premium over static old breach dumps because it reflects currently valid, exploitable credentials."
  ],
  risks:[
    "Possessing and redistributing breach data, even defensively, carries legal exposure around stolen-data handling that varies by jurisdiction; sourcing must avoid paying criminal sellers for access.",
    "Exposing plaintext credentials, even to legitimate customers, creates a secondary leak risk if access controls or customer vetting are weak.",
    "Victim-organization notification practices intersect with breach-disclosure law and can create liability if done incorrectly or prematurely."
  ],
  fieldguide:["p_hibp","p_spycloud","p_constella","r_stealer","s_breach"]
});

A({
  id:"a_people", name:"People-search & identity data",
  summary:"Public-record, credit-header and licensed data stitched into consumer and investigator identity profiles via heavy entity resolution.",
  recipe:[
    ["rec_bulk",3,"Core: bulk public-record downloads (property, voter, court dockets) form the base identity layer"],
    ["rec_feeds",2,"Major: paid bulk licences for property, court and vital records where no free bulk export exists"],
    ["com_coop",1,"Supporting: contributory databases (the credit-bureau model) add identity-verification signals"],
    ["web_serp",1,"Supporting: search-engine harvesting finds social profiles and web mentions for profile enrichment"],
    ["com_credit",3,"Core: credit-header data (name/address/SSN-fragment history) is the highest-fidelity identity-linking source"],
    ["rec_courts",2,"Major: court records add litigation, criminal and judgment history"],
    ["com_license",2,"Major: licensing third-party datasets (marketing lists, utility connects) fills gaps bulk/credit sources miss"],
    ["web_scrape",2,"Major: scraping public social/directory sites adds current contact and employment signal"],
    ["crowd_contacts",1,"Supporting: contact-book/caller-ID crowdsourced data supplements phone-to-identity linking"]
  ],
  stages:["p_er","p_normalize","p_enrich","p_compliance"],
  products:["d_api","d_platform","d_integration"],
  vendors:[
    {name:"LexisNexis Risk Solutions", note:"Major public-records and credit-header data aggregator serving background-check and permissible-purpose use cases.", evidence:"public"},
    {name:"TransUnion TLOxp", note:"Credit-bureau-affiliated skip-tracing and public-records platform used by investigators and collections.", evidence:"public"},
    {name:"Whitepages", note:"Consumer-facing people-search aggregating public records and directory data.", evidence:"public"},
    {name:"Spokeo", note:"Consumer people-search aggregator combining public records, social and marketing data.", evidence:"public"},
    {name:"Pipl", note:"Identity-resolution API aggregating public and licensed records for enterprise verification use cases.", evidence:"public"}
  ],
  build:[
    "License or negotiate bulk access to core public-record categories (voter registrations, property/tax assessor records, professional licenses, court dockets) refreshed on a regular cadence.",
    "Negotiate a credit-header data license with a credit bureau or reseller, requiring a permissible-purpose/FCRA-compliant use case, for name/address/SSN-fragment history as the backbone identity layer.",
    "Acquire court-record pipelines, electronic court-records systems plus in-person/physical retrieval where courts aren't digitized, for criminal, civil and judgment history.",
    "License or purchase marketing and utility-connect datasets from commercial data brokers to fill current address and household-composition gaps.",
    "Scrape public-facing directory and social profile pages at scale for current employment, contact and affiliation signal, respecting documented access restrictions and rate limits.",
    "Build a heavy entity-resolution pipeline, a probabilistic matcher such as Splink or Senzing, linking all sources to a single person-entity on fuzzy name+DOB+address+phone keys, since no single source carries a universal identifier.",
    "Normalize addresses via libpostal, phone numbers to E.164, and names with transliteration/nickname expansion before matching, to maximize true-positive linkage.",
    "Build a confidence-scored person-profile output (current/historical addresses, relatives, phone numbers, email, employment) rather than a flat merged record, so downstream users see match evidence.",
    "Implement opt-out intake and suppression-list enforcement at both ingest and serving time to comply with state data-broker and deletion-right laws.",
    "Segment product access by permissible purpose, an FCRA-regulated background-check tier versus an unrestricted marketing/people-search tier, since the same underlying data has different lawful uses."
  ],
  economics:[
    "Cost is dominated by data-licensing fees (credit-header and public-record bulk access) and the entity-resolution engineering/compute needed to stitch fragmented sources into coherent profiles.",
    "Monetized via tiered subscriptions: cheap/free consumer people-search lookups, mid-tier investigator/collections platforms, and high-margin FCRA-permissible-purpose enterprise contracts.",
    "Moat is breadth and freshness of licensed source access, especially credit-header licenses which are hard for new entrants to obtain, combined with entity-resolution accuracy tuned over years.",
    "Consumer people-search tiers face increasing data-broker-registry and deletion-law compliance cost, such as the California Delete Act, raising the regulatory cost floor for new entrants.",
    "Almost no provider builds every underlying source itself; the business is fundamentally licensing plus entity resolution, not primary collection."
  ],
  risks:[
    "FCRA governs any use touching credit, employment or tenant decisions; using people-search data for a permissible purpose without proper screening creates significant regulatory exposure.",
    "State data-broker laws and centralized deletion mechanisms like the CA Delete Act impose registration and deletion-propagation obligations that are operationally heavy at scale.",
    "Entity-resolution errors, false-merging two different people, directly harm real individuals and are a leading source of consumer complaints and litigation."
  ],
  fieldguide:["p_tlo","p_pipl","p_lexis","s_people","k_entity"]
});

A({
  id:"a_corp", name:"Corporate ownership & registry data",
  summary:"Company registration, officer and ownership-graph data assembled from registries worldwide and licensed financial filings.",
  recipe:[
    ["rec_bulk",3,"Core: bulk downloads from company registries worldwide form the base dataset"],
    ["rec_feeds",2,"Major: paid registry feeds and bulk licences in jurisdictions that charge for data"],
    ["web_focused",2,"Major: change detection on registry and gazette pages catches filings between bulk releases"],
    ["com_license",2,"Major: licensing proprietary financial/ownership datasets adds depth beyond bare registration data"],
    ["rec_foia",1,"Supporting: FOI requests fill gaps where registries don't publish bulk data"],
    ["com_mna",1,"Supporting: acquiring smaller data vendors consolidates coverage and ownership-graph depth"],
    ["rec_physical",1,"Supporting: in-person retrieval covers registries with no digital or bulk-download option"]
  ],
  stages:["p_er","p_normalize","p_enrich","p_history"],
  products:["d_api","d_bulk","d_platform","d_reports"],
  vendors:[
    {name:"OpenCorporates", note:"Maintains the largest open database of company registration records, built from scraping and bulk downloads of hundreds of registries worldwide.", evidence:"public"},
    {name:"Moody's Orbis (Bureau van Dijk)", note:"Commercial company-data and ownership-structure database built from licensed registry and financial-filing data.", evidence:"public"},
    {name:"Sayari", note:"Corporate ownership, supply-chain and risk data platform built from global registry and trade-record acquisition.", evidence:"public"}
  ],
  build:[
    "Catalog every target jurisdiction's company registry and its access method (bulk download, API, scrape-only, in-person-only) and prioritize by data quality and economic relevance.",
    "Build jurisdiction-specific bulk-download pipelines for registries that publish structured data (e.g. UK Companies House's bulk product) on a scheduled refresh cadence.",
    "For registries without bulk access, build compliant scrapers against the registry's public search interface, respecting documented rate limits and terms.",
    "File FOI/public-records requests in jurisdictions where filings exist but aren't published in bulk or via accessible search.",
    "For jurisdictions with no digital access, commission local retrieval/digitization of paper filings through in-country researchers.",
    "Normalize company names, addresses and officer names across jurisdictions, handling transliteration and legal-suffix variation, into a canonical schema.",
    "Run entity resolution linking companies to officers, shareholders and parent/subsidiary relationships into an ownership graph, resolving beneficial-ownership chains across jurisdictions.",
    "License supplementary financial-filing and credit datasets to add financial-health and risk signal beyond bare registration data.",
    "Version every filing so changes (officer appointments/resignations, address changes, dissolution) are queryable historically, not just as current state.",
    "Expose the ownership graph via API, bulk export and an investigative platform UI supporting multi-hop ownership-chain traversal."
  ],
  economics:[
    "Cost splits between per-jurisdiction collection engineering across hundreds of registries, each with its own format and access method, and the entity-resolution/graph-building compute to link them.",
    "Monetized via tiered API/bulk licensing (a free/open tier builds civic-data goodwill and brand, commercial tiers fund the operation) and enterprise due-diligence/KYC platform subscriptions.",
    "Moat is jurisdictional coverage breadth, including hard-to-reach registries, and ownership-graph depth/accuracy, both compounding with years of maintenance.",
    "Consolidation via acquisition of smaller regional data vendors is a common strategy to buy jurisdictional coverage rather than build it from scratch.",
    "Beneficial-ownership and sanctions-adjacent due-diligence use cases command the highest margin since customers pay for risk reduction, not raw lookup volume."
  ],
  risks:[
    "Some jurisdictions restrict bulk reuse or redistribution of registry data under database-right or similar law, constraining how acquired data can be repackaged.",
    "Beneficial-ownership chains deliberately obscured through shell structures and secrecy jurisdictions limit achievable resolution accuracy regardless of collection effort.",
    "Registry data quality varies enormously by jurisdiction; presenting low-confidence jurisdictions with the same authority as high-confidence ones misleads due-diligence customers."
  ],
  fieldguide:["p_opencorp","p_orbis","p_sayari","s_corp","s_beneficial"]
});

A({
  id:"a_trade", name:"Trade & customs data",
  summary:"Searchable shipment and supply-chain intelligence built from customs bill-of-lading and manifest records.",
  recipe:[
    ["rec_customs",3,"Core: customs bill-of-lading and manifest acquisition is the primary trade-shipment data source"],
    ["com_license",1,"Supporting: licensing supplementary country-specific trade datasets extends coverage"],
    ["rec_bulk",1,"Supporting: bulk trade-statistics downloads from government agencies add macro context"]
  ],
  stages:["p_ingest","p_normalize","p_er","p_enrich"],
  products:["d_api","d_bulk","d_platform"],
  vendors:[
    {name:"S&P Panjiva", note:"Aggregates customs bill-of-lading records, notably US import manifests which are public by law, into searchable trade-intelligence products.", evidence:"public"},
    {name:"ImportGenius", note:"Builds searchable import/export trade data from customs records, primarily US bill-of-lading data.", evidence:"public"}
  ],
  build:[
    "Acquire US import bill-of-lading manifest data, which US Customs and Border Protection publishes as public record, via bulk download or a licensed reseller feed.",
    "Acquire additional country-level customs/trade data where governments publish bulk or purchasable manifest/trade-statistics datasets; coverage varies enormously by country.",
    "Build a parsing pipeline to normalize shipper/consignee names, HS commodity codes, port-of-origin/destination and shipment volume/weight into a canonical schema.",
    "Run entity resolution linking shipper and consignee names, which appear with inconsistent spelling/formatting across manifests, to canonical company entities, cross-referencing against corporate-ownership data where available.",
    "Build commodity-classification normalization so free-text product descriptions map to standardized HS/commodity-code categories for aggregation.",
    "Join resolved shipment records against company and ownership data to support supply-chain-mapping queries, e.g. who supplies whom or exposure to a given country/supplier.",
    "Build time-series aggregation (trade-volume trends by commodity, route, company) since the primary customer value is pattern detection over time, not single-shipment lookup.",
    "Expose a search platform for investigative/due-diligence queries plus an API/bulk feed for customers building their own supply-chain analytics."
  ],
  economics:[
    "Cost is data-acquisition licensing where manifests aren't public, plus entity-resolution and classification engineering to make inconsistent shipper/commodity text usable at scale.",
    "Monetized via enterprise subscriptions to supply-chain-risk and trade-compliance teams, priced by seat or query volume, often bundled into broader risk/compliance platforms.",
    "Moat is country-coverage breadth, since most trade-transparency law only guarantees US-style public manifest access while other countries require commercial negotiation, plus entity-resolution quality linking messy shipper names to real companies.",
    "Primary customer use cases (supplier-risk mapping, forced-labor/sanctions supply-chain screening, competitive intelligence) command premium pricing over raw data access."
  ],
  risks:[
    "Coverage is structurally uneven: US ocean-manifest data is public by law, but equivalent transparency doesn't exist in most other countries, limiting global completeness.",
    "Commodity and entity misclassification can mislead supply-chain risk and sanctions-screening conclusions if not clearly confidence-scored.",
    "Shipment data can reveal competitively sensitive business relationships, raising provider-neutrality and conflict-of-interest considerations for customers in the same industries as the shippers."
  ],
  fieldguide:["p_panjiva","s_trade"]
});

A({
  id:"a_screening", name:"Sanctions, PEP & adverse-media screening",
  summary:"Structured watchlist data combined with analyst-curated adverse-media and PEP research, sold for AML/compliance screening.",
  recipe:[
    ["rec_bulk",3,"Core: bulk downloads of government sanctions, watchlist and PEP-adjacent registries form the structured base"],
    ["web_focused",2,"Major: continuous monitoring of news and official sites for adverse media and list updates"],
    ["rec_feeds",1,"Supporting: licensed regulator and registry feeds"],
    ["hum_analyst",3,"Core: analyst research curates and verifies PEP and adverse-media entries not published in structured lists"],
    ["rec_foia",1,"Supporting: FOI requests fill gaps in jurisdictions without published PEP registries"],
    ["web_crawl",1,"Supporting: news crawling surfaces adverse-media candidates for analyst review"],
    ["com_license",1,"Supporting: licensing third-party registry/media datasets extends jurisdictional coverage"]
  ],
  stages:["p_er","p_label","p_history","p_compliance"],
  products:["d_api","d_platform","d_bulk","d_integration"],
  vendors:[
    {name:"LSEG World-Check", note:"Long-established sanctions/PEP/adverse-media screening database, now part of London Stock Exchange Group.", evidence:"public"},
    {name:"Dow Jones Risk & Compliance", note:"Sanctions, PEP and adverse-media screening built on Dow Jones' news archive plus structured watchlist data.", evidence:"public"},
    {name:"OpenSanctions", note:"Open-source project aggregating public sanctions, PEP and crime watchlists into a free structured dataset.", evidence:"public"}
  ],
  build:[
    "Ingest every published government and multilateral sanctions/watchlist (OFAC SDN, UN Consolidated List, EU/UK sanctions lists, national equivalents) via their published bulk feeds, refreshed on each publisher's cadence, often daily.",
    "Build a PEP taxonomy and ingest structured PEP registries where governments publish them, supplemented by analyst research in jurisdictions that don't.",
    "Crawl news and public-record sources for adverse-media candidates (fraud, corruption, criminal proceedings) and route hits to analyst review rather than auto-publishing.",
    "Hire multilingual analysts to verify adverse-media and PEP candidates, assign risk categories, and write structured profile summaries with source citations.",
    "Run entity resolution to merge the same individual/entity appearing across multiple lists and spelling variants, critical since sanctions evasion often relies on name variation, using both deterministic ID matching and fuzzy name/DOB matching.",
    "Version every profile so customers can see when a record was added, updated or removed, since list changes are themselves compliance-relevant events.",
    "Build a fuzzy-matching screening API that customers run their own customer/counterparty names against, tunable for match-strictness versus false-positive rate.",
    "Build case-management workflow tooling so compliance teams can document how they resolved each screening hit.",
    "Maintain a change-log/audit-trail layer since regulated customers must demonstrate when and how they screened, not just that they did."
  ],
  economics:[
    "Cost splits between structured-list ingestion engineering, comparatively cheap and mostly automatable, and multilingual analyst research for PEP/adverse-media curation, the dominant recurring cost.",
    "Monetized via enterprise compliance-team subscriptions priced by screening volume/seats, usually sold as a mandatory compliance cost rather than a discretionary purchase, supporting premium pricing.",
    "Moat is PEP/adverse-media curation depth and entity-resolution/fuzzy-matching accuracy; open projects like OpenSanctions commoditize the structured sanctions-list layer but not the analyst-curated adverse-media layer.",
    "False-positive rate in fuzzy matching directly drives customer labor cost, since every hit requires human review, making matching-algorithm quality a real competitive differentiator."
  ],
  risks:[
    "Screening is mandated by AML/sanctions law in many jurisdictions, so errors, whether a missed true match or excessive false positives, create direct regulatory and reputational exposure for customers.",
    "Adverse-media and PEP designation can be defamatory if inaccurate or outdated; profiles need clear sourcing, update timestamps and a correction/dispute process.",
    "List-change latency matters: a newly sanctioned entity must propagate into the screening product before customers next screen, making freshness a compliance-critical SLA."
  ],
  fieldguide:["p_worldcheck","p_dj","p_opensanctions","s_sanctions"]
});

A({
  id:"a_social", name:"Social listening & event detection",
  summary:"Real-time monitoring of social platforms and news for brand mentions, topics and emerging events.",
  recipe:[
    ["web_officialapi",3,"Core: official platform APIs/firehose partnerships are the primary structured social-data source"],
    ["web_crawl",2,"Major: broad crawling of news and public web sources supplements platform-API coverage"],
    ["crowd_sharing",1,"Supporting: partner/customer-submitted signals add corroboration for event detection"],
    ["hum_coding",1,"Supporting: human coding/annotation trains and validates event-classification models"]
  ],
  stages:["p_ingest","p_label","p_enrich"],
  products:["d_platform","d_feed","d_integration"],
  vendors:[
    {name:"Brandwatch", note:"Social-listening platform built on licensed platform API/firehose access plus web/news crawling.", evidence:"public"},
    {name:"Meltwater", note:"Media and social monitoring platform combining news crawling with licensed social-platform data access.", evidence:"public"},
    {name:"Dataminr", note:"Real-time event-detection platform; has held an official data-reseller partnership with X/Twitter's firehose.", evidence:"reported"}
  ],
  build:[
    "Negotiate official API/firehose access agreements with major social platforms for full or sampled real-time post streams, since unofficial scraping at this volume is unreliable and ToS-restricted.",
    "Build broad and focused web crawlers covering news outlets, blogs and public forums to supplement platform-API coverage with non-platform public web content.",
    "Build a real-time streaming ingest pipeline, Kafka-based, capable of handling platform-scale post volume with low end-to-end latency.",
    "Train event-classification and topic-detection models using a human-coded labeled training set as the supervised baseline.",
    "Build entity extraction (NER) to tag people, organizations, locations and brands mentioned in each post, linked into the enrichment stage's entity graph.",
    "Build anomaly/spike detection on post-volume-by-topic to surface emerging events in near-real-time, tuned against historical false-positive rates.",
    "Build alerting delivery (push, email, API webhook) optimized for latency, since the core value proposition is being first to notify.",
    "License supplementary data sources, e.g. public broadcast/emergency-service feeds, to corroborate social-signal-detected events before alerting.",
    "Build dashboards and analyst workflow tools for brand/PR and corporate-security customers to triage, verify and respond to flagged mentions/events."
  ],
  economics:[
    "Cost is dominated by platform API/firehose licensing fees, often volume-tiered and expensive at full-firehose scale, plus real-time streaming infrastructure.",
    "Monetized via enterprise subscriptions priced by seat, query volume or alert volume, sold into brand/marketing, corporate-security and public-safety use cases.",
    "Moat is breadth/exclusivity of platform data-access agreements, since not every vendor gets full-firehose terms, plus detection-latency performance, the product's core competitive axis.",
    "Platform policy changes (API price increases, access revocation) are a persistent top-line risk and periodically force business-model shifts across the industry."
  ],
  risks:[
    "Dependency on platform API terms means a single policy or pricing change can materially impair the product; platforms have tightened API access and terms before.",
    "Event-detection false positives/negatives in public-safety-adjacent use cases carry real consequences if customers act on unverified alerts.",
    "Scraping non-API sources to supplement coverage runs into the same ToS/CFAA considerations as any other web-scraping method."
  ],
  fieldguide:["p_brandwatch","p_meltwater","p_dataminr","k_socialmon"]
});

A({
  id:"a_events", name:"Conflict & event data",
  summary:"Structured records of conflict and political events built from human-coded or fully automated extraction of news and local reporting.",
  recipe:[
    ["hum_coding",3,"Core: structured human coding of conflict/event reports from source material is the primary method for human-coded datasets"],
    ["web_focused",2,"Major: change detection on local news, official and NGO sources"],
    ["hum_tips",1,"Supporting: tips and partner reports from local organizations"],
    ["web_crawl",2,"Major: broad news crawling supplies automated event-coding pipelines"],
    ["hum_stringers",2,"Major: local researcher/stringer networks provide ground-level reports in under-covered regions"],
    ["hum_analyst",2,"Major: analyst review and quality control validates coded events before publication"]
  ],
  stages:["p_label","p_er","p_history"],
  products:["d_bulk","d_api","d_reports"],
  vendors:[
    {name:"ACLED", note:"Armed Conflict Location & Event Data Project; uses a structured human-coding methodology on news and local-source reporting.", evidence:"public"},
    {name:"GDELT", note:"Global Database of Events, Language and Tone; fully automated event coding from a continuous worldwide news crawl using the CAMEO coding scheme.", evidence:"public"}
  ],
  build:[
    "Define a structured event-coding taxonomy, an ACLED-style actor/event-type/location/fatality schema or an automated scheme like CAMEO, before collection begins.",
    "Build or contract a network of local researchers/stringers in each covered region who read local-language news, social media and official reports for ground-level events that international wire coverage misses.",
    "Build broad continuous news crawling, for automated approaches, across thousands of outlets in multiple languages, refreshed at high frequency.",
    "For human-coded approaches, train coders on the taxonomy and have them extract structured event records (date, location, actors, event type, fatalities, source citation) from each qualifying report.",
    "For automated approaches, apply NLP pipelines (named-entity recognition, event extraction, sentiment/tone scoring) to crawled text to auto-generate structured event records at far higher volume but lower per-record precision.",
    "Geocode every event to the most precise location the source material supports, from admin-region to point-coordinate level.",
    "Run quality-control review, ACLED-style regional analyst sign-off or automated confidence scoring, before publication, and flag low-confidence or source-conflicting events for re-review.",
    "Publish on a regular cadence, weekly for human-coded or continuous for automated, as versioned, append-only datasets supporting historical trend analysis.",
    "Build public and licensed-bulk access tiers; many conflict/event datasets maintain open academic/humanitarian access alongside commercial licensing."
  ],
  economics:[
    "Human-coded methodology cost is dominated by stringer/coder headcount, scaling with the number of regions/languages covered; automated methodology cost is dominated by crawling and NLP compute, trading precision for volume.",
    "Monetized via a mix of grant/foundation funding, common for humanitarian-use conflict data, bulk/API licensing to researchers and NGOs, and commercial subscriptions to risk/insurance/corporate-security customers.",
    "Moat for human-coded data is methodological consistency and source-network depth built over years; moat for automated data is crawl breadth and NLP pipeline maturity.",
    "Open-access or low-cost academic tiers build credibility and adoption that commercial tiers then monetize, a common pattern in this archetype."
  ],
  risks:[
    "Human coding introduces consistent-but-subjective judgment calls, e.g. what counts as a battle versus a riot, that must be documented in a public methodology to maintain analytical credibility.",
    "Automated NLP-based event extraction from news text produces more false positives/duplicates and lower location precision than human coding, requiring clear confidence/precision disclosure.",
    "Local stringers operating in conflict zones face real physical and operational-security risk that the organization has a duty to manage."
  ],
  fieldguide:["p_acled","p_gdelt","s_events","s_news"]
});

A({
  id:"a_flight", name:"Flight tracking",
  summary:"Real-time aircraft position tracking built from a crowdsourced ground receiver network extended with space-based reception.",
  recipe:[
    ["crowd_feeders",3,"Core: a crowdsourced network of ground-based ADS-B receivers is the primary data source"],
    ["sen_satrx",2,"Major: space-based ADS-B reception fills coverage gaps over oceans and remote areas"],
    ["web_officialapi",1,"Supporting: licensed aviation-authority flight-plan data supplements raw position data with schedule/route context"]
  ],
  stages:["p_ingest","p_normalize","p_enrich"],
  products:["d_api","d_feed","d_platform"],
  vendors:[
    {name:"Flightradar24", note:"Runs a global volunteer network of ground ADS-B receivers that feeders host in exchange for free premium access.", evidence:"public"},
    {name:"ADS-B Exchange", note:"Crowdsourced ADS-B network explicitly positioned as unfiltered, including aircraft that request not to be tracked elsewhere.", evidence:"public"}
  ],
  build:[
    "Design a low-cost ADS-B receiver kit (RTL-SDR dongle, Raspberry Pi, antenna) and simple feeder software so volunteers can start contributing within an hour.",
    "Recruit volunteer feeders by offering free premium platform access in exchange for hosting a receiver and streaming its raw data back continuously.",
    "Build ingest infrastructure accepting continuous low-latency position streams, ADS-B 1090MHz and MLAT-derived positions for non-ADS-B-equipped aircraft, from thousands of simultaneous feeders.",
    "Deploy or license space-based ADS-B receivers on satellite constellations to close oceanic and polar coverage gaps that ground-based receivers can't reach.",
    "Multilaterate (MLAT) aircraft positions from timing differences across multiple ground receivers for aircraft not broadcasting precise GPS-derived ADS-B positions.",
    "Normalize and deduplicate overlapping position reports from multiple feeders observing the same aircraft into a single track per flight.",
    "Enrich raw position tracks with aircraft registration, operator, and, where licensed, flight-plan/schedule data for route and ETA display.",
    "Build a real-time map/API product with historical playback, and a data-feed/API tier for enterprise customers in aviation analytics, logistics and OSINT.",
    "Build a feeder-reputation/anomaly-detection layer to catch feeders reporting corrupted or spoofed data before it reaches the merged track."
  ],
  economics:[
    "Cost is comparatively low per unit of coverage since the receiver network is volunteer-hosted, with the main OpEx being central ingest/processing infrastructure and satellite-data licensing.",
    "Monetized via freemium consumer tiers, ads/limited features free with a premium subscription for full history/features, and B2B API/data licensing to aviation, logistics, insurance and OSINT customers.",
    "Moat is feeder-network density and geographic coverage breadth, compounding with years of recruitment and hard for a new entrant to replicate quickly without an equivalent incentive program.",
    "Satellite-based coverage is a differentiator but adds real licensing cost, so the oceanic/remote-coverage tier is typically priced at a premium over ground-only coverage."
  ],
  risks:[
    "Feeder-volunteer data quality varies; corrupted, mistimed or spoofed feeds degrade multilateration accuracy if not filtered.",
    "Some jurisdictions and operators request exclusion from public tracking for sensitive government/military flights; policies on honoring versus overriding such requests are a stated product differentiator with associated controversy.",
    "Dependence on volunteer infrastructure means coverage quality is uneven in regions with low feeder density, unlike centrally operated sensor networks."
  ],
  fieldguide:["p_fr24","p_adsbx","s_adsb"]
});

A({
  id:"a_maritime", name:"Maritime intelligence",
  summary:"Vessel tracking and risk analytics built from shore-based and satellite AIS reception plus customs and connectivity corroboration.",
  recipe:[
    ["crowd_feeders",2,"Major: crowdsourced shore-based AIS receivers provide dense coastal coverage"],
    ["sen_rf",2,"Major: RF geolocation from orbit detects vessels transmitting radar or radio with AIS switched off"],
    ["sen_satrx",3,"Core: satellite AIS reception provides the open-ocean coverage shore stations can't reach"],
    ["rec_customs",1,"Supporting: customs/port-call records corroborate vessel movement and cargo context"],
    ["emb_telco",1,"Supporting: satellite-communication metadata adds vessel-connectivity corroboration for dark-vessel detection"]
  ],
  stages:["p_ingest","p_er","p_enrich","p_label"],
  products:["d_api","d_feed","d_platform"],
  vendors:[
    {name:"MarineTraffic", note:"Operates a global network of volunteer-hosted shore-based AIS receiving stations.", evidence:"public"},
    {name:"Spire Maritime", note:"Operates its own satellite constellation for space-based AIS reception, extending coverage beyond shore-station range.", evidence:"public"},
    {name:"Windward", note:"Combines AIS data with satellite imagery and other signals for maritime risk analytics, including dark-vessel detection.", evidence:"public"}
  ],
  build:[
    "Recruit a volunteer network of shore-based AIS receiver hosts, using the same incentive model as ADS-B feeder networks: free premium access in exchange for hosting a receiver near a coastline.",
    "Operate or license a satellite constellation capable of receiving AIS transponder signals from vessels beyond shore-station VHF range.",
    "Build streaming ingest for continuous position/identity broadcasts, AIS Class A/B messages including MMSI, position, speed and heading.",
    "Run entity resolution linking AIS MMSI/IMO identifiers to vessel registry records (owner, flag state, vessel class) and deduplicating vessels that broadcast inconsistent identifiers.",
    "Build dark-vessel detection: identify gaps where a vessel's expected AIS track disappears by cross-referencing satellite imagery or other corroborating signals against the expected position.",
    "Enrich vessel tracks with port-call and customs-manifest data to connect movement patterns to cargo and trade context.",
    "Build risk-scoring models (sanctions-evasion patterns, ship-to-ship transfers, loitering near restricted zones) trained on labeled historical incident data.",
    "Expose real-time tracking via map/API products and build alerting for flagged risk patterns, e.g. route deviation, AIS gaps, port calls at sanctioned facilities."
  ],
  economics:[
    "Cost combines volunteer-network coordination, low marginal cost similar to flight tracking, with satellite-AIS constellation operation or licensing, a substantial fixed cost for open-ocean coverage.",
    "Monetized via freemium consumer tracking apps, enterprise API/feed subscriptions to shipping/logistics/insurance customers, and premium risk-analytics products for sanctions-compliance and maritime-security customers.",
    "Moat is the combination of shore-network density plus owned/licensed satellite coverage, since satellite AIS reception requires real capital investment that commoditized shore-network data alone doesn't provide.",
    "Dark-vessel and sanctions-evasion detection products command the highest margin since they require proprietary modeling on top of the raw AIS feed, not just raw position lookup."
  ],
  risks:[
    "AIS is a self-reported, disableable system; vessels engaged in illicit activity routinely spoof or disable it, so detection products must be explicit about inference confidence versus ground truth.",
    "Satellite-constellation operation is capital-intensive and creates a structural cost floor that pure resellers of others' satellite data don't face.",
    "Sanctions-evasion and risk-labeling claims about specific vessels/owners carry legal and reputational exposure if wrong, similar to threat-actor attribution in CTI."
  ],
  fieldguide:["p_mt","p_windward","s_ais","k_tracking"]
});

A({
  id:"a_eo", name:"Satellite imagery",
  summary:"Earth-observation imagery captured by an owned satellite constellation, tasked and resold as raw imagery or derived analytics.",
  recipe:[
    ["sen_eo",3,"Core: operating an owned Earth-observation constellation is the primary imagery source"],
    ["crowd_mapping",1,"Supporting: crowdsourced map data supplies labels and ground truth for imagery analytics"],
    ["sen_tasking",2,"Major: tasking and archive reselling monetizes constellation capacity and third-party imagery"],
    ["sen_capture",1,"Supporting: aerial and drone capture fleets supplement satellite imagery with higher-resolution, localized tasking"]
  ],
  stages:["p_ingest","p_parse","p_label"],
  products:["d_api","d_bulk","d_platform"],
  vendors:[
    {name:"Planet", note:"Operates the Dove and SkySat constellations providing daily global imaging at varying resolutions.", evidence:"public"},
    {name:"Maxar", note:"Operates the WorldView series of high-resolution electro-optical satellites.", evidence:"public"},
    {name:"Airbus", note:"Operates the Pleiades and SPOT satellite constellations for high- and medium-resolution imagery.", evidence:"public"}
  ],
  build:[
    "Design and procure a satellite constellation sized to the target revisit-rate and resolution tradeoff: many small cheap satellites for daily global revisit, or fewer large satellites for high resolution on demand.",
    "Secure launch contracts and ground-station network agreements for downlinking imagery as satellites pass over receiving stations.",
    "Build a tasking system allowing customers to request specific areas/times be imaged, prioritized against competing tasking requests and the satellite's orbital pass schedule.",
    "Build a continuous archive-collection mode for constellations doing systematic global coverage, alongside the tasking mode, since archive and tasked imagery serve different customer needs.",
    "Build ground-segment processing: radiometric and geometric correction, orthorectification, cloud/haze masking and pan-sharpening into analysis-ready imagery.",
    "Apply automated feature detection/classification, object detection and change detection, as a value-added layer on top of raw imagery for customers who want analysis, not just pixels.",
    "Build a licensed-reseller network and a self-serve API/platform for both raw-imagery purchase and tasking requests.",
    "Maintain shutter-control and resolution-licensing compliance, since many jurisdictions regulate commercial remote-sensing resolution and distribution for certain regions/subjects."
  ],
  economics:[
    "Cost is dominated by satellite manufacturing, launch and constellation-replacement capital expenditure, plus ground-station network operating cost, the most capital-intensive archetype in the registry.",
    "Monetized via per-image/per-area tasking fees, archive-access subscriptions, and increasingly analytics-layer subscriptions (change detection, object counting) priced at a premium over raw pixels.",
    "Moat is almost entirely the constellation itself, a capital barrier to entry, plus years of accumulated archive depth for change-over-time analysis.",
    "Building and launching even a small constellation requires very substantial upfront capital (estimate: hundreds of millions of dollars for a meaningful constellation); most downstream OSINT/analytics providers buy or resell imagery rather than operate satellites."
  ],
  risks:[
    "Export-control and shutter-control regulations can restrict imaging or distribution of certain areas/resolutions, particularly for government/defense-sensitive customers.",
    "Weather and orbital-geometry constraints mean tasking requests aren't always fulfillable on the customer's desired timeline, a persistent product-reliability limitation.",
    "High capital intensity and long satellite-replacement cycles make this archetype slow to adapt to demand shifts compared to software-only archetypes."
  ],
  fieldguide:["p_planet","p_maxar","p_airbus","p_sar","s_imagery"]
});

A({
  id:"a_location", name:"Location-data brokers",
  summary:"Precise device-location data collected via consented mobile SDKs and ad-bidstream signal, aggregated and resold for analytics and advertising.",
  recipe:[
    ["emb_sdk",3,"Core: location SDKs embedded in mobile apps, under app-publisher consent/disclosure terms, are the primary precise-location source"],
    ["emb_iot",1,"Supporting: connected-vehicle and IoT telemetry supply location traces under OEM data-sharing terms"],
    ["emb_bidstream",2,"Major: real-time ad-bidstream data supplies location and device signal at very high volume"],
    ["com_marketplace",1,"Supporting: reselling via data-marketplace exchanges is a common distribution channel for aggregated location data"]
  ],
  stages:["p_ingest","p_er","p_compliance"],
  products:["d_api","d_bulk","d_marketplace"],
  vendors:[
    {name:"Kochava", note:"The FTC brought and litigated an enforcement action alleging sale of precise geolocation data without adequate consent/anonymization safeguards.", evidence:"reported"},
    {name:"X-Mode / Outlogic", note:"A 2024 FTC settlement prohibited sale of sensitive precise location data without consumer consent and required deletion of improperly collected data.", evidence:"reported"},
    {name:"InMarket", note:"A 2024 FTC settlement restricted use of location data for certain sensitive-location categories without consent.", evidence:"reported"},
    {name:"Gravy Analytics / Venntel", note:"A 2024 FTC settlement addressed sale of sensitive location data; the companies also disclosed a data breach exposing location records.", evidence:"reported"},
    {name:"Mobilewalla", note:"An FTC settlement addressed allegedly unauthorized collection and sale of consumer location and demographic data.", evidence:"reported"}
  ],
  build:[
    "Integrate a location SDK into consenting app publishers' mobile apps, with a clear in-app disclosure and an explicit opt-in consent prompt presented before any location collection begins, as required by current platform policy and FTC guidance.",
    "Design the SDK to collect only the location precision and frequency disclosed to the end user, and give the app publisher a clear description of downstream data use to pass on to users.",
    "Build a consent-state propagation system so every collected location ping carries a record of the consent under which it was collected, auditable end to end.",
    "Aggregate location pings from the SDK network into device-level movement traces, with configurable precision/frequency reduction for lower-sensitivity product tiers.",
    "Build a sensitive-location suppression layer that filters out or coarsens data near documented sensitive-location categories, such as healthcare facilities, places of worship and shelters, per current FTC guidance and settlement terms.",
    "Build a consumer-facing opt-out mechanism, app-level and, where feasible, platform-level, honored at both collection and downstream resale.",
    "Build enrichment linking device movement patterns to points-of-interest, such as store visits and commute patterns, for retail-analytics and advertising customers.",
    "Package output as aggregated/de-identified analytics products by default, with any individual-device-level product gated behind heightened consent, contractual-use restrictions and customer vetting.",
    "Maintain a deletion pipeline that can propagate a revoked-consent or opt-out signal back through raw storage, derived aggregates and any already-delivered customer extracts."
  ],
  economics:[
    "Cost is SDK-integration/publisher-relationship management, often paying app publishers a revenue share for SDK inclusion, plus the compliance infrastructure that is now a hard regulatory requirement, not optional.",
    "Monetized via direct API/bulk licensing to advertising, retail-analytics and research customers, and via data-marketplace listings for broader distribution.",
    "Moat is SDK-network breadth, the number of apps/devices covered, and, increasingly, demonstrable compliance infrastructure, since FTC enforcement has made inadequate consent/deletion practices an existential business risk.",
    "The regulatory environment has repriced this archetype: 2024 FTC orders banned the sale of sensitive location data by several brokers, shrinking addressable use cases and raising compliance costs industry-wide."
  ],
  risks:[
    "This is the most heavily enforced archetype in the registry: multiple FTC actions from 2022-2024 found inadequate consent, insufficient anonymization, and sale of sensitive-location data to be unfair or deceptive practices.",
    "State privacy laws increasingly classify precise geolocation as sensitive data requiring opt-in consent and giving consumers deletion rights, raising compliance complexity across jurisdictions.",
    "Anonymized/aggregated location data has been repeatedly shown re-identifiable at the individual-device level, undermining a common prior industry defense."
  ],
  fieldguide:["s_mobile","k_adtech","d_adint","r_privacy"]
});

A({
  id:"a_caller", name:"Caller ID & phone intelligence",
  summary:"Name-to-number resolution and spam detection built from crowdsourced contact-book uploads.",
  recipe:[
    ["crowd_contacts",3,"Core: crowdsourced contact-book uploads from app users build the caller-ID database"],
    ["emb_telco",1,"Supporting: telecom carrier data partnerships add spam/robocall signal and number-validity data"],
    ["com_credit",1,"Supporting: licensed identity data supplements name-to-number resolution for unlisted numbers"]
  ],
  stages:["p_ingest","p_er","p_compliance"],
  products:["d_api","d_platform"],
  vendors:[
    {name:"Truecaller", note:"Builds its caller-ID database substantially from users' uploaded contact-book data, disclosed in its app permissions and privacy policy.", evidence:"public"},
    {name:"Hiya", note:"Caller-ID and spam-detection platform combining crowdsourced reports with carrier data partnerships.", evidence:"public"}
  ],
  build:[
    "Build a mobile app that, with explicit user consent at install/first-run, requests permission to access and upload the user's device contact book.",
    "Present a clear disclosure of what is collected and how it will be used, shared and pseudonymized to build a crowdsourced caller-ID database, before requesting the permission, consistent with platform contact-permission requirements.",
    "Aggregate uploaded contact-book entries across the user base: when many users' address books independently list the same number under the same name, confidence in that name-to-number mapping increases.",
    "Build entity resolution that reconciles conflicting name labels for the same number into a best-confidence display name, with spam/scam reports weighted separately from legitimate identity labels.",
    "Build a separate spam/scam-reporting flow where users flag incoming calls, feeding a distinct spam-likelihood score per number independent of the identity-labeling pipeline.",
    "Partner with telecom carriers for call-metadata signals, such as volume/pattern anomalies associated with robocalling, to corroborate crowd-reported spam signal.",
    "Build real-time caller-ID lookup serving, sub-second response on an incoming call, as the core latency-sensitive product requirement.",
    "Implement a consumer opt-out/number-removal request process honoring requests to delist a number from the caller-ID database.",
    "Build jurisdiction-aware consent handling, since contact-book collection, use and cross-border transfer are regulated differently; GDPR-covered contacts in particular require careful lawful-basis documentation for the non-uploading third parties whose data appears in someone else's contact book."
  ],
  economics:[
    "Cost is primarily app-platform engineering and the compliance/consent infrastructure; the underlying data-collection cost is near-zero marginal since it's driven by user-initiated uploads, not provider-operated collection.",
    "Monetized via freemium consumer app subscriptions, an ad-supported free tier plus a paid ad-free/premium-feature tier, and B2B spam/fraud-detection API licensing to telecoms and other platforms.",
    "Moat is network effect: database coverage and accuracy improve with every additional user, making an incumbent with a large installed base hard to displace on data quality alone.",
    "The business model's core tension is that the product's value depends on data about people who never consented themselves, only the uploading contact's consent to upload, a structural third-party-data problem distinct from most other archetypes."
  ],
  risks:[
    "The core mechanic collects data about non-users, everyone in an uploader's contact book, who never directly consented, a recurring focus of privacy-regulator scrutiny in multiple jurisdictions.",
    "GDPR and similar regimes require a documented lawful basis even for data about these non-consenting third parties, which is operationally difficult to satisfy at the individual level.",
    "Spam/scam labeling of a number can be wrong or malicious, e.g. coordinated false-reporting, requiring abuse-resistant scoring rather than simple vote-counting."
  ],
  fieldguide:["s_phone","k_email"]
});

A({
  id:"a_archive", name:"Web archives & crawl corpora",
  summary:"Systematic preservation and publishing of historical web page captures and open crawl corpora.",
  recipe:[
    ["web_crawl",3,"Core: broad, systematic web crawling is the primary collection mechanism"],
    ["web_archive",3,"Core: dedicated archiving/snapshotting infrastructure preserves point-in-time page captures"],
    ["crowd_sharing",1,"Supporting: user-submitted save requests and partner contributions extend crawl coverage"]
  ],
  stages:["p_ingest","p_history","p_parse"],
  products:["d_bulk","d_api"],
  vendors:[
    {name:"Internet Archive", note:"Nonprofit operating the Wayback Machine, performing broad web crawling and preservation since 1996.", evidence:"public"},
    {name:"Common Crawl", note:"Nonprofit publishing regular open web-crawl corpora in WARC format, used widely as an AI-pretraining and research data source.", evidence:"public"}
  ],
  build:[
    "Build or operate a broad web crawler, seeded from a large URL list plus link-discovery from already-crawled pages, that captures full page content, not just metadata, on a recurring schedule.",
    "Store every capture in WARC (Web ARChive) format, the standard that preserves full HTTP request/response data including headers, enabling faithful later replay.",
    "Build a dedicated on-demand archiving/snapshotting service, a save-this-page-now capability, alongside the systematic crawl, since users and partners often need a specific page preserved before it changes or disappears.",
    "Respect robots.txt and documented site-owner opt-out/takedown requests at crawl time and for already-archived content, maintaining a takedown-request handling process.",
    "Build deduplication at the WARC-record level, content hash, to avoid storing identical captures repeatedly while still preserving a timestamped version history.",
    "Build a replay/playback system that reconstructs a historical page's appearance and behavior from stored WARC records, handling relative-link rewriting and missing-resource fallback.",
    "Publish regular open corpus releases in a standard, widely adoptable format to drive external research and AI-training-data use.",
    "Build a public search/lookup interface, URL to timestamp-indexed captures, as the primary consumer-facing product alongside bulk corpus access for researchers."
  ],
  economics:[
    "Cost is dominated by storage at enormous and ever-growing scale, since every historical snapshot is retained, not just the latest, plus crawl bandwidth.",
    "Monetized atypically relative to other archetypes: largely grant/donation/foundation-funded nonprofit operation rather than direct subscription revenue, since the core mission is public-interest preservation and open research access.",
    "Moat is historical depth, decades of snapshots cannot be retroactively created, and crawl-corpus scale/openness, which paradoxically makes the data a foundational input other commercial archetypes build on rather than compete with directly.",
    "Open licensing of crawl corpora has become a de facto industry-standard input for AI pretraining, creating indirect monetization pressure and value even without direct resale."
  ],
  risks:[
    "Takedown-request handling and robots.txt compliance for already-archived historical content creates an ongoing tension between preservation completeness and respecting later-expressed removal requests.",
    "Hosting copyrighted and sometimes removed or controversial content for preservation purposes intersects with copyright and intermediary-liability law across jurisdictions.",
    "Open crawl corpora being widely used as AI-training input has drawn scrutiny, and litigation targeting downstream users, over whether the original crawl respected site-level usage terms."
  ],
  fieldguide:["p_wayback","p_cc","s_archives","r_linkrot"]
});

A({
  id:"a_scrapeinfra", name:"Scraping infrastructure",
  summary:"Proxy networks and managed scraping/unblocking services sold to other companies as collection infrastructure.",
  recipe:[
    ["web_proxy",3,"Core: proxy and unblocking infrastructure is the core product these vendors sell"],
    ["web_serp",2,"Major: SERP APIs are a flagship product for scraping-infrastructure vendors"],
    ["web_mobileapi",1,"Supporting: managed scraper APIs for social and e-commerce platforms often target mobile app endpoints"],
    ["web_scrape",2,"Major: managed scraping/extraction services built on top of the proxy layer"],
    ["emb_sdk",1,"Supporting: consented SDK-based residential-proxy peer networks, opt-in and disclosed, supply some residential IP pools"]
  ],
  stages:["p_ingest","p_qa"],
  products:["d_api","d_integration","d_marketplace"],
  vendors:[
    {name:"Bright Data", note:"Operates a large residential and datacenter proxy network plus managed scraping products and pre-collected datasets. Won 2024 rulings in suits brought by Meta and X over scraping logged-out public data.", evidence:"reported"},
    {name:"Oxylabs", note:"Operates residential and datacenter proxy infrastructure plus managed scraping APIs.", evidence:"public"},
    {name:"Zyte", note:"Managed web-scraping platform, formerly Scrapinghub, and maintainer of the Scrapy framework.", evidence:"public"},
    {name:"Apify", note:"Scraping-automation platform offering a marketplace of pre-built scraping actors.", evidence:"public"}
  ],
  build:[
    "Build a datacenter proxy pool, owned or leased IP ranges across many hosting providers and geographies, as the baseline unblocking product tier.",
    "Build a residential IP pool sourced only through explicitly disclosed, opt-in consent mechanisms, e.g. a free app/SDK that clearly discloses its users' devices will route proxy traffic, with a clear consent prompt and opt-out, since covert or non-consensual residential-proxy sourcing is a documented source of regulatory and litigation risk.",
    "Build a proxy-rotation and session-management layer that assigns and rotates IPs per request or per session to avoid single-IP rate-limiting by target sites.",
    "Build anti-bot countermeasure-handling, headless-browser fingerprint normalization, CAPTCHA-solving integration and TLS/JA3 fingerprint matching, as a managed layer above raw proxying.",
    "Build a managed scraping-API product where the customer submits a target URL/site and the platform handles proxying, rendering and extraction, returning structured data.",
    "Build a marketplace of pre-built, site-specific scraping templates (actors) that customers can run directly rather than building extraction logic themselves.",
    "Build compliance tooling, per-target robots.txt and rate-limit awareness, customer-facing documentation on lawful use, since the infrastructure itself is dual-use and provider-level ToS/legal exposure follows customer behavior.",
    "Build usage monitoring and abuse-detection to identify and restrict customers using the infrastructure for activity outside documented lawful-use terms."
  ],
  economics:[
    "Cost is proxy-network acquisition/maintenance, with datacenter IP leasing comparatively cheap while consented residential-network acquisition and compliance is more operationally expensive, plus continuous anti-bot countermeasure engineering.",
    "Monetized primarily by bandwidth/request-volume pricing on the proxy layer, with higher-margin per-request pricing on managed-scraping-API and marketplace-actor products.",
    "Moat is IP-pool scale/diversity and anti-bot countermeasure sophistication, both requiring continuous reinvestment as target sites upgrade their own defenses.",
    "Residential-proxy legitimacy, specifically how IPs are sourced and consented, has become a commercial differentiator and a legal-risk factor after public scrutiny of the sector's sourcing history."
  ],
  risks:[
    "Residential-proxy sourcing that isn't clearly disclosed and consented crosses directly into the hard boundary on consumer/device data; only the disclosed, opt-in model is a defensible build pattern.",
    "Infrastructure is dual-use: the same proxy/anti-bot layer that serves legitimate price-monitoring customers can be used by customers scraping in violation of target-site ToS or applicable computer-misuse law, creating provider-level exposure.",
    "Anti-bot countermeasure escalation, target sites deploying ever more aggressive detection, is a continuous cost center with no stable end state."
  ],
  fieldguide:["p_brightdata","p_oxylabs","p_zyte","p_apify","k_antibot","g_cfaa"]
});

A({
  id:"a_face", name:"Face search",
  summary:"Reverse image search over faces, built by scraping publicly posted images and indexing facial embeddings.",
  recipe:[
    ["web_scrape",3,"Core: large-scale scraping of publicly posted images from the open web builds the search index"],
    ["web_crawl",1,"Supporting: broad crawling discovers new image-bearing pages to feed the scraper"],
    ["web_hiddenapi",1,"Supporting: hidden-API harvesting of social-platform media endpoints supplements public-page scraping with higher-volume image discovery"]
  ],
  stages:["p_er","p_label","p_compliance"],
  products:["d_api","d_platform"],
  vendors:[
    {name:"Clearview AI", note:"Scraped billions of images from the public web and social media to build a face-search index. Fined by data-protection authorities including Italy, France, Greece and the Netherlands, and ordered to stop processing residents' data in other jurisdictions (e.g. by Australia's privacy regulator).", evidence:"reported"},
    {name:"PimEyes", note:"Consumer/commercial face-search engine built on scraped web images; subject to regulatory and press scrutiny over consent and use.", evidence:"reported"}
  ],
  build:[
    "Build a broad web crawler targeting publicly accessible pages likely to contain faces, such as social-media profiles, news articles and public photo galleries.",
    "Scrape and download publicly posted images at scale, retaining the source URL for each as provenance metadata.",
    "Run face-detection on every downloaded image to extract face crops and discard non-face images before further processing.",
    "Generate a facial embedding, a vector representation, for each detected face using a trained face-recognition model, storing the embedding rather than reprocessing raw images on every query.",
    "Index embeddings in a high-dimensional approximate nearest-neighbor search structure supporting fast similarity search at billions-of-faces scale.",
    "Build the query path: a submitted probe image is embedded with the same model and matched against the index, returning candidate matches ranked by similarity score alongside the original source URL.",
    "Build access controls restricting query submission to vetted/contracted use cases given the sensitivity of the product.",
    "Build a removal/opt-out intake process for individuals requesting their images be excluded from the index."
  ],
  economics:[
    "Cost is crawling/storage at web scale plus the one-time-per-image face-detection and embedding-generation compute, comparatively cheap versus the index-serving infrastructure needed for fast similarity search at scale.",
    "Monetized via per-seat or per-query licensing to law-enforcement, security and, for some vendors, consumer customers, priced at a premium given the product's sensitivity and restricted customer base.",
    "Moat is index scale/freshness, the number of unique indexed faces, and embedding-model accuracy, both compounding with continued crawling and model refinement.",
    "Regulatory restrictions in multiple jurisdictions have materially constrained the addressable customer base and market entry, a direct cost of the collection method's legal exposure."
  ],
  risks:[
    "Scraping and indexing faces from public images without consent has drawn major regulatory fines and sales restrictions under GDPR and similar biometric-data regimes in multiple countries.",
    "The EU AI Act prohibits creating or expanding facial-recognition databases through untargeted scraping of facial images, closing this collection method within the EU.",
    "Face-search misuse, such as stalking or unauthorized surveillance, is a documented harm vector that drives both regulatory action and customer-vetting obligations for any provider in this space."
  ],
  fieldguide:["p_clearview","p_pimeyes","g_aiact","g_gdpr","k_reverseimg"]
});

A({
  id:"a_chain", name:"Blockchain intelligence",
  summary:"Address clustering and attribution over public blockchain transaction graphs, used for compliance screening and investigation.",
  recipe:[
    ["web_crawl",2,"Major: crawling exchange, forum and public-web sources supplies attribution clues linking addresses to real-world identities"],
    ["ug_forums",2,"Major: monitoring criminal forums/markets surfaces wallet addresses tied to illicit activity"],
    ["hum_analyst",3,"Core: analyst investigation builds and validates the address-attribution database"],
    ["crowd_sharing",1,"Supporting: law-enforcement and industry information-sharing corroborates attribution"]
  ],
  stages:["p_er","p_label","p_enrich"],
  products:["d_platform","d_api","d_reports"],
  vendors:[
    {name:"Chainalysis", note:"Blockchain analytics platform with extensive law-enforcement and exchange-customer contracts; maintains proprietary address-attribution data.", evidence:"public"},
    {name:"Elliptic", note:"Blockchain analytics platform providing address-risk scoring and attribution for compliance and investigation use cases.", evidence:"public"},
    {name:"TRM Labs", note:"Blockchain intelligence platform combining on-chain analysis with attribution research for compliance and law-enforcement customers.", evidence:"public"}
  ],
  build:[
    "Run full nodes for every target blockchain, Bitcoin, Ethereum and major others, to ingest the complete public on-chain transaction graph directly rather than relying on third-party block explorers.",
    "Build clustering heuristics, the common-input-ownership heuristic and change-address detection, to group addresses that likely belong to the same real-world wallet/entity, the foundational entity-resolution step for blockchain data.",
    "Build an attribution-research pipeline where analysts tie clusters to real-world identities using public information: exchange deposit addresses, sanctioned-entity disclosures, court documents and voluntary disclosures from investigated entities.",
    "Monitor underground forums, ransomware leak sites and marketplace listings for wallet addresses associated with illicit transactions, ransom demands or stolen-fund flows.",
    "Build a risk-scoring model for every address/cluster, factoring proximity, number of hops, to known illicit clusters such as sanctioned entities, darknet markets, ransomware wallets and mixers.",
    "Partner with exchanges, law enforcement and industry-sharing groups to corroborate attribution and receive tips on newly identified illicit clusters.",
    "Build transaction-tracing tooling, fund-flow visualization across hops including through mixers/bridges where traceable, for investigator workflows.",
    "Build a compliance-screening API so exchanges and financial institutions can screen incoming/outgoing transactions against the risk-scored address database in real time.",
    "Continuously re-score and re-cluster as new attribution evidence arrives, since blockchain intelligence is inherently probabilistic and improves with more corroborating data over time."
  ],
  economics:[
    "Cost is dominated by analyst-driven attribution research, the actual moat, plus full-node infrastructure for every covered chain, comparatively cheap since blockchain data itself is public.",
    "Monetized via compliance-screening API subscriptions to exchanges/financial institutions, often a regulatory necessity for them supporting premium pricing, investigative-platform licenses to law enforcement, and bespoke tracing engagements.",
    "Moat is attribution-database depth and accuracy, not transaction-graph access which is public and free to replicate; years of accumulated attribution work are the real barrier to entry.",
    "Multi-chain and cross-chain, bridge/mixer, tracing capability commands premium pricing as illicit actors increasingly use cross-chain obfuscation techniques, a continuously evolving technical arms race."
  ],
  risks:[
    "Attribution claims tying an address cluster to a specific real-world entity carry legal and reputational risk if wrong, similar to threat-actor attribution in CTI.",
    "Clustering heuristics can mis-group addresses, e.g. CoinJoin and other privacy-preserving transaction patterns can defeat common-ownership heuristics, and overstated confidence undermines investigative and compliance decisions built on it.",
    "Mixer/privacy-coin usage structurally limits achievable traceability for a growing share of illicit activity, a persistent methodological ceiling rather than a solvable engineering problem."
  ],
  fieldguide:["p_chainalysis","p_elliptic","p_trm","s_blockchain","k_crypto"]
});

A({
  id:"a_llm", name:"Foundation-model pretraining corpus",
  summary:"The web-crawl, book, code and licensed-content corpus assembled to pretrain a large language or multimodal model.",
  recipe:[
    ["ai_crawl",3,"Core: dedicated large-scale pretraining web crawls are the primary volume source"],
    ["ai_multimodal",2,"Major: image-text and video corpora for multimodal pretraining"],
    ["ai_synthetic",2,"Major: synthetic and model-generated data fills gaps in reasoning, code and low-resource domains"],
    ["ai_speech",1,"Supporting: consented speech corpora for audio and speech capabilities"],
    ["ai_userdata",1,"Supporting: opted-in product interaction data for later training rounds"],
    ["ai_corpus",3,"Core: corpus derivation, filtering and deduplication turns raw crawl into trainable data"],
    ["ai_books",2,"Major: book acquisition adds long-form, high-quality text density"],
    ["ai_code",2,"Major: code corpora are essential for coding-capable models"],
    ["ai_license",1,"Supporting: direct licensing deals secure content unavailable or restricted via crawling"],
    ["ai_rights",1,"Supporting: rights clearance and opt-out handling manages legal exposure across all of the above"]
  ],
  stages:["p_ingest","p_parse","p_dedup","p_qa"],
  products:["d_dataset","d_model"],
  vendors:[
    {name:"OpenAI", note:"Trains GPT models on a mix of web crawl, licensed content and other sources; has entered content-licensing deals with publishers.", evidence:"reported"},
    {name:"Anthropic", note:"Trains Claude models on web and other text sources; subject to the Bartz v. Anthropic litigation concerning use of pirated book sources in earlier training data.", evidence:"reported"},
    {name:"Google", note:"Trains Gemini models on a mix of web crawl, licensed and proprietary data sources.", evidence:"public"},
    {name:"Meta", note:"Trains Llama models on web and other sources; subject to the Kadrey v. Meta litigation concerning use of shadow-library book sources.", evidence:"reported"},
    {name:"Common Crawl / FineWeb / Dolma / The Pile", note:"Open pretraining corpora built from Common Crawl and other public sources by the Common Crawl Foundation, HuggingFace, Allen Institute for AI and EleutherAI respectively.", evidence:"public"}
  ],
  build:[
    "Stand up dedicated pretraining web crawlers, distinct from a general search-index crawler, that prioritize text density and language/topic diversity over page-rank-style quality signals, often building on or deriving from Common Crawl's open crawl infrastructure.",
    "Respect robots.txt and documented AI-crawler-specific opt-out directives, a dedicated AI-crawler user-agent that sites can block separately from general web crawling, at crawl time.",
    "Run corpus derivation on raw crawl output: boilerplate stripping, language identification, quality filtering, perplexity-based or classifier-based filtering against a high-quality reference set, and toxic/low-value content filtering.",
    "Run large-scale deduplication, MinHash/LSH at the document level and exact substring dedup at the n-gram level, since near-duplicate content measurably degrades pretraining efficiency.",
    "Acquire code corpora separately from general web text via public code-hosting-platform data, respecting platform terms, and license-aware filtering that tracks source-repository licenses for downstream use clarity.",
    "Acquire book-length text through licensing deals with publishers/rights-holders; building from pirated shadow-library sources is a documented practice in prior industry litigation, not an instructable method here.",
    "Negotiate direct content-licensing deals with publishers, platforms and rights-holders for content that's valuable but not well covered by crawling, such as forums, news archives and specialized corpora.",
    "Build a rights-clearance and provenance-tracking layer recording the source and license terms of every corpus component, supporting legal defensibility and any contractual reporting obligations to licensors.",
    "Run continuous QA on the assembled training corpus: contamination checks against evaluation benchmarks, toxicity/bias sampling, and poisoning-detection scans for adversarially inserted content.",
    "Mix and weight the final corpus, web text, code, books, licensed content, according to an empirically tuned data-mixture recipe, since relative proportions materially affect downstream model capability."
  ],
  economics:[
    "Cost is dominated by crawl infrastructure and the compute for corpus-scale filtering/deduplication, processing far more raw text than ends up in the final training set, plus increasingly large content-licensing fees.",
    "Content-licensing deal values have grown from modest early sums into substantial multi-year agreements as publishers gained leverage through litigation; figures are rarely disclosed consistently.",
    "Open pretraining corpora lower the barrier to entry for smaller labs/researchers but don't include the licensed and proprietary components that leading labs increasingly rely on for a competitive edge.",
    "Monetized indirectly: the corpus itself isn't usually sold; it's the input whose quality determines the resulting model's capability, which is then monetized via API and product access.",
    "Moat is a combination of proprietary/licensed content not available to crawl-only competitors, corpus-curation/filtering sophistication, and, for some labs, exclusive access to proprietary data unavailable to outside crawlers."
  ],
  risks:[
    "Copyright litigation is the dominant legal risk: Anthropic settled Bartz v. Anthropic in 2025 over books from pirate libraries, Kadrey v. Meta produced a narrow fair-use ruling for Meta in 2025, and The New York Times v. OpenAI is ongoing.",
    "The EU AI Act imposes training-data transparency duties (a public training-content summary and a copyright policy) on general-purpose AI model providers.",
    "robots.txt and AI-crawler opt-out adoption has grown as site owners push back on uncompensated crawling, creating both a coverage gap and reputational pressure to negotiate licensing instead."
  ],
  fieldguide:["r_llm","r_genai","g_aiact","g_robots"]
});

A({
  id:"a_posttrain", name:"Post-training & RLHF data vendor",
  summary:"Human annotation, preference-ranking and expert-generated data produced to order for foundation-model post-training.",
  recipe:[
    ["ai_annotation",3,"Core: human annotation and preference-ranking data collection is the primary product"],
    ["hum_expert",1,"Supporting: expert-network style recruiting and compliance screening sources domain experts"],
    ["ai_expert",2,"Major: expert-authored and domain-specialist data commands premium post-training use cases"],
    ["ai_synthetic",1,"Supporting: synthetic/distilled data supplements human annotation for scale and cost reduction"]
  ],
  stages:["p_label","p_qa"],
  products:["d_dataset"],
  vendors:[
    {name:"Scale AI", note:"Provides human-labelled and RLHF data services to foundation-model developers. Meta took a 49% stake in 2025.", evidence:"reported"},
    {name:"Surge AI", note:"Provides human data-labeling and RLHF services, reported to work with major foundation-model labs.", evidence:"reported"},
    {name:"Appen", note:"Long-established data-annotation vendor serving search, ads and AI-training customers.", evidence:"public"},
    {name:"Mercor", note:"Platform connecting vetted domain experts to AI labs for expert-data generation and evaluation work.", evidence:"reported"}
  ],
  build:[
    "Recruit and vet a global annotator workforce across skill tiers: general crowdworkers for high-volume simple tasks, and credentialed domain experts (coders, lawyers, scientists, doctors) for specialized post-training data.",
    "Build a task-management platform that issues annotation tasks, preference ranking between model outputs, response rewriting, red-teaming prompts and step-by-step reasoning traces, with clear instructions and quality rubrics.",
    "Build preference-collection tooling for RLHF/RLAIF: present annotators with two or more model outputs for the same prompt and collect a ranked or pairwise preference judgment, the core data format for reinforcement learning from human feedback.",
    "Train annotators on each client's specific rubric and model-behavior guidelines, since annotation quality requirements vary significantly by customer and task type.",
    "Build inter-annotator agreement monitoring, overlapping task assignment and agreement-rate scoring, to catch low-quality or inattentive annotators before their output reaches a client deliverable.",
    "Build a tiered QA review process where a sample of annotated data is reviewed by senior annotators or internal QA staff before delivery, with rejected batches sent back for rework.",
    "Build synthetic-data generation pipelines, using a strong model to generate or critique candidate training examples, to supplement human annotation for tasks where it reduces cost without sacrificing quality.",
    "Build secure delivery pipelines for client data, often including proprietary model outputs that must not leak, with contractual confidentiality and access controls.",
    "Build annotator compensation and task-routing systems that scale task allocation to thousands of concurrent workers across time zones for continuous-throughput delivery."
  ],
  economics:[
    "Cost is almost entirely annotator labor, paid per task or per hour, scaled across a large distributed workforce, with technology/platform cost a secondary line.",
    "Monetized via per-task, per-hour or project-based contracts with foundation-model labs, often as multi-year strategic supply relationships given labs' recurring post-training data needs.",
    "Domain-expert annotation, coders, scientists, medical/legal professionals, commands substantially higher per-task pricing than general crowdwork, reflecting both scarcity and the higher capability ceiling it unlocks in post-trained models.",
    "Moat is workforce quality/vetting infrastructure and client-specific process maturity, rubric design and QA pipelines, rather than any proprietary dataset, since the work product is typically delivered exclusively to the paying client.",
    "Synthetic-data generation is increasingly substituting for human annotation on well-defined tasks, pressuring margins on commodity annotation work while leaving genuinely novel/subjective judgment tasks reliant on humans."
  ],
  risks:[
    "Annotator working conditions and compensation, especially for workers in lower-cost labor markets performing sometimes psychologically difficult content-moderation-adjacent tasks, have drawn press and labor-rights scrutiny across the industry.",
    "Client confidentiality is a continuous operational risk since annotators routinely see unreleased model outputs and prompts that competitors or the public shouldn't see before release.",
    "Annotation-quality variance directly affects the trained model's behavior, so inadequate QA has downstream product-safety consequences for the client, not just a data-quality metric."
  ],
  fieldguide:["r_llm"]
});

A({
  id:"a_ailicense", name:"AI data licensing & brokerage",
  summary:"Negotiated licensing deals converting a platform's or publisher's content library into a contracted AI-training data supply.",
  recipe:[
    ["ai_license",3,"Core: structuring and negotiating content-licensing deals is the defining activity of this archetype"],
    ["ai_rights",2,"Major: rights clearance and provenance documentation underpins every licensing deal"],
    ["ai_multimodal",1,"Supporting: image/video corpora are a common licensed-content category alongside text"]
  ],
  stages:["p_compliance","p_history"],
  products:["d_dataset"],
  vendors:[
    {name:"Reddit", note:"Entered a data-licensing agreement reported to be with Google, covering access to Reddit content for AI training/products.", evidence:"reported"},
    {name:"Shutterstock", note:"Has entered content-licensing deals with multiple AI companies for image/training-data use.", evidence:"reported"},
    {name:"Getty Images", note:"Has entered AI-training licensing deals while separately litigating, Getty Images v. Stability AI, over unlicensed use of its image library.", evidence:"reported"},
    {name:"News publishers", note:"Several major publishers, e.g. Axel Springer, have entered licensing deals with AI companies; others, e.g. The New York Times, are separately litigating over unlicensed use.", evidence:"reported"}
  ],
  build:[
    "Inventory the content library being licensed, text archive, image/video catalog or user-generated-content platform corpus, and establish clear internal chain-of-title/rights ownership before any external negotiation.",
    "Build a rights-clearance process confirming the licensor actually holds the rights needed for AI-training use specifically, distinct from, and often not automatically covered by, prior publishing/display licenses.",
    "Negotiate licensing-deal structure: flat fee, per-token/per-record pricing, or ongoing royalty tied to model revenue or usage, and decide on exclusivity versus non-exclusive multi-licensee terms.",
    "Define the scope of permitted use precisely in contract, pretraining only versus fine-tuning versus output-generation rights, time-boxed versus perpetual, specific model families versus any future model.",
    "Build a data-delivery pipeline, API access, bulk export or an ongoing feed for continuously updated content like a forum or news archive, matching the negotiated access model.",
    "Build provenance and usage-reporting infrastructure so the licensor can audit or verify the content is used within contracted bounds, and the licensee can demonstrate compliant sourcing if challenged.",
    "Build an opt-out/exclusion mechanism for sub-rights-holders, individual users on a platform or freelance contributors to a stock-image library, whose content is bundled in a platform-level deal but who may hold separate rights or opt-out entitlements.",
    "Structure ongoing-content deals, news and forums, as continuously renewing feeds with periodic rate renegotiation rather than one-time snapshot sales, since freshness has ongoing value to the licensee.",
    "Maintain a public-facing stance on licensing-deal disclosure and opt-out documentation that supports the broader industry shift from unlicensed crawling toward negotiated compensation."
  ],
  economics:[
    "Revenue for content owners comes from negotiated licensing fees, which have grown from modest early deals toward larger multi-year agreements as labs' willingness to pay and publishers' leverage (through litigation and collective bargaining) both increased; deal figures are rarely disclosed consistently.",
    "Pricing models vary by content type and deal structure: flat fees are common for static archives/catalogs, while ongoing feeds, news and forums, often carry recurring or usage-tied royalty structures.",
    "Moat for the content owner is exclusivity and uniqueness of the underlying corpus, content not otherwise obtainable via open crawling; moat for the AI-company licensee is securing access ahead of competitors, especially as content is progressively locked behind opt-outs and paywalls.",
    "Litigation outcomes against AI companies for unlicensed use directly affect licensing-market pricing power, because a credible infringement threat is content owners' main source of negotiating leverage."
  ],
  risks:[
    "Chain-of-title complexity, platform-level deals bundling individually rights-held user/contributor content, creates downstream liability if a licensor didn't actually hold sufficient rights to license.",
    "Concurrent litigation, Getty Images v. Stability AI and The New York Times v. OpenAI among others, over unlicensed historical use creates legal uncertainty that shapes current deal terms and pricing even for newly negotiated, properly licensed content.",
    "Platform-level licensing deals that monetize user-generated content can create user trust/backlash risk if users feel their content was licensed without adequate notice or compensation."
  ],
  fieldguide:["r_api","r_genai"]
});

A({
  id:"a_webintel", name:"Web & app market intelligence",
  summary:"Estimates of website traffic, app downloads, usage and audiences for companies that don't share their own numbers, modelled from consumer panels, partner data and public signals.",
  recipe:[
    ["emb_panel",3,"Core: opt-in browser-extension, app and desktop panels supply the behavioural clickstream that estimates are modelled from"],
    ["com_license",2,"Major: licensed partner data (ISP or measurement partners, app analytics) widens coverage and calibrates panel bias"],
    ["web_crawl",2,"Major: crawling app stores and websites captures rankings, metadata, reviews and technology signals"],
    ["emb_sdk",1,"Supporting: consented analytics SDKs inside partner apps provide direct usage measurement for calibration"],
    ["crowd_submissions",1,"Supporting: site and app owners connect their own analytics (direct measurement) in exchange for verified figures"]
  ],
  stages:["p_er","p_label","p_qa","p_compliance"],
  products:["d_platform","d_api","d_bulk"],
  vendors:[
    {name:"Similarweb", note:"Describes its data as combining a contributory panel, direct measurement from connected sites and apps, partner data and public data, modelled into traffic estimates.", evidence:"public"},
    {name:"Sensor Tower", note:"App-market intelligence on downloads, revenue and SDK usage. BuzzFeed News reported in 2020 that it owned consumer VPN and ad-blocking apps that collected usage data from users.", evidence:"reported"}
  ],
  build:[
    "Define the estimates you will sell (site visits, engagement, app downloads, revenue, audience overlap) and the precision buyers need. Panels support relative rankings long before they support absolute numbers.",
    "Recruit an opt-in panel: a browser extension, mobile app or desktop utility whose value exchange (rewards, a free tool) is explicit, with consent screens that disclose clickstream collection in plain language and a working opt-out.",
    "Instrument panel collection: visited domains and app sessions with timestamps, device and demographic attributes declared at signup, and exclusion lists for sensitive categories (health, finance, adult) applied before storage.",
    "Add direct measurement: offer site and app owners a free verified profile in exchange for connecting their analytics. Those connected properties become ground truth for calibrating panel-based estimates.",
    "License partner data to cover panel blind spots (regions, platforms, device types) under contracts that specify field-of-use and redistribution.",
    "Crawl public signals: app-store rankings, reviews, release notes, website technology stacks and search visibility.",
    "Model: reweight the panel to population benchmarks (country, device, age), train estimation models against direct-measurement ground truth, and publish confidence intervals internally even if the product shows point estimates.",
    "Run QA: backtest estimates against companies that publicly report traffic or downloads, and monitor panel drift whenever panel apps change distribution channels.",
    "Deliver through an analyst platform for marketers and investors, an API for data teams and bulk feeds for hedge funds (alternative data).",
    "Operate compliance continuously: consent records per panelist, deletion on request, k-anonymity thresholds on reported segments, and regular legal review of panel apps' disclosures."
  ],
  economics:[
    "Panel acquisition and retention is the main cost: incentives, distribution of panel apps and replacing churned panelists.",
    "Moat comes from panel size and diversity plus years of calibration history against direct-measurement ground truth; a new entrant's estimates are visibly noisier.",
    "Revenue spans marketing and sales teams (competitive benchmarking) and investors (alternative data for public-company KPIs), where the investor segment pays the highest prices per dataset.",
    "Free tiers and free verified profiles are themselves collection channels: they bring in the direct-measurement data that improves the paid product."
  ],
  risks:[
    "Panel apps that under-disclose collection have drawn regulatory action (Avast/Jumpshot) and press scrutiny; disclosure quality is existential.",
    "Investor use raises material non-public information questions if estimates derive from data a company considers confidential.",
    "Platform policy changes (browser extension rules, mobile OS privacy controls) can cut panel coverage overnight."
  ],
  fieldguide:["p_sensortower"]
});
