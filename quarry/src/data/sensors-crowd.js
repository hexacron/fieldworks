"use strict";
/* quarry data: owned-sensor methods (family `sensor`) and contributor/crowd methods (family `crowd`). */

M({
  id: "sen_eo",
  family: "sensor",
  name: "Operating an Earth-observation constellation",
  summary: "Designing, launching and operating a fleet of optical or SAR satellites to produce repeat imagery of the Earth's surface.",
  origins: ["o_physical"],
  ratings: {cost:3, scale:3, freshness:2, moat:3, legal:2},
  steps: [
    "Design a satellite bus and payload (multispectral optical, or SAR for all-weather/night imaging) sized for the target ground-sample distance and revisit rate.",
    "Secure rideshare launch slots (e.g. SpaceX Transporter missions) to deploy a constellation incrementally rather than funding a dedicated launch per satellite.",
    "Plan orbital planes with a tool like STK or GMAT to hit the target revisit cadence across your coverage area.",
    "Stand up a tasking scheduler that resolves conflicting customer requests against orbit geometry, cloud forecasts and onboard storage/power limits.",
    "Contract ground-station passes through a provider such as AWS Ground Station or KSAT instead of building a global antenna network from scratch.",
    "Downlink raw sensor data, then run radiometric calibration, orthorectification and cloud/shadow masking before anything reaches a customer.",
    "Store processed scenes as Cloud-Optimized GeoTIFFs (COG) in object storage, catalogued with a STAC-compliant metadata index.",
    "Expose a tasking API and an archive-search API separately, since tasking (future capture) and archive (past capture) have different pricing and SLAs.",
    "Monitor calibration drift across the fleet by cross-referencing overlapping scenes from different satellites and reflight of calibration targets.",
    "Track orbital decay and conjunction (collision) risk and budget propellant or replacement-launch cadence accordingly."
  ],
  tools: ["AWS Ground Station", "KSAT ground network", "SpaceX Transporter rideshare", "STK / GMAT orbit design", "GDAL", "Sentinel-1 Toolbox / GAMMA (SAR processing)", "STAC catalog spec", "Cloud-Optimized GeoTIFF"],
  economics: [
    "Satellite bus plus payload typically runs from low hundreds of thousands to several million dollars per smallsat depending on resolution and SAR vs optical (~$1-5M, estimate).",
    "Launch cost is driven by rideshare price per kg; constellation economics only work once per-satellite cost is low enough to fly dozens.",
    "Ground-station-as-a-service (AWS Ground Station, KSAT) converts a fixed antenna-network capex into a per-pass or per-minute opex line.",
    "Revenue comes from tasking (priority, high-margin), archive subscriptions, and government/defense framework contracts (e.g. NGA-style agreements).",
    "Moat is revisit frequency, sensor calibration consistency and processing-pipeline maturity, not the raw hardware, which is increasingly commoditized.",
    "Build-vs-buy: most new entrants buy bus/launch/ground-segment services and differentiate on payload design and the tasking/processing software stack."
  ],
  pitfalls: [
    "Optical imagery is unusable over persistent cloud cover, which SAR can't fully substitute for in terrain interpretation.",
    "Calibration drift between individual satellites in a constellation degrades change-detection accuracy if not tracked continuously.",
    "Tasking-to-delivery latency (orbit pass + downlink + processing) is often hours to a day, not instantaneous despite marketing claims.",
    "Orbital congestion and debris risk increase collision-avoidance maneuvers, consuming propellant and shortening satellite life."
  ],
  defenses: [
    "States restrict maximum resolution and latency available to civilian customers through shutter-control authority.",
    "Adversaries use camouflage, decoys and scheduling awareness to deny useful collection during known pass windows.",
    "Export controls on encryption and resolution-capable payloads (ITAR/EAR) restrict which customers and countries can buy raw capability."
  ],
  legal: [
    "US operators license under NOAA's Commercial Remote Sensing Regulatory Affairs office (15 CFR 960), which can impose shutter control or delay for national-security reasons.",
    "Export control (ITAR/EAR) restricts sale of high-resolution or RF-sensing payload technology and some data products to certain countries.",
    "Foreign-ownership and operator-location rules affect which jurisdiction's licensing regime applies to a given constellation."
  ],
  rules: ["g_remote", "g_radio"],
  vendors: [
    {name:"Planet", note:"Operates the Dove/SuperDove PlanetScope constellation for near-daily global optical coverage.", evidence:"public"},
    {name:"Vantor (formerly Maxar)", note:"Operates WorldView and the newer Legion very-high-resolution optical satellites; Maxar Intelligence rebranded as Vantor in October 2025.", evidence:"public"},
    {name:"Airbus (OneAtlas)", note:"Operates Pléiades, Pléiades Neo and SPOT optical satellites, sold via a cloud platform.", evidence:"public"},
    {name:"ICEYE", note:"Operates a commercial SAR smallsat constellation imaging through cloud and at night.", evidence:"public"},
    {name:"AWS Ground Station", note:"Sells pay-per-pass ground-station access used by several smallsat operators instead of owned antennas.", evidence:"public"}
  ],
  fieldguide: ["p_planet", "p_maxar", "p_airbus", "p_sar", "k_imint"]
});

