"use strict";
/* =====================================================================
   quarry core: registries and helpers. Every other file in src/data/
   calls the helpers below to register entries. Load this file first.
   Schema and editing rules: docs/data-model.md
   ===================================================================== */

/* Method families, in display order. */
const FAMILIES = [
  {id:"web",         name:"Web & platform collection",        color:"#38bdf8", blurb:"Crawling, scraping and API harvesting from websites, platforms and apps."},
  {id:"net",         name:"Network & infrastructure measurement", color:"#a78bfa", blurb:"Scanning, passive sensors and registries that observe the internet itself."},
  {id:"sensor",      name:"Owned sensors & remote sensing",   color:"#34d399", blurb:"Satellites, receivers and capture fleets that a provider owns and operates."},
  {id:"crowd",       name:"Contributor & crowd networks",     color:"#fbbf24", blurb:"Volunteers, users and community members who supply data in exchange for access or reputation."},
  {id:"embedded",    name:"Embedded & device data",           color:"#f472b6", blurb:"Data collected from inside apps, browsers, security products, networks and devices."},
  {id:"records",     name:"Public records acquisition",       color:"#94a3b8", blurb:"Getting government, registry, court and customs records out of their silos."},
  {id:"commercial",  name:"Commercial data supply chain",     color:"#fb923c", blurb:"Licensing, reselling, pooling and buying data from other companies."},
  {id:"human",       name:"Human collection & research",      color:"#2dd4bf", blurb:"Analysts, coders, stringers, experts and sources producing data by hand."},
  {id:"underground", name:"Underground collection",           color:"#f87171", blurb:"Collecting from criminal ecosystems: forums, markets, leak sites, dumps and stealer logs."},
  {id:"ai",          name:"AI training data acquisition",     color:"#e879f9", blurb:"How model builders acquire pretraining corpora, licensed content, human feedback and synthetic data."}
];

/* Editorial 1–3 scales used on every method. */
const RATINGS = {
  cost:      {name:"Cost to operate", lo:"Cheap",       mid:"Moderate",  hi:"Expensive"},
  scale:     {name:"Achievable scale", lo:"Niche",      mid:"Large",     hi:"Internet-scale"},
  freshness: {name:"Freshness",       lo:"Batch / slow", mid:"Daily",    hi:"Near real-time"},
  moat:      {name:"Defensibility",   lo:"Easy to copy", mid:"Some moat", hi:"Hard to replicate"},
  legal:     {name:"Legal exposure",  lo:"Low",         mid:"Elevated",  hi:"High"}
};

/* How well a vendor ↔ method association is evidenced. */
const EVIDENCE = {
  public:   "Publicly documented by the vendor",
  reported: "Reported by press, courts or regulators",
  inferred: "Industry-typical; not confirmed for this vendor"
};

/* Registries. */
const ORIGINS = [], METHODS = [], STAGES = [], PRODUCTS = [], ARCHETYPES = [], RULES = [];
const O = x => ORIGINS.push(x);    // data origin
const M = x => METHODS.push(x);    // acquisition method
const S = x => STAGES.push(x);     // pipeline stage
const D = x => PRODUCTS.push(x);   // product / delivery model
const A = x => ARCHETYPES.push(x); // provider archetype (recipe)
const G = x => RULES.push(x);      // law, regulation, precedent, norm
