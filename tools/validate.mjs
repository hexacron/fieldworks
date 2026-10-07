#!/usr/bin/env node
// Validate fieldguide + quarry data and the claims register. Node 18+, no dependencies.
//
//   node tools/validate.mjs                      validate; exit 1 on any error
//   node tools/validate.mjs --index dist/index.json   also write an entity index for tools/upkeep.py
//
// Data files are classic browser scripts. They are evaluated here in a sandbox in the same order
// as each project's index.html loads them, so the check matches what the page sees.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const errors = [], warnings = [];
const err = (scope, msg) => errors.push(`${scope}: ${msg}`);
const warn = (scope, msg) => warnings.push(`${scope}: ${msg}`);

/** Evaluate the page's local <script src> files in order (excluding app.js) and return named globals. */
function loadPage(project, names) {
  const html = fs.readFileSync(path.join(ROOT, project, "index.html"), "utf8");
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.endsWith("app.js"));
  const code = srcs.map(s => fs.readFileSync(path.join(ROOT, project, s), "utf8")).join("\n;\n");
  return vm.runInNewContext(`${code}\n;({${names.join(",")}})`, {console}, {filename: `${project}-data`});
}

// Text that belongs in the claims register, not in reader-facing content.
const LEAK = /\(time-sensitive|\((verify|confirm)\b|(verify|confirm) (current status|final figure|exact (date|figure|terms))|— verify|\bTODO\b|\bFIXME\b/i;
function scanText(scope, obj) {
  const walk = (v, where) => {
    if (typeof v === "string") { if (LEAK.test(v)) err(scope, `maintainer note in ${where}: "${v.slice(0, 80)}…"`); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  walk(obj, "entry");
}

/* ---------------- fieldguide ---------------- */
const FG = loadPage("fieldguide", ["LAYERS", "MODELS", "STAGES", "XCUT", "RAW"]);
const fgPrefix = {source: "s_", provider: "p_", technique: "k_", tool: "t_", discipline: "d_", usecase: "u_", governance: "g_", community: "c_", trend: "r_"};
const fgStages = new Set([...FG.STAGES.map(s => s.id), FG.XCUT.id]);
const fg = new Map();
for (const layer of Object.keys(FG.RAW)) {
  if (!FG.LAYERS.some(l => l.id === layer)) err("fieldguide", `RAW key '${layer}' is not a LAYERS id`);
  for (const row of FG.RAW[layer]) {
    const [id, cat, name, desc, rel = "", extra = {}] = row;
    const scope = `fieldguide ${id}`;
    if (fg.has(id)) err(scope, "duplicate id");
    fg.set(id, {id, layer, cat, name, desc, rel: rel.split(/\s+/).filter(Boolean), ...extra});
    if (fgPrefix[layer] && !id.startsWith(fgPrefix[layer])) err(scope, `id should start with '${fgPrefix[layer]}' for layer ${layer}`);
    if (!cat || !name || !desc) err(scope, "category, name and description are required");
    if (extra.model && !(extra.model in FG.MODELS)) err(scope, `unknown model '${extra.model}'`);
    if (extra.stage && !fgStages.has(extra.stage)) err(scope, `unknown stage '${extra.stage}'`);
    if (extra.url && !/^https:\/\//.test(extra.url)) err(scope, `url must be https: ${extra.url}`);
    if (extra.notes && !(Array.isArray(extra.notes) && extra.notes.every(n => typeof n === "string" && n))) err(scope, "notes must be non-empty strings");
    scanText(scope, row);
  }
}
for (const e of fg.values()) for (const r of e.rel) if (!fg.has(r)) err(`fieldguide ${e.id}`, `relation to unknown id '${r}'`);
for (const e of fg.values()) {
  const deg = [...fg.values()].filter(x => x.rel.includes(e.id)).length + e.rel.length;
  if (!deg) warn(`fieldguide ${e.id}`, "has no connections");
}

/* ---------------- quarry ---------------- */
const Q = loadPage("quarry", ["FAMILIES", "RATINGS", "EVIDENCE", "ORIGINS", "METHODS", "STAGES", "PRODUCTS", "ARCHETYPES", "RULES"]);
const q = new Map();
const famPrefix = {web: "web_", net: "net_", sensor: "sen_", crowd: "crowd_", embedded: "emb_", records: "rec_", commercial: "com_", human: "hum_", underground: "ug_", ai: "ai_"};
const kinds = [["family", Q.FAMILIES], ["origin", Q.ORIGINS], ["method", Q.METHODS], ["stage", Q.STAGES], ["product", Q.PRODUCTS], ["archetype", Q.ARCHETYPES], ["rule", Q.RULES]];
for (const [kind, list] of kinds) for (const x of list) {
  if (q.has(x.id)) err(`quarry ${x.id}`, "duplicate id");
  q.set(x.id, {...x, kind});
  if (kind !== "family") scanText(`quarry ${x.id}`, x);
}
const ref = (scope, id, kind) => { const t = q.get(id); if (!t || t.kind !== kind) err(scope, `unknown ${kind} '${id}'`); };
const nonEmpty = (scope, x, fields) => { for (const f of fields) if (!x[f] || (Array.isArray(x[f]) && !x[f].length)) err(scope, `'${f}' is required`); };
const vendors = (scope, list) => (list || []).forEach(v => {
  if (!v.name || !v.note) err(scope, "vendor needs name and note");
  if (!(v.evidence in Q.EVIDENCE)) err(scope, `vendor '${v.name}' has invalid evidence '${v.evidence}'`);
});
const fgLinks = (scope, list) => (list || []).forEach(id => { if (!fg.has(id)) err(scope, `fieldguide link to unknown id '${id}'`); });
const used = new Set();
for (const a of Q.ARCHETYPES) {
  const s = `quarry ${a.id}`;
  nonEmpty(s, a, ["name", "summary", "recipe", "build", "economics", "risks", "stages", "products", "vendors"]);
  for (const r of a.recipe || []) {
    const [id, w, note] = r;
    ref(s, id, "method"); used.add(id);
    if (![1, 2, 3].includes(w)) err(s, `recipe weight for '${id}' must be 1, 2 or 3`);
    if (!note) err(s, `recipe entry '${id}' needs a note`);
  }
  (a.stages || []).forEach(id => ref(s, id, "stage"));
  (a.products || []).forEach(id => ref(s, id, "product"));
  vendors(s, a.vendors); fgLinks(s, a.fieldguide);
}
for (const m of Q.METHODS) {
  const s = `quarry ${m.id}`;
  nonEmpty(s, m, ["name", "summary", "origins", "steps", "tools", "economics", "pitfalls", "defenses", "legal", "vendors"]);
  if (!(m.family in famPrefix)) err(s, `unknown family '${m.family}'`);
  else if (!m.id.startsWith(famPrefix[m.family])) err(s, `id should start with '${famPrefix[m.family]}'`);
  (m.origins || []).forEach(id => ref(s, id, "origin"));
  (m.rules || []).forEach(id => ref(s, id, "rule"));
  for (const k of Object.keys(Q.RATINGS)) if (![1, 2, 3].includes(m.ratings?.[k])) err(s, `rating '${k}' must be 1, 2 or 3`);
  vendors(s, m.vendors); fgLinks(s, m.fieldguide);
  if (!used.has(m.id) && m.id !== "ug_purchase") warn(s, "not used by any archetype recipe");
}
for (const g of Q.RULES) {
  const s = `quarry ${g.id}`;
  nonEmpty(s, g, ["name", "jurisdiction", "summary", "points"]);
  (g.applies || []).forEach(id => ref(s, id, "method"));
}
for (const st of Q.STAGES) nonEmpty(`quarry ${st.id}`, st, ["name", "summary", "steps", "failures"]);
for (const o of Q.ORIGINS) if (!Q.METHODS.some(m => (m.origins || []).includes(o.id))) warn(`quarry ${o.id}`, "no method collects from this origin");

/* ---------------- claims register ---------------- */
const claimsPath = path.join(ROOT, "upkeep", "claims.json");
const claims = JSON.parse(fs.readFileSync(claimsPath, "utf8"));
const claimIds = new Set();
for (const c of claims.claims) {
  const s = `claims ${c.id}`;
  if (claimIds.has(c.id)) err(s, "duplicate claim id");
  claimIds.add(c.id);
  if (!["fieldguide", "quarry"].includes(c.project)) err(s, `unknown project '${c.project}'`);
  if (!c.claim) err(s, "claim text is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checked || "")) err(s, "checked must be YYYY-MM-DD");
  if (!["compiled", "verified"].includes(c.status)) err(s, "status must be 'compiled' or 'verified'");
  if (c.status === "verified" && !(c.sources || []).length) err(s, "a verified claim needs at least one source");
  const pool = c.project === "fieldguide" ? fg : q;
  if (!c.entities?.length) err(s, "at least one entity is required");
  for (const id of c.entities || []) if (!pool.has(id)) err(s, `unknown ${c.project} entity '${id}'`);
}

/* ---------------- upkeep configs ---------------- */
const links = JSON.parse(fs.readFileSync(path.join(ROOT, "upkeep", "links.json"), "utf8"));
for (const key of ["archived_ok", "blocked_ok"])
  for (const id of links[key] || []) if (!fg.get(id)?.url) err(`upkeep/links.json ${key}`, `'${id}' is not a fieldguide entity with a url`);
const watch = JSON.parse(fs.readFileSync(path.join(ROOT, "upkeep", "watch.json"), "utf8"));
for (const f of watch.feeds) if (!f.name || !/^https:\/\//.test(f.url || "")) err("upkeep/watch.json", `feed needs a name and https url: ${JSON.stringify(f)}`);

/* ---------------- index for upkeep ---------------- */
const out = process.argv.indexOf("--index");
if (out > -1) {
  const entities = [];
  for (const e of fg.values()) entities.push({project: "fieldguide", id: e.id, kind: e.layer, name: e.name, url: e.url || null});
  for (const x of q.values()) if (x.kind !== "family") entities.push({project: "quarry", id: x.id, kind: x.kind, name: x.name, url: null});
  const vendorNames = [...new Set([...Q.METHODS, ...Q.ARCHETYPES].flatMap(x => (x.vendors || []).map(v => v.name)))].sort();
  const file = path.resolve(process.argv[out + 1] || "dist/index.json");
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify({generated: new Date().toISOString(), entities, vendors: vendorNames}, null, 1));
  console.log(`index: ${entities.length} entities, ${vendorNames.length} vendor names → ${path.relative(ROOT, file)}`);
}

console.log(`fieldguide: ${fg.size} entities · quarry: ${Q.METHODS.length} methods, ${Q.ARCHETYPES.length} archetypes, ${Q.RULES.length} rules · claims: ${claims.claims.length}`);
for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`ERROR    ${e}`);
if (errors.length) { console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log("OK");