M({
  id: "sen_tasking",
  family: "sensor",
  name: "Imagery tasking, archives & reselling",
  summary: "Brokering access to one or more satellite operators' tasking and archive catalogs, packaging licensing terms for resale to end customers.",
  origins: ["o_physical", "o_commerce"],
  ratings: {cost:2, scale:2, freshness:2, moat:2, legal:2},
  steps: [
    "Negotiate reseller or API-partner agreements with one or more primary operators (e.g. Planet, Vantor, Airbus) covering both tasking and archive access.",
    "Integrate each operator's tasking API and ingest their archive footprint catalog into a unified search index, normalized to a common schema (STAC is the common choice).",
    "Build a broker layer that matches a customer requirement (resolution, revisit, cloud-cover tolerance, budget) to the best-fit sensor and operator automatically.",
    "Apply each operator's license terms (resale scope, derivative-use restrictions, re-export limits) as metadata attached to every scene before it is passed downstream.",
    "Price archive access per scene or per km2, and price tasking at a premium reflecting priority queuing against the operator's own backlog.",
    "Fulfill orders via direct download links or a pass-through API, keeping an audit trail of which license terms apply to each delivered asset.",
    "Maintain a cross-operator catalog UI so customers can compare coverage and pricing without contacting each operator directly.",
    "Track SLA compliance per operator (delivery time, cloud-cover accuracy) to route future tasking toward the best performer for a given region."
  ],
  tools: ["Planet API", "Vantor (formerly Maxar) imagery APIs", "Airbus OneAtlas API", "STAC catalog", "GDAL", "licensing-term metadata schema", "order-management/billing system"],
  economics: [
    "Revenue is the margin between the wholesale operator price and the resale price charged to the end customer.",
    "Tasking commands a priority-pricing premium over archive search, since it competes for limited satellite capacity.",
    "Archive access is typically sold as a subscription or credit-based model rather than per-scene, smoothing revenue.",
    "Moat is breadth of operator relationships and catalog coverage, not any owned sensor hardware.",
    "Government framework contracts (multi-operator imagery-as-a-service agreements) are a major channel for brokers who can offer one integration point across several constellations.",
    "Build-vs-buy: becoming a broker requires none of the capex of operating satellites, but margins are thinner and depend entirely on contract terms set by the primary operators."
  ],
  pitfalls: [
    "License terms from different operators are rarely compatible, so a broker must track resale and derivative-use restrictions scene by scene.",
    "Cloud cover and revisit gaps are inherited from the underlying operator and cannot be fixed by the reseller layer.",
    "Attribution and chain-of-custody tracking on resold imagery becomes complex once multiple operators and sublicense tiers are involved.",
    "Conflicting SLAs across operators (delivery time, pixel accuracy) complicate setting a single customer-facing guarantee."
  ],
  defenses: [
    "Primary operators audit reseller compliance with license terms and can revoke API access for violations.",
    "Watermarking and usage-restriction clauses in the original license constrain what a reseller can embed in derivative products.",
    "API rate limits keyed to the reseller's contract tier cap how much volume can be resold without renegotiating terms."
  ],
  legal: [
    "NOAA/Commerce licensing conditions (resolution, shutter control, distribution restrictions) pass through to resellers and must be honored in sublicense terms.",
    "Export-control re-export restrictions apply when imagery or derived products cross borders to certain end customers.",
    "Copyright and database-rights protections on the underlying imagery constrain how a broker can repackage or redistribute it.",
    "Resale/sublicense agreements are enforced as ordinary contract law between operator and broker."
  ],
  rules: ["g_remote", "g_provenance", "g_contract"],
  vendors: [
    {name:"Vantor (formerly Maxar)", note:"Operator-run portal (SecureWatch under the Maxar brand) combining its own archive and tasking with reseller access tiers.", evidence:"public"},
    {name:"EOS Data Analytics", note:"Brokers tasking and archive access across multiple satellite operators for agriculture and forestry customers.", evidence:"public"},
    {name:"Apollo Mapping", note:"Independent broker reselling archive and tasking across several commercial imagery operators.", evidence:"public"},
    {name:"Airbus OneAtlas", note:"Combines Airbus's own Pléiades/SPOT archive with a tasking marketplace for partner resellers.", evidence:"public"}
  ],
  fieldguide: ["p_planet", "p_maxar", "p_airbus"]
});

M({
  id: "sen_satrx",
  family: "sensor",
  name: "Space-based AIS & ADS-B reception",
  summary: "Operating satellite payloads that receive maritime AIS and aviation ADS-B broadcasts to track vessels and aircraft outside terrestrial receiver range.",
  origins: ["o_physical"],
  ratings: {cost:3, scale:3, freshness:3, moat:3, legal:1},
  steps: [
    "Choose a deployment model: fly dedicated cubesats carrying AIS/ADS-B receiver payloads, or host the payload on an existing constellation (Aireon hosts ADS-B receivers on Iridium NEXT).",
    "Design orbital coverage to fill the gaps terrestrial receivers can't reach: open ocean, polar routes and low-traffic airspace.",
    "Decode AIS messages per ITU-R M.1371 (position, MMSI, course, draft) and ADS-B 1090ES messages (ICAO address, position, velocity) onboard or after downlink.",
    "Downlink via a ground-station network (owned or contracted, e.g. AWS Ground Station/KSAT) with enough passes per orbit to keep end-to-end latency low.",
    "Fuse satellite-received messages with terrestrial AIS/ADS-B feeds so coverage is continuous as a vessel or aircraft moves between satellite and shore range.",
    "Deduplicate and timestamp messages received by multiple satellites or ground stations to avoid double-counting positions.",
    "Join decoded messages against vessel (MMSI/IMO) and aircraft (ICAO/registration) reference registries to attach identity and metadata.",
    "Serve the fused track data via API and real-time feed to maritime, aviation, insurance and defense customers.",
    "Flag anomalies (position jumps, draft falsification, transponder gaps) as a standard enrichment layer on top of raw tracks."
  ],
  tools: ["AIS (ITU-R M.1371) decoders", "ADS-B 1090ES decoders", "ground-station network (own or AWS Ground Station/KSAT)", "message deduplication/correlation pipeline", "MMSI/IMO and ICAO registry join tables", "terrestrial feed ingestion for fusion"],
  economics: [
    "Dedicated-cubesat constellations carry full satellite capex; hosted-payload deals (Aireon on Iridium NEXT) spread that cost across the host constellation's own business case.",
    "Revenue comes from maritime-domain-awareness subscriptions, airline/ATC contracts and government/defense sales.",
    "Moat is the combination of a working constellation and years of accumulated historical track data, which is expensive to replicate from scratch.",
    "Fusing with terrestrial feeds rather than relying solely on satellite reception lowers latency and cost versus satellite-only coverage.",
    "Historical track archives are resold separately from the real-time feed, creating a second revenue line from the same collection infrastructure."
  ],
  pitfalls: [
    "Vessels can go 'dark' by disabling AIS transmission or falsifying draft/identity fields, which satellite reception cannot see through.",
    "Polar and high-latitude coverage still has gaps unless enough satellites are in the right orbital planes.",
    "Signal collision in high-traffic sea lanes or airspace reduces decode success rate, lowering effective coverage where it matters most.",
    "AIS and ADS-B have no message authentication, so received data can be spoofed by a transmitter regardless of how it's collected."
  ],
  defenses: [
    "Vessel and aircraft operators can simply disable the transponder (going AIS-dark or ADS-B-Out off) since these are self-reported broadcasts, not something reception can force.",
    "Because the broadcasts are public safety transmissions by regulation, there is no reception-side legal barrier equivalent to communications interception."
  ],
  legal: [
    "ITU Radio Regulations govern spectrum coordination for the satellite payload and downlink.",
    "SOLAS mandates AIS carriage on qualifying vessels, which is the legal basis for the broadcasts being public and lawfully receivable.",
    "FAA and equivalent ADS-B Out mandates establish the aviation broadcast baseline that satellite receivers passively observe."
  ],
  rules: ["g_radio"],
  vendors: [
    {name:"Spire Global", note:"Operates LEMUR cubesats carrying AIS and ADS-B receiver payloads; acquired exactEarth's satellite-AIS business in 2021.", evidence:"public"},
    {name:"Aireon", note:"Hosts space-based ADS-B receivers on the Iridium NEXT constellation for global air-traffic surveillance.", evidence:"public"}
  ],
  fieldguide: ["p_mt", "p_fr24", "p_adsbx", "k_tracking"]
});

M({
  id: "sen_rf",
  family: "sensor",
  name: "RF geolocation from orbit",
  summary: "Using clusters of satellites with wideband RF receivers to geolocate radio emitters (radar, maritime comms) by time- or frequency-difference of arrival, often to spot vessels not broadcasting AIS.",
  origins: ["o_physical"],
  ratings: {cost:3, scale:2, freshness:2, moat:3, legal:2},
  steps: [
    "Launch satellites in tight clusters (typically 3+ per cluster) so their relative timing and geometry support time-difference-of-arrival (TDOA) and frequency-difference-of-arrival (FDOA) geolocation.",
    "Design wideband SDR-based receiver payloads tuned to the bands of interest (maritime radar, VHF, satellite comms uplinks).",
    "Correlate the same emission as received by each satellite in a cluster to compute TDOA/FDOA and solve for the emitter's ground position.",
    "Classify detected emissions against a signal-signature library to identify emitter type (navigation radar, specific radio model) rather than just location.",
    "Fuse RF-geolocation detections with AIS feeds to flag vessels transmitting radar or radio but not broadcasting AIS ('dark' vessels).",
    "Build and continuously expand the RF signature library from confirmed detections to improve future classification accuracy.",
    "Deliver detections through an analyst platform or API, typically to maritime-security and defense customers rather than a broad commercial market.",
    "Schedule cluster passes to maximize revisit over priority maritime chokepoints and areas of known illicit activity."
  ],
  tools: ["TDOA/FDOA geolocation processing software", "SDR receiver payloads", "satellite formation-flying orbit design tools", "RF signal classification/ML models", "maritime-domain-awareness fusion platforms"],
  economics: [
    "Per-cluster cost is higher than a single-sensor EO satellite because geolocation requires multiple co-flying satellites rather than one.",
    "Revenue is concentrated in defense and maritime-security contracts rather than a broad commercial self-serve market.",
    "Moat is the TDOA/FDOA processing algorithms and an accumulated RF signature library, both of which take years to mature.",
    "Build-vs-buy: almost no customer builds this in-house given the cluster-launch and signal-processing complexity; it is bought as a subscription or analyst report."
  ],
  pitfalls: [
    "Cluttered RF spectrum in busy sea lanes or coastal areas reduces geolocation accuracy from signal overlap.",
    "Emitters can go silent (emissions control) specifically to evade this method.",
    "Classification errors on novel or modified signal types produce false identifications.",
    "Revisit rate is lower than single-sensor EO systems because of the smaller number of clusters typically deployed."
  ],
  defenses: [
    "Operators practicing emissions control (EMCON) simply stop transmitting, denying any RF signal to detect.",
    "Frequency-hopping and low-probability-of-intercept waveforms reduce detectability and complicate TDOA correlation.",
    "Decoy emitters can be used to generate false geolocation fixes."
  ],
  legal: [
    "NOAA's commercial remote-sensing licensing regime (15 CFR 960) was extended in 2020 to cover non-imaging sensing systems including RF payloads, bringing RF-geolocation operators under similar shutter-control authority as imagery operators.",
    "ITU Radio Regulations govern spectrum coordination for the receiver payload itself.",
    "Export control (ITAR) restricts transfer of precision geolocation technology and some data products."
  ],
  rules: ["g_radio", "g_remote"],
  vendors: [
    {name:"HawkEye 360", note:"Operates clusters of RF-geolocation smallsats to detect and locate maritime and other emitters.", evidence:"public"},
    {name:"Unseenlabs", note:"French operator of RF-geolocation smallsats for maritime surveillance.", evidence:"public"}
  ],
  fieldguide: ["k_rf"]
});

M({
  id: "sen_capture",
  family: "sensor",
  name: "Aerial, drone & street-level capture fleets",
  summary: "Operating owned vehicles and aircraft fitted with cameras and LiDAR to systematically capture street-level and aerial imagery for mapping products.",
  origins: ["o_physical"],
  ratings: {cost:3, scale:2, freshness:1, moat:2, legal:2},
  steps: [
    "Outfit vehicles with a 360-degree multi-camera rig and LiDAR, or outfit a fixed-wing aircraft with a downward-facing camera array for urban aerial capture.",
    "Plan a coverage grid of target roads or urban areas and a repeat schedule (Nearmap-style operators refly major metros on a regular cadence rather than once).",
    "Drive or fly scheduled capture routes, geotagging every frame with GNSS position and IMU orientation for accurate alignment.",
    "Run an automated detection-and-blur pipeline on faces and license plates before any imagery is published, as a mandatory pre-publication step, not optional cleanup.",
    "Stitch raw captures into panoramas (street-level) or orthomosaics (aerial) using photogrammetry software.",
    "Version imagery by capture date so downstream products can show change over time and users can request the newest pass for a location.",
    "Publish through a map platform with tiered licensing: free consumer viewing, paid API/bulk access for commercial and government customers.",
    "Handle individual blur-correction or removal requests through a public-facing submission form as an ongoing operational process."
  ],
  tools: ["360-degree camera rig / mobile mapping system", "LiDAR scanner", "GNSS/IMU positioning", "automated face/plate blurring model", "photogrammetry/orthomosaic software (e.g. Pix4D, Agisoft)", "fleet-scheduling software"],
  economics: [
    "High capex for the vehicle/aircraft fleet and sensor packages is the dominant cost driver.",
    "Cost scales per km of road or km2 of aerial coverage, which sets the economics of how often an area can be refreshed.",
    "Consumer mapping products often monetize this capture indirectly through advertising rather than directly charging for imagery.",
    "Dedicated aerial-imagery operators (property, insurance, government customers) sell the same capture as a direct subscription product.",
    "Moat is accumulated coverage history and route-optimization efficiency, since a new entrant must recapture the same ground to compete.",
    "Build-vs-buy: most mapping platforms that need global coverage license third-party imagery rather than building a street-level fleet themselves; owning the fleet is reserved for a handful of scale players."
  ],
  pitfalls: [
    "Coverage gaps persist on private roads, rural areas and anywhere vehicle/aircraft access is restricted.",
    "Weather and lighting conditions affect usability of a given capture pass, sometimes requiring a reflight.",
    "Imagery goes stale quickly in fast-changing areas (new construction, road changes) relative to the refresh cycle.",
    "Privacy complaints requiring manual blur correction create an ongoing operational burden distinct from the capture process itself."
  ],
  defenses: [
    "Some jurisdictions and private communities restrict or ban capture vehicles from entering.",
    "Individuals can request manual blurring or removal of their property or face through the operator's public request process."
  ],
  legal: [
    "Facial and license-plate blurring is effectively mandatory under GDPR and similar biometric-data rules for any imagery showing identifiable individuals.",
    "Local notice/consent norms for public photography vary by jurisdiction and affect what capture is acceptable without individualized consent.",
    "Aerial capture requires compliance with aviation/drone regulation (e.g. FAA Part 107 in the US) for flight operations.",
    "Blur-removal and correction requests are often a legally required process, not just a goodwill feature."
  ],
  rules: ["g_gdpr", "g_remote"],
  vendors: [
    {name:"Google", note:"Operates the Street View vehicle and Trekker-backpack capture fleet for its mapping products.", evidence:"public"},
    {name:"Nearmap", note:"Operates a fixed-wing aircraft fleet for frequent high-resolution urban aerial imagery.", evidence:"public"},
    {name:"HERE Technologies", note:"Operates a mapping-van fleet capturing street-level imagery for navigation products.", evidence:"public"},
    {name:"EagleView", note:"Operates aerial-imagery capture for property and insurance-focused imagery products.", evidence:"public"}
  ],
  fieldguide: ["p_gearth"]
});

M({
  id: "crowd_feeders",
  family: "crowd",
  name: "Volunteer receiver networks",
  summary: "Recruiting volunteers to host low-cost radio receivers that feed ADS-B, AIS or Mode-S data into a central network in exchange for free access or recognition.",
  origins: ["o_physical", "o_people"],
  ratings: {cost:1, scale:3, freshness:3, moat:2, legal:1},
  steps: [
    "Design a low-cost receiver kit (RTL-SDR USB dongle, antenna, small single-board computer such as a Raspberry Pi) that a volunteer can set up in under an hour.",
    "Publish free feeder software (e.g. dump1090/readsb for ADS-B/Mode-S, an AIS NMEA decoder for maritime) as a ready-to-flash system image.",
    "Require feeders to register their receiver's location so the network can build and monitor a coverage map.",
    "Implement multilateration (MLAT) across overlapping receivers to locate aircraft that lack ADS-B equipment, using arrival-time differences between stations.",
    "Ingest feeder streams centrally over a lightweight binary protocol (e.g. Beast format for ADS-B) designed for low-bandwidth home connections.",
    "Offer an incentive tier (free business-grade account, premium features, or public recognition) in exchange for consistent feeding.",
    "Deduplicate overlapping coverage from multiple nearby feeders reporting the same aircraft or vessel.",
    "Monitor feeder uptime and signal quality continuously and flag stale or degraded stations for volunteer outreach.",
    "Actively recruit feeders in underserved regions (rural, coastal, oceanic approach corridors) to close coverage gaps that dense urban areas don't have."
  ],
  tools: ["RTL-SDR USB dongles", "Raspberry Pi / small SBC", "dump1090 / readsb / tar1090", "Beast binary protocol", "MLAT correlation engine", "AIS NMEA decoders", "feeder status dashboard"],
  economics: [
    "Marginal data-acquisition cost per feeder is near zero: volunteers supply their own hardware, power and bandwidth.",
    "The incentive cost is the value of free/discounted accounts given to feeders rather than any cash payment.",
    "Revenue comes from paid business/API tiers sold to non-feeding customers, cross-subsidized by the free feeder-supplied data.",
    "Moat is the size and density of the existing feeder network and the years of relationship/trust built with volunteers.",
    "Operating a volunteer feeder network is far cheaper than building an equivalent owned terrestrial receiver network or a satellite-reception constellation."
  ],
  pitfalls: [
    "Coverage density is uneven: dense in cities and along common flight paths, sparse over oceans and rural areas.",
    "Feeder churn and hardware failure cause regional coverage to degrade without warning.",
    "Clock drift or poor time-sync on feeder hardware degrades MLAT positioning accuracy.",
    "Individual feeders can accidentally or deliberately filter specific aircraft or vessels from their uploaded stream."
  ],
  defenses: [
    "Aircraft wanting to avoid tracking can disable ADS-B Out or rely on blocked-tail-number programs that some networks honor and others (ADS-B Exchange, adsb.lol) explicitly do not.",
    "Reception of these broadcast bands is generally lawful, so there is no technical blocking mechanism available to the broadcaster beyond not transmitting."
  ],
  legal: [
    "Radio reception of these broadcast bands is generally lawful, subject to country-specific rules on which frequencies may be received and redistributed.",
    "Feeder agreements typically grant the network exclusive or preferred rights to redistribute the data the volunteer contributes."
  ],
  rules: ["g_radio", "g_contract"],
  vendors: [
    {name:"Flightradar24", note:"Runs a feeder program that ships subsidized receiver kits to volunteers in exchange for data and account perks.", evidence:"public"},
    {name:"ADS-B Exchange", note:"Built its network on an explicit no-filtering policy, declining to honor blocked-aircraft lists that other networks respect.", evidence:"public"},
    {name:"adsb.lol", note:"Community-run volunteer feeder network that grew as an alternative after ADS-B Exchange's 2023 sale.", evidence:"public"},
    {name:"MarineTraffic", note:"Operates a volunteer AIS receiver-station network supplementing satellite AIS coverage.", evidence:"public"}
  ],
  fieldguide: ["p_fr24", "p_adsbx", "k_rf"]
});

M({
  id: "crowd_mapping",
  family: "crowd",
  name: "Crowdsourced mapping & contribution",
  summary: "Building map data and street-level imagery from volunteer and user edits, contributions and uploads rather than owned survey or capture fleets.",
  origins: ["o_people", "o_physical"],
  ratings: {cost:1, scale:3, freshness:2, moat:2, legal:1},
  steps: [
    "Define an editable map data model (OpenStreetMap uses nodes/ways/relations with free-form key=value tags) that supports arbitrary feature types.",
    "Provide layered editing tools for different skill levels: a simple quest-based mobile app (StreetComplete) for casual contributors and a full editor (JOSM) for power users.",
    "Require a clear contribution license (OSM uses the Open Database License with attribution) so downstream users know their redistribution rights.",
    "Stand up a changeset-review and moderation workflow with a dedicated team (OSM's Data Working Group) to handle vandalism and disputes.",
    "Gamify contribution with leaderboards, points or badges (Mapillary's imagery-count rankings, Google Local Guides' points and perks) to sustain volunteer engagement.",
    "Run validation pipelines for bulk imports of government or commercial datasets so large merges don't silently degrade existing community edits.",
    "Keep a full edit-history database so any change can be rolled back and vandalism patterns can be detected after the fact.",
    "Distribute processed extracts through regular full-planet dumps and regional extracts (Geofabrik-style mirrors) for downstream consumers.",
    "Support derivative commercial services (routing, geocoding, tile rendering) on top of the same open base layer rather than monetizing the raw data directly."
  ],
  tools: ["iD / JOSM editors", "StreetComplete", "Overpass API", "OSM Planet / Geofabrik extracts", "osm2pgsql + PostGIS pipeline", "ODbL license text", "vandalism-detection tooling (e.g. OSMCha)"],
  economics: [
    "Contributors are not paid directly; reputation, gamification and the usefulness of the resulting map substitute for cash.",
    "Infrastructure and hosting costs are borne by a foundation (OSM Foundation) or by the platform owner (Google Local Guides, Mapillary).",
    "Monetization happens through derivative commercial services built on the open or semi-open data, not by selling the raw contributions.",
    "Moat is data completeness, freshness and community governance trust, which take years of accumulated edits to replicate.",
    "Building an equivalent proprietary basemap from scratch is far more expensive than integrating an existing crowd-sourced dataset."
  ],
  pitfalls: [
    "Vandalism and malicious edits require active, ongoing moderation rather than a one-time setup.",
    "Data density and quality vary enormously by region, dense in parts of Europe and sparse in much of the Global South.",
    "Contributor burnout and governance disputes within the community can stall editing in contested areas.",
    "Inconsistent tagging conventions across contributors complicate automated downstream parsing."
  ],
  defenses: [
    "Edit-review queues and reputation thresholds for bulk or anonymous edits protect data integrity without closing the platform entirely.",
    "Automated vandalism-detection tools (e.g. OSMCha) flag suspicious changesets for human review."
  ],
  legal: [
    "ODbL and similar share-alike licenses impose obligations on anyone redistributing a derivative database built from the contributed data.",
    "Attribution requirements must be honored by any product built on the data.",
    "Contributor agreements assign rights under the chosen license at the point of submission, which must be clear to new contributors."
  ],
  rules: ["g_copyright", "g_provenance"],
  vendors: [
    {name:"OpenStreetMap Foundation", note:"Operates the OSM editing and distribution infrastructure under the Open Database License.", evidence:"public"},
    {name:"Mapillary", note:"Crowd-sourced street-level imagery platform; acquired by Facebook (renamed Meta in 2021) in 2020.", evidence:"public"},
    {name:"Waze (Google)", note:"Crowd-sourced traffic and road-edit data feeding Google Maps.", evidence:"public"},
    {name:"Google Local Guides", note:"Points-and-perks program incentivizing user contribution of places, reviews and photos.", evidence:"public"}
  ],
  fieldguide: ["p_osm", "t_overpass"]
});

M({
  id: "crowd_submissions",
  family: "crowd",
  name: "Free-tool submissions as collection",
  summary: "Offering a genuinely useful free scanning or sandboxing tool so that users voluntarily submit files and URLs, building a searchable corpus from that submission flow.",
  origins: ["o_infra", "o_crime"],
  ratings: {cost:1, scale:3, freshness:3, moat:3, legal:2},
  steps: [
    "Build a free public tool that solves a real problem for the submitter: multi-engine file/URL scanning, or sandbox detonation with screenshot and DOM capture.",
    "Instrument the backend to retain every submitted artifact (file, URL, hash, screenshot, DOM, network requests) regardless of the submitter's original motive.",
    "Run each artifact through many third-party detection engines and enrichment pipelines (VirusTotal integrates dozens of partner antivirus engines).",
    "Index results so past submissions are searchable and retro-huntable by hash, filename, URL pattern or other metadata.",
    "Offer a tiered access model: a free single-submission web UI for casual users, and a paid API, retrohunt or bulk-feed product for the aggregated corpus.",
    "Establish data-sharing agreements with partner engines/vendors, who receive sample flow in exchange for contributing detection signatures.",
    "Apply visibility and retention controls, since most submissions default to shared/searchable unless the submitter marks them private.",
    "Track engine agreement and disagreement over time to refine confidence scoring on top of raw detections."
  ],
  tools: ["multi-engine AV scanning farm", "sandbox/detonation environment", "hash/YARA/retrohunt search index", "DOM/network capture (headless browser)", "partner data-sharing agreements", "public submission API"],
  economics: [
    "The free consumer tool is the acquisition funnel; it costs compute and engine-licensing fees but generates the submission corpus at no direct payment to submitters.",
    "Monetization comes from paid API, retrohunt and feed subscriptions, plus data-sharing deals with the AV vendors whose engines power the scan.",
    "Cost drivers are sandbox/detonation compute at scale and licensing fees owed to partner detection engines.",
    "Moat is the size of the accumulated submission corpus and the breadth of partner-engine integrations, both of which take years to build.",
    "AV vendors effectively get crowd-sourced telemetry at a fraction of the cost of running an equivalent global honeypot or submission network themselves."
  ],
  pitfalls: [
    "Submissions are biased toward what users or their tools already suspect, not a random sample of all malicious activity.",
    "Users sometimes mistakenly upload sensitive internal documents or personal data, which then sit in a public or semi-public searchable corpus.",
    "Submitters can mass-upload junk or near-duplicates to waste competitors' analyst time or pollute retrohunt results.",
    "Deduplication and hash-collision handling become harder as submission volume scales."
  ],
  defenses: [
    "Attackers routinely check their own malware against these services before release to tune evasion, a well-documented practice sometimes called 'VirusTotal washing'.",
    "Some services detect and flag known security-researcher upload patterns to identify scanning-for-evasion behavior.",
    "Private or limited-visibility submission tiers exist for organizations submitting sensitive internal material."
  ],
  legal: [
    "Submission terms of service require the uploader to warrant they have the right to submit the file, addressing third-party ownership and confidentiality concerns.",
    "Data-sharing agreements with AV partners govern how retained submissions may be redistributed or used for signature development.",
    "No instructions here involve obtaining data without authorization: the model relies entirely on what users voluntarily submit under the posted terms."
  ],
  rules: ["g_contract", "g_provenance"],
  vendors: [
    {name:"VirusTotal", note:"Google-owned free multi-engine file and URL scanning service with retrohunt and feed products for the retained corpus.", evidence:"public"},
    {name:"urlscan.io", note:"Free URL sandbox capturing screenshots, DOM and network requests, with a searchable scan history and paid tiers.", evidence:"public"}
  ],
  fieldguide: ["p_vt", "p_urlscan"]
});

M({
  id: "crowd_contacts",
  family: "crowd",
  name: "Contact-book & caller-ID crowdsourcing",
  summary: "Building a reverse phone-number identity and spam database by having consenting users upload their address books, corroborated across millions of installs.",
  origins: ["o_people"],
  ratings: {cost:1, scale:3, freshness:2, moat:3, legal:3},
  steps: [
    "Request explicit, informed consent for contacts access during app onboarding, with a clear in-app explanation of what will be uploaded and why.",
    "Upload the consenting user's address book (names and phone numbers, hashed or tokenized where feasible) to a reverse phone-number index.",
    "Aggregate uploads across millions of consenting users so a number appearing consistently across many address books earns a stronger identity signal.",
    "Let any user flag an incoming number as spam, scam or telemarketing to build a community-driven spam score independent of the identity index.",
    "Surface the resulting identity or spam label through the caller-ID feature to any user looking up that number, including people who never consented themselves.",
    "Provide a self-service portal where any number holder, consenting or not, can request their listing be corrected or removed.",
    "Adapt the consent flow to the strictest applicable regime for a given user base, since opt-in requirements (notably under GDPR) are stricter in some markets than others.",
    "Monetize through a freemium subscription for unlimited lookups and through carrier partnerships that license the spam-detection signal."
  ],
  tools: ["mobile contacts-permission APIs (Android/iOS)", "hashing/tokenization for uploaded numbers", "reverse phone-number lookup index", "community spam-flag voting pipeline", "self-service opt-out/removal portal", "carrier integration APIs"],
  economics: [
    "Each contact is acquired at zero marginal cost: the consenting installed base supplies the upload, not a paid data-collection operation.",
    "Value and coverage both scale with user count, a direct network effect: more installs mean more corroboration per number.",
    "Revenue comes from freemium subscriptions for unlimited caller-ID lookups and from licensing the spam-detection signal to carriers.",
    "Moat is the sheer scale of the historical contact-graph, which a new entrant cannot replicate without an equivalently large installed base.",
    "Regulatory risk is a persistent and growing cost driver, since most identified individuals never consented themselves, requiring ongoing investment in removal-request infrastructure."
  ],
  pitfalls: [
    "Most people whose numbers end up identified in the database never consented themselves, only the uploading contact did.",
    "Spam labels can be gamed by coordinated false-flagging of a legitimate number.",
    "Several national regulators have examined or restricted aspects of this model in specific countries at various times.",
    "Data quality drifts as phone numbers get reassigned or ported between people."
  ],
  defenses: [
    "Individuals can use the vendor's listing-removal portal to opt out or correct their entry; some jurisdictions require this by law.",
    "Users can decline the contacts-upload permission at install, which simply excludes their address book from the corroboration pool."
  ],
  legal: [
    "GDPR Article 14's notice obligation to a non-consenting third party (the person whose data was uploaded by someone else) is directly implicated by this model.",
    "Several national regulators and courts have examined caller-ID-from-contacts models for compliance with local consent requirements.",
    "FTC-style enforcement interest in consumer data brokers applies to the extent the aggregated dataset is licensed onward.",
    "The onboarding consent flow and removal-request process described above are the primary compliance controls available to operators."
  ],
  rules: ["g_gdpr", "g_usprivacy", "g_ftc"],
  vendors: [
    {name:"Truecaller", note:"Builds its caller-ID and spam-identification database primarily from user-contributed contact-book uploads.", evidence:"public"},
    {name:"Hiya", note:"Offers a similar carrier-partnered caller-ID and spam-blocking product; its own privacy policy discloses collecting users' contacts (with permission) and matching them against call logs to build its caller-ID and spam database.", evidence:"public"}
  ]
});

M({
  id: "crowd_sharing",
  family: "crowd",
  name: "Community & industry intelligence sharing",
  summary: "Pooling threat indicators and context across a trust group of organizations, via platforms like MISP or sector ISACs, so members benefit from each other's observed threats.",
  origins: ["o_infra", "o_crime"],
  ratings: {cost:2, scale:2, freshness:3, moat:2, legal:1},
  steps: [
    "Stand up or join a trust-group sharing platform (a MISP instance, an ISAC, or a free community exchange like AlienVault OTX) where members submit indicators.",
    "Require indicators to carry a Traffic Light Protocol (TLP) marking (CLEAR/GREEN/AMBER/RED) on submission to control how far each item may be redistributed.",
    "Exchange indicators in a standard format (STIX/TAXII) so members' SIEM/SOAR tooling can ingest new indicators automatically rather than via manual review.",
    "Correlate submissions across members to surface indicators multiple organizations have independently observed, which carry higher confidence than single-source reports.",
    "Run a membership vetting process (sector ISACs typically require proof of being a regulated entity in that sector) to keep the trust group relevant and limit noise.",
    "Provide anonymization and sanitization tooling so a member can share 'this indicator hit us' without disclosing identifying details of their own incident.",
    "Maintain a central analyst team that enriches raw member submissions with context before wider redistribution within the group.",
    "Publish a sanitized, aggregated subset publicly (OTX-style 'pulses') to build goodwill and recruit additional contributing members."
  ],
  tools: ["MISP platform", "STIX/TAXII protocol", "TLP marking convention", "SIEM/SOAR ingestion connectors", "anonymization/sanitization scripts", "membership vetting workflow", "public pulse/feed publishing API"],
  economics: [
    "ISAC membership fees fund the shared analyst team, platform hosting and vetting process.",
    "Free community platforms (OTX, open MISP communities) monetize indirectly through the parent vendor's paid products that consume the same feed.",
    "Value scales with network effect: a sector ISAC with every major player as a member gives earlier warning to all of them than any bilateral arrangement could.",
    "Moat is the size and vetting quality of the trust group, which is difficult for a competing platform to replicate once an incumbent has broad sector membership.",
    "Joining an existing ISAC or platform is far cheaper for a member organization than negotiating bilateral sharing agreements with every peer."
  ],
  pitfalls: [
    "Free-rider members who consume but never contribute indicators degrade the trust model over time.",
    "Poor TLP hygiene leaks sensitive, member-attributed data beyond its intended audience.",
    "Stale or low-confidence indicators without automatic expiry pollute feeds and generate downstream false positives.",
    "Sector ISACs can be slow to admit smaller organizations, limiting coverage at the edges of the sector."
  ],
  defenses: [
    "Platforms apply reputation scoring to contributing members to limit the damage any single bad-faith submitter can cause.",
    "Automated indicator-expiry and aging reduce the lifespan of stale or low-confidence entries in shared feeds."
  ],
  legal: [
    "Information-sharing among competitors raises antitrust questions, addressed by scoping shared content strictly to security indicators rather than pricing or competitive data.",
    "Safe-harbor and liability protections for good-faith security-information sharing (e.g. the US Cybersecurity Information Sharing Act of 2015) reduce legal exposure for contributing members.",
    "Membership and TLP agreements function as ordinary contract law governing redistribution and confidentiality within the group."
  ],
  rules: ["g_contract", "g_provenance"],
  vendors: [
    {name:"MISP", note:"Open-source threat-intelligence sharing platform used as the technical backbone by many ISACs and private trust groups.", evidence:"public"},
    {name:"AlienVault OTX", note:"Free open threat-exchange community publishing member-contributed 'pulses' of indicators.", evidence:"public"},
    {name:"FS-ISAC", note:"Financial-services sector information-sharing and analysis center operating a vetted member trust group.", evidence:"reported"},
    {name:"abuse.ch", note:"Community projects (MalwareBazaar, URLhaus, ThreatFox) sharing malware samples and indicators contributed by the security community.", evidence:"public"}
  ],
  fieldguide: ["p_otx"]
});
