"use strict";
/* =====================================================================
   MODEL: resolves references between registries (src/data/*.js)
   ===================================================================== */
const FMAP = Object.fromEntries(FAMILIES.map(f => [f.id, f]));
const KINDS = {
  family:    {name:"Method family",        color:null},
  method:    {name:"Acquisition method",   color:null},
  origin:    {name:"Data origin",          color:"#64748b"},
  archetype: {name:"Provider archetype",   color:"#e2e8f0"},
  stage:     {name:"Pipeline stage",       color:"#f5b84a"},
  product:   {name:"Product & delivery",   color:"#94a3b8"},
  rule:      {name:"Law & precedent",      color:"#a78bfa"}
};
const LEGAL_COLORS = {1:"#4ade80", 2:"#facc15", 3:"#f87171"};
const byId = {}, all = [], missing = [];
function register(list, kind) {
  for (const x of list) {
    if (byId[x.id]) console.warn("Duplicate id", x.id);
    x.kind = kind;
    x._text = JSON.stringify(x).toLowerCase();
    byId[x.id] = x; all.push(x);
  }
}
register(FAMILIES, "family"); register(ORIGINS, "origin"); register(METHODS, "method");
register(STAGES, "stage"); register(PRODUCTS, "product"); register(ARCHETYPES, "archetype"); register(RULES, "rule");
STAGES.sort((a, b) => (a.order || 0) - (b.order || 0));
METHODS.sort((a, b) => FAMILIES.findIndex(f => f.id === a.family) - FAMILIES.findIndex(f => f.id === b.family));

function ref(from, id, kind) {
  const t = byId[id];
  if (!t || t.kind !== kind) { missing.push(`${from} → ${id} (${kind})`); return null; }
  return t;
}
for (const f of FAMILIES) f.methods = [];
for (const m of METHODS) {
  m.fam = FMAP[m.family];
  if (!m.fam) { missing.push(`${m.id} → family ${m.family}`); m.fam = {id: m.family, name: m.family, color: "#888", methods: []}; }
  m.fam.methods.push(m);
  m.originsR = (m.origins || []).map(id => ref(m.id, id, "origin")).filter(Boolean);
  m.rulesR = new Set((m.rules || []).map(id => ref(m.id, id, "rule")).filter(Boolean));
  m.uses = [];
  for (const k of Object.keys(RATINGS)) {
    const v = m.ratings && m.ratings[k];
    if (!(v >= 1 && v <= 3)) { missing.push(`${m.id} → rating ${k}`); m.ratings = Object.assign({}, m.ratings, {[k]: 2}); }
  }
}
for (const r of RULES) {
  r.appliesR = new Set();
  for (const id of r.applies || []) { const m = ref(r.id, id, "method"); if (m) { r.appliesR.add(m); m.rulesR.add(r); } }
}
for (const m of METHODS) for (const r of m.rulesR) r.appliesR.add(m);
for (const o of ORIGINS) o.methods = METHODS.filter(m => m.originsR.includes(o));
for (const a of ARCHETYPES) {
  a.recipeR = (a.recipe || []).map(([id, w, note]) => {
    const m = ref(a.id, id, "method"); if (!m) return null;
    const e = {m, a, w: Math.max(1, Math.min(3, w || 1)), note: note || ""};
    m.uses.push(e); return e;
  }).filter(Boolean).sort((x, y) => y.w - x.w);
  a.stagesR = (a.stages || []).map(id => ref(a.id, id, "stage")).filter(Boolean);
  a.productsR = (a.products || []).map(id => ref(a.id, id, "product")).filter(Boolean);
}
for (const s of STAGES) s.archetypes = ARCHETYPES.filter(a => a.stagesR.includes(s));
for (const d of PRODUCTS) d.archetypes = ARCHETYPES.filter(a => a.productsR.includes(d));
for (const m of METHODS) m.uses.sort((x, y) => y.w - x.w);
if (missing.length) console.warn("Unresolved references:", missing);
window.__quarry = {
  counts: {families: FAMILIES.length, origins: ORIGINS.length, methods: METHODS.length, stages: STAGES.length, products: PRODUCTS.length, archetypes: ARCHETYPES.length, rules: RULES.length},
  perFamily: Object.fromEntries(FAMILIES.map(f => [f.id, f.methods.length])),
  missing
};

/* =====================================================================
   STATE & HELPERS
   ===================================================================== */
const state = {view: "flow", fams: new Set(FAMILIES.map(f => f.id)), legal: new Set([1, 2, 3]), q: "", sel: null, flowMode: "methods", ex: "cost", ey: "moat"};
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function hl(s) {
  const e = esc(s); if (!state.q) return e;
  return e.replace(new RegExp("(" + reEsc(esc(state.q)) + ")", "ig"), "<mark>$1</mark>");
}
/* Inline markup: `code`, and lines starting with "- " after a newline become a nested list. */
function fmt(s) {
  const inline = t => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>");
  const lines = String(s).split("\n");
  const head = inline(lines[0]);
  const subs = lines.slice(1).filter(l => l.trim());
  if (!subs.length) return head;
  return head + "<ul>" + subs.map(l => "<li>" + inline(l.replace(/^\s*-\s*/, "")) + "</li>").join("") + "</ul>";
}
const methodVisible = m => state.fams.has(m.family) && state.legal.has(m.ratings.legal);
const matches = x => !state.q || x._text.includes(state.q);
const colorOf = x => x.kind === "method" ? x.fam.color : x.kind === "family" ? x.color : KINDS[x.kind].color;
const chip = (x, extra = "") => `<button class="chip" data-id="${esc(x.id)}" style="--c:${colorOf(x)}">${esc(x.name)}${extra}</button>`;
const evBadge = ev => `<span class="badge ev-${esc(ev)}" title="${esc(EVIDENCE[ev] || "")}">${esc(ev)}</span>`;
const legalBadge = m => `<span class="badge lg${m.ratings.legal}" title="Legal exposure">${RATINGS.legal[["", "lo", "mid", "hi"][m.ratings.legal]]}</span>`;
function pips(m) {
  const short = {cost: "Cost", scale: "Scale", freshness: "Fresh", moat: "Moat", legal: "Legal"};
  return `<div class="pips">` + Object.keys(RATINGS).map(k =>
    `<span class="${k}" style="--lc:${LEGAL_COLORS[m.ratings.legal]}" title="${esc(RATINGS[k].name)}: ${m.ratings[k]}/3">${short[k]} ${[1, 2, 3].map(i => `<i class="${i <= m.ratings[k] ? "on" : ""}"></i>`).join("")}</span>`).join("") + `</div>`;
}
function delegate(el) { el.addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c && byId[c.dataset.id]) select(c.dataset.id); }); }

/* =====================================================================
   SIDEBAR
   ===================================================================== */
function renderSidebar() {
  $("#families").innerHTML = FAMILIES.map(f => `<label class="fam" style="--c:${f.color}" data-fam="${f.id}">
      <input type="checkbox" ${state.fams.has(f.id) ? "checked" : ""}><span class="sw"></span><span class="nm">${esc(f.name)}</span>
      <span class="ct">${f.methods.length}</span><button class="only" data-only="${f.id}" title="Show only this family">only</button></label>`).join("");
  $("#legal").innerHTML = [1, 2, 3].map(v => `<button class="fchip ${state.legal.has(v) ? "on" : ""}" data-legal="${v}">${RATINGS.legal[["", "lo", "mid", "hi"][v]]}</button>`).join("");
}
$("#families").addEventListener("change", e => {
  const l = e.target.closest("[data-fam]"); if (!l) return;
  e.target.checked ? state.fams.add(l.dataset.fam) : state.fams.delete(l.dataset.fam);
  applyFilters();
});
$("#families").addEventListener("click", e => {
  const b = e.target.closest("[data-only]"); if (!b) return;
  e.preventDefault(); state.fams = new Set([b.dataset.only]); renderSidebar(); applyFilters();
});
$("#legal").addEventListener("click", e => {
  const b = e.target.closest("[data-legal]"); if (!b) return;
  const v = +b.dataset.legal; state.legal.has(v) ? state.legal.delete(v) : state.legal.add(v);
  renderSidebar(); applyFilters();
});
$("#reset").addEventListener("click", () => {
  state.fams = new Set(FAMILIES.map(f => f.id)); state.legal = new Set([1, 2, 3]); state.q = ""; $("#q").value = "";
  renderSidebar(); applyFilters();
});

/* =====================================================================
   SUPPLY CHAIN FLOW: origins → methods/families → archetypes → products
   ===================================================================== */
const NS = "http://www.w3.org/2000/svg";
function sEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
let flow = null; // {nodes, edges}
function buildFlowGraph() {
  const fam = state.flowMode === "families";
  const ms = METHODS.filter(methodVisible);
  const N = new Map(); // ref -> node
  const node = (ref, col, label, color) => { let n = N.get(ref); if (!n) { n = {ref, col, label, color, in: [], out: [], w: 0}; N.set(ref, n); } return n; };
  const midOf = m => fam ? node(m.fam, 1, m.fam.name, m.fam.color) : node(m, 1, m.name, m.fam.color);
  const E = new Map();
  const edge = (s, t, w, color) => {
    const k = s.ref.id + "|" + t.ref.id; let e = E.get(k);
    if (!e) { e = {s, t, w: 0, color}; E.set(k, e); s.out.push(e); t.in.push(e); }
    e.w += w;
  };
  for (const m of ms) {
    const mid = midOf(m);
    for (const o of m.originsR) edge(node(o, 0, o.name, KINDS.origin.color), mid, 1, m.fam.color);
    for (const u of m.uses) edge(mid, node(u.a, 2, u.a.name, KINDS.archetype.color), u.w, m.fam.color);
  }
  for (const a of ARCHETYPES) {
    const an = N.get(a); if (!an) continue;
    for (const d of a.productsR) edge(an, node(d, 3, d.name, KINDS.product.color), 1.5, "#94a3b8");
  }
  const nodes = [...N.values()];
  for (const n of nodes) n.w = Math.max(n.in.reduce((s, e) => s + e.w, 0), n.out.reduce((s, e) => s + e.w, 0));
  return {nodes, edges: [...E.values()], fam};
}
function renderFlow() {
  const host = $("#flow");
  const G = buildFlowGraph(); flow = G;
  const W = Math.max(960, host.clientWidth - 8);
  const cols = [0, 1, 2, 3].map(c => G.nodes.filter(n => n.col === c));
  // order: middle column in registry order; others by barycenter of neighbours
  const famIdx = id => FAMILIES.findIndex(f => f.id === id);
  cols[1].sort((a, b) => G.fam ? famIdx(a.ref.id) - famIdx(b.ref.id) : METHODS.indexOf(a.ref) - METHODS.indexOf(b.ref));
  const pos = new Map(); cols[1].forEach((n, i) => pos.set(n, i));
  const bary = (n, side) => { const es = side === "out" ? n.out.map(e => e.t) : n.in.map(e => e.s); const ws = side === "out" ? n.out : n.in; let s = 0, w = 0; es.forEach((m, i) => { if (pos.has(m)) { s += pos.get(m) * ws[i].w; w += ws[i].w; } }); return w ? s / w : 0; };
  cols[0].sort((a, b) => bary(a, "out") - bary(b, "out")); cols[0].forEach((n, i) => pos.set(n, i * cols[1].length / Math.max(1, cols[0].length)));
  cols[2].sort((a, b) => bary(a, "in") - bary(b, "in")); cols[2].forEach((n, i) => pos.set(n, i));
  cols[3].sort((a, b) => bary(a, "in") - bary(b, "in"));
  const H = Math.max(720, cols[1].length * (G.fam ? 64 : 19), cols[2].length * 26);
  const X = [W * 0.2, W * 0.37, W * 0.59, W * 0.8], BW = 10, TOP = 34;
  for (const [c, list] of cols.entries()) {
    const pitch = (H - TOP * 2) / Math.max(1, list.length);
    const maxW = Math.max(1, ...list.map(n => n.w));
    list.forEach((n, i) => {
      n.h = Math.max(6, Math.min(pitch - 3, 6 + (pitch - 9) * (n.w / maxW)));
      n.y = TOP + pitch * (i + 0.5); n.x = X[c];
    });
  }
  host.innerHTML = "";
  const svg = sEl("svg", {width: W, height: H}, host);
  ["Origins", "Acquisition methods", "Provider archetypes", "Products"].forEach((t, c) => {
    const el = sEl("text", {x: c === 0 ? X[c] + BW : X[c], y: 16, class: "fl-head", "text-anchor": c === 0 ? "end" : "start"}, svg);
    el.textContent = t.toUpperCase();
  });
  const gE = sEl("g", {}, svg), gN = sEl("g", {}, svg);
  const maxEW = Math.max(1, ...G.edges.map(e => e.w));
  for (const e of G.edges) {
    const x1 = e.s.x + BW, x2 = e.t.x, mx = (x1 + x2) / 2;
    e.el = sEl("path", {d: `M${x1},${e.s.y} C${mx},${e.s.y} ${mx},${e.t.y} ${x2},${e.t.y}`, class: "fl-link", stroke: e.color, "stroke-width": (1 + 9 * Math.sqrt(e.w / maxEW)).toFixed(2)}, gE);
  }
  for (const n of G.nodes) {
    const g = sEl("g", {class: "fl-node"}, gN);
    sEl("rect", {x: n.x, y: n.y - n.h / 2, width: BW, height: n.h, fill: n.color}, g);
    const left = n.col === 0;
    const t = sEl("text", {x: left ? n.x - 6 : n.x + BW + 6, y: n.y + 4, "text-anchor": left ? "end" : "start"}, g);
    t.textContent = n.label;
    g.__n = n; n.el = g;
  }
  updateFlow();
}
function flowTrace(n) {
  const up = new Set([n]), down = new Set([n]);
  const walk = (start, dir, set) => { const st = [start]; while (st.length) { const x = st.pop(); for (const e of (dir === "in" ? x.in : x.out)) { const y = dir === "in" ? e.s : e.t; if (!set.has(y)) { set.add(y); st.push(y); } } } };
  walk(n, "in", up); walk(n, "out", down);
  return {up, down};
}
let flowFocus = null;
function setFlowFocus(n) {
  if (!flow) return;
  flowFocus = n;
  const host = $("#flow");
  host.classList.toggle("focus", !!n);
  for (const x of flow.nodes) x.el.classList.remove("hl");
  for (const e of flow.edges) e.el.classList.remove("hl");
  if (!n) return;
  const {up, down} = flowTrace(n);
  for (const x of up) x.el.classList.add("hl");
  for (const x of down) x.el.classList.add("hl");
  for (const e of flow.edges) if ((up.has(e.s) && up.has(e.t)) || (down.has(e.s) && down.has(e.t))) e.el.classList.add("hl");
}
function flowNodeFor(id) {
  if (!flow || !id) return null;
  const x = byId[id];
  return flow.nodes.find(n => n.ref === x) || (x && x.kind === "method" && flow.fam ? flow.nodes.find(n => n.ref === x.fam) : null);
}
function updateFlow() {
  if (!flow) return;
  for (const n of flow.nodes) {
    const mt = !!state.q && matches(n.ref);
    n.el.classList.toggle("dim", !!state.q && !mt);
    n.el.classList.toggle("match", mt);
    n.el.classList.toggle("sel", !!state.sel && n.ref.id === state.sel);
  }
  setFlowFocus(flowNodeFor(state.sel));
}
const tip = $("#tip");
$("#flow").addEventListener("mousemove", e => {
  const g = e.target.closest(".fl-node");
  if (!g) { tip.style.display = "none"; if (flowFocus !== flowNodeFor(state.sel)) setFlowFocus(flowNodeFor(state.sel)); return; }
  const n = g.__n, r = n.ref;
  if (flowFocus !== n) setFlowFocus(n);
  tip.innerHTML = `<b>${esc(r.name)}</b><small>${esc(KINDS[r.kind].name)} · ${n.in.length} in · ${n.out.length} out</small><div>${esc(r.summary || r.blurb || "")}</div>`;
  tip.style.display = "block";
  tip.style.left = Math.min(e.clientX + 14, innerWidth - 340) + "px";
  tip.style.top = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 10) + "px";
});
$("#flow").addEventListener("mouseleave", () => { tip.style.display = "none"; setFlowFocus(flowNodeFor(state.sel)); });
$("#flow").addEventListener("click", e => { const g = e.target.closest(".fl-node"); select(g ? g.__n.ref.id : null); });
$("#flowmode").addEventListener("click", e => {
  const b = e.target.closest("[data-mode]"); if (!b) return;
  state.flowMode = b.dataset.mode;
  document.querySelectorAll("#flowmode button").forEach(x => x.classList.toggle("on", x === b));
  renderFlow();
});

/* =====================================================================
   RECIPES: archetypes × methods
   ===================================================================== */
function renderRecipes() {
  const cols = METHODS.filter(methodVisible);
  const rows = ARCHETYPES.filter(a => matches(a) || a.recipeR.some(e => matches(e.m)));
  if (!rows.length || !cols.length) { $("#recipes").innerHTML = `<p class="empty">Nothing matches the current filters.</p>`; return; }
  const groups = FAMILIES.map(f => ({f, n: cols.filter(m => m.family === f.id).length})).filter(g => g.n);
  let h = `<p class="intro">Each row is a kind of data provider; each filled cell is an acquisition method it depends on. Darker = more central to the recipe (core · major · supporting). Click a row for the full build playbook, a column for the method's operating instructions.</p>
    <div class="legendrow"><span><i></i>Core (3)</span><span><i style="opacity:.65"></i>Major (2)</span><span><i style="opacity:.35"></i>Supporting (1)</span></div>
    <table class="rx"><thead><tr class="fams"><th class="corner" rowspan="2">Provider archetype ↓ · method →</th>${groups.map(g => `<th colspan="${g.n}" style="--c:${g.f.color}" title="${esc(g.f.name)}">${esc(g.f.name)}</th>`).join("")}</tr>
    <tr class="names">${cols.map(m => `<th data-c="${m.id}"><div data-id="${m.id}" style="${matches(m) && state.q ? "color:#fde68a" : ""}">${esc(m.name)}</div></th>`).join("")}</tr></thead><tbody>`;
  for (const a of rows) {
    const w = new Map(a.recipeR.map(e => [e.m, e]));
    h += `<tr data-r="${a.id}"><th data-id="${a.id}">${hl(a.name)}</th>` + cols.map(m => {
      const e = w.get(m);
      return e ? `<td class="on w${e.w}" data-c="${m.id}" data-id="${m.id}" style="--c:${m.fam.color}" title="${esc(a.name)} ← ${esc(m.name)} (${e.w}): ${esc(e.note)}"><span></span></td>` : `<td data-c="${m.id}"></td>`;
    }).join("") + `</tr>`;
  }
  $("#recipes").innerHTML = h + `</tbody></table>`;
}
let rxHot = [];
$("#recipes").addEventListener("mouseover", e => {
  rxHot.forEach(x => x.classList.remove("hc", "hr")); rxHot = [];
  const tr = e.target.closest("tr[data-r]"); if (tr) { tr.classList.add("hr"); rxHot.push(tr); }
  const c = e.target.closest("[data-c]"); if (c) document.querySelectorAll(`#recipes [data-c="${c.dataset.c}"]`).forEach(x => { x.classList.add("hc"); rxHot.push(x); });
});
delegate($("#recipes"));

/* =====================================================================
   PLAYBOOKS: method catalogue
   ===================================================================== */
function renderPlaybooks() {
  let h = `<p class="intro">Every acquisition method as an operating playbook: steps, tools, economics, pitfalls, how sources fight back, the law, and who does it. Click a card to open it.</p>`;
  for (const f of FAMILIES) {
    if (!state.fams.has(f.id)) continue;
    const items = f.methods.filter(m => methodVisible(m) && matches(m));
    if (!items.length) continue;
    h += `<section class="sec"><h2><span class="dot" style="background:${f.color}"></span>${esc(f.name)}<span class="cnt">${items.length}</span></h2><p class="blurb">${esc(f.blurb)}</p><div class="cards">` +
      items.map(m => `<button class="card${state.sel === m.id ? " sel" : ""}" data-id="${m.id}" style="--c:${f.color}">
        <div class="ct"><b>${hl(m.name)}</b>${legalBadge(m)}</div>${pips(m)}<p>${hl(m.summary)}</p>
        <div class="meta">${(m.steps || []).length} steps · ${(m.vendors || []).length} vendors · used by ${m.uses.length} archetype${m.uses.length === 1 ? "" : "s"}</div></button>`).join("") + `</div></section>`;
  }
  $("#playbooks").innerHTML = h.includes("class=\"sec\"") ? h : `<p class="empty">Nothing matches the current filters.</p>`;
}
delegate($("#playbooks"));

/* =====================================================================
   PIPELINE
   ===================================================================== */
function renderPipeline() {
  $("#pipeline").innerHTML = `<p class="intro">How raw collection becomes a product. Stages run roughly left to right, top to bottom; compliance processing runs alongside all of them. Click a stage for operating steps, tooling, failure modes and economics.</p>
  <div class="pipe">${STAGES.map(s => `<div class="stage${state.sel === s.id ? " sel" : ""}${state.q && !matches(s) ? " dim" : ""}" data-id="${s.id}">
    <div class="num">STAGE ${s.order || ""}</div><h3>${hl(s.name)}</h3><p>${hl(s.summary)}</p>
    ${(s.failures || []).length ? `<h4>Failure modes</h4><ul>${s.failures.slice(0, 2).map(x => `<li>${fmt(x)}</li>`).join("")}</ul>` : ""}
    <h4>Critical for</h4><div class="chips">${s.archetypes.slice(0, 6).map(a => chip(a)).join("")}${s.archetypes.length > 6 ? `<span class="badge">+${s.archetypes.length - 6}</span>` : ""}</div>
  </div>`).join("")}</div>`;
}
delegate($("#pipeline"));

/* =====================================================================
   ECONOMICS: 3×3 grid of two ratings
   ===================================================================== */
for (const id of ["#ex", "#ey"]) $(id).innerHTML = Object.entries(RATINGS).map(([k, r]) => `<option value="${k}">${esc(r.name)}</option>`).join("");
$("#ex").value = state.ex; $("#ey").value = state.ey;
$("#ex").addEventListener("change", e => { state.ex = e.target.value; renderEconomics(); });
$("#ey").addEventListener("change", e => { state.ey = e.target.value; renderEconomics(); });
function renderEconomics() {
  const X = RATINGS[state.ex], Y = RATINGS[state.ey], lvl = ["", "lo", "mid", "hi"];
  const ms = METHODS.filter(methodVisible);
  let h = `<p class="intro">Where each acquisition method sits on two editorial ratings. The default view, cost against defensibility, shows which collection investments build durable moats: expensive and hard to copy (top right) versus cheap and easy to replicate (bottom left).</p><div class="egrid">`;
  for (const y of [3, 2, 1]) {
    h += `<div class="eaxis y"><span><b>${esc(Y[lvl[y]])}</b>${esc(Y.name)}</span></div>`;
    for (const x of [1, 2, 3]) {
      const cell = ms.filter(m => m.ratings[state.ex] === x && m.ratings[state.ey] === y);
      h += `<div class="ecell">${cell.map(m => `<button class="chip${state.q && !matches(m) ? " dim" : ""}${state.q && matches(m) ? " match" : ""}" data-id="${m.id}" style="--c:${m.fam.color}">${esc(m.name)} <span class="badge lg${m.ratings.legal}">L${m.ratings.legal}</span></button>`).join("")}</div>`;
    }
  }
  h += `<div></div>` + [1, 2, 3].map(x => `<div class="eaxis"><span><b>${esc(X[lvl[x]])}</b>${esc(X.name)}</span></div>`).join("") + `</div>`;
  $("#economics").innerHTML = h;
}
delegate($("#economics"));

/* =====================================================================
   LAW & PRECEDENT
   ===================================================================== */
function renderLaw() {
  const items = RULES.filter(r => matches(r));
  $("#law").innerHTML = items.length ? `<p class="intro">Laws, regulations, precedents and norms that constrain data acquisition, with the methods each one bites on. Not legal advice.</p><div class="cards">` + items.map(r => {
    const n = [...r.appliesR].filter(methodVisible).length;
    return `<button class="card${state.sel === r.id ? " sel" : ""}" data-id="${r.id}" style="--c:${KINDS.rule.color}">
      <div class="ct"><b>${hl(r.name)}</b><span class="badge">${esc(r.jurisdiction || "")}</span></div><p>${hl(r.summary)}</p>
      <div class="meta">Constrains ${n} visible method${n === 1 ? "" : "s"}</div></button>`;
  }).join("") + `</div>` : `<p class="empty">No rules match the search.</p>`;
}
delegate($("#law"));

/* =====================================================================
   DRAWER
   ===================================================================== */
const drawer = $("#drawer");
const sec = (title, body) => body ? `<h3>${esc(title)}</h3>${body}` : "";
const ul = (arr, cls = "") => arr && arr.length ? `<ul class="${cls}">${arr.map(x => `<li>${fmt(x)}</li>`).join("")}</ul>` : "";
const ol = (arr, cls = "") => arr && arr.length ? `<ol class="${cls}">${arr.map(x => `<li>${fmt(x)}</li>`).join("")}</ol>` : "";
const chips = list => list && list.length ? `<div class="chips">${list.map(x => chip(x)).join("")}</div>` : "";
const tools = arr => arr && arr.length ? `<div class="tools">${arr.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : "";
const vendors = arr => arr && arr.length ? arr.map(v => `<p class="vendor"><b>${esc(v.name)}</b> ${evBadge(v.evidence)}<br>${fmt(v.note || "")}</p>`).join("") : "";
const fgLinks = arr => arr && arr.length ? `<div class="chips">${arr.map(id => `<a class="btn" target="_blank" rel="noopener noreferrer" href="../fieldguide/index.html#view=catalog&node=${encodeURIComponent(id)}">${esc(id)} ↗</a>`).join("")}</div>` : "";
function meter(m) {
  const lvl = ["", "lo", "mid", "hi"];
  return `<div class="meter">` + Object.entries(RATINGS).map(([k, r]) => {
    const v = m.ratings[k], c = k === "legal" ? LEGAL_COLORS[v] : "#cbd5e1";
    return `<span>${esc(r.name)}</span><span class="bars" style="--mc:${c}">${[1, 2, 3].map(i => `<i class="${i <= v ? "on" : ""}"></i>`).join("")}</span><span>${esc(r[lvl[v]])}</span>`;
  }).join("") + `</div>`;
}
function body(x) {
  switch (x.kind) {
    case "method": return meter(x) + `<p class="desc">${fmt(x.summary)}</p>` +
      sec("Operating instructions", ol(x.steps, "steps")) +
      sec("Tools", tools(x.tools)) +
      sec("Economics", ul(x.economics)) +
      sec("Pitfalls", ul(x.pitfalls)) +
      sec("How sources defend", ul(x.defenses)) +
      sec("Legal & ethics", ul(x.legal) + (x.rulesR.size ? `<div style="margin-top:8px">${chips([...x.rulesR])}</div>` : "")) +
      sec("Who does this", vendors(x.vendors)) +
      sec("Used to build", x.uses.length ? `<div class="chips">${x.uses.map(u => chip(u.a, ` <span class="w">×${u.w}</span>`)).join("")}</div>` : "") +
      sec("Data origins", chips(x.originsR)) +
      sec("In fieldguide", fgLinks(x.fieldguide));
    case "archetype": return `<p class="desc">${fmt(x.summary)}</p>` +
      sec("Recipe", `<ul class="recipe">${x.recipeR.map(e => `<li>${chip(e.m, ` <span class="w">×${e.w}</span>`)}${fmt(e.note)}</li>`).join("")}</ul>`) +
      sec("Build playbook", ol(x.build, "steps")) +
      sec("Economics", ul(x.economics)) +
      sec("Risks", ul(x.risks)) +
      sec("Critical pipeline stages", chips(x.stagesR)) +
      sec("Products", chips(x.productsR)) +
      sec("Vendors", vendors(x.vendors)) +
      sec("In fieldguide", fgLinks(x.fieldguide));
    case "stage": return `<p class="desc">${fmt(x.summary)}</p>` +
      sec("Operating instructions", ol(x.steps, "steps")) + sec("Tools", tools(x.tools)) +
      sec("Failure modes", ul(x.failures)) + sec("Economics", ul(x.economics)) + sec("Critical for", chips(x.archetypes));
    case "product": return `<p class="desc">${fmt(x.summary)}</p>` + sec("Pricing models", ul(x.pricing)) +
      sec("Examples", tools(x.examples)) + sec("Delivered by", chips(x.archetypes));
    case "origin": return `<p class="desc">${fmt(x.summary)}</p>` + sec("Methods that collect from here", chips(x.methods.filter(methodVisible)));
    case "rule": return `<p class="desc">${fmt(x.summary)}</p>` + sec("Key points", ul(x.points)) +
      sec("Constrains", chips([...x.appliesR].sort((a, b) => METHODS.indexOf(a) - METHODS.indexOf(b))));
    case "family": return `<p class="desc">${fmt(x.blurb)}</p>` + sec("Methods", chips(x.methods));
  }
  return "";
}
function renderDrawer(x) {
  const c = colorOf(x);
  const kicker = x.kind === "method" ? `${KINDS.method.name} · ${x.fam.name}` : x.kind === "rule" ? `${KINDS.rule.name} · ${x.jurisdiction || ""}` : KINDS[x.kind].name;
  drawer.style.setProperty("--c", c);
  drawer.innerHTML = `<div class="bar"></div><div class="inner"><div class="top"><div><div class="kicker">${esc(kicker)}</div><h2>${esc(x.name)}</h2></div><button class="x" id="dx" title="Close (Esc)">✕</button></div>${body(x)}</div>`;
  $("#dx").onclick = () => select(null);
}
delegate(drawer);
function select(id) {
  state.sel = id && byId[id] ? id : null;
  const x = state.sel ? byId[state.sel] : null;
  if (x) { renderDrawer(x); drawer.classList.add("open"); drawer.scrollTop = 0; } else drawer.classList.remove("open");
  document.querySelectorAll(".card.sel,.stage.sel").forEach(c => c.classList.remove("sel"));
  if (x) document.querySelectorAll(`.card[data-id="${x.id}"],.stage[data-id="${x.id}"]`).forEach(c => c.classList.add("sel"));
  updateFlow();
  writeHash();
}

/* =====================================================================
   VIEWS, SEARCH, HASH
   ===================================================================== */
function setView(v) {
  state.view = v;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.view === v));
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  if (v === "flow") renderFlow();
  writeHash();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) setView(b.dataset.view); });
function applyFilters() {
  if (state.view === "flow") renderFlow(); else flow = null;
  renderRecipes(); renderPlaybooks(); renderPipeline(); renderEconomics(); renderLaw();
  const vis = METHODS.filter(m => methodVisible(m) && matches(m)).length;
  $("#stat").textContent = `${vis} of ${METHODS.length} methods · ${ARCHETYPES.length} archetypes · ${RULES.length} rules`;
}
let qt;
$("#q").addEventListener("input", e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 150); });
$("#q").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !state.q) return;
  const first = METHODS.find(m => methodVisible(m) && matches(m)) || all.find(x => x.kind !== "method" && matches(x));
  if (first) select(first.id);
});
document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
  else if (e.key === "Escape") { if (document.activeElement === $("#q")) $("#q").blur(); select(null); }
});
function writeHash() {
  const h = `#view=${state.view}` + (state.sel ? `&item=${state.sel}` : "");
  if (location.hash !== h) history.replaceState(null, "", h);
}
let rt;
window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (state.view === "flow") renderFlow(); }, 150); });

/* =====================================================================
   BOOT
   ===================================================================== */
renderSidebar();
const h0 = new URLSearchParams(location.hash.slice(1));
const v0 = h0.get("view");
state.view = ["flow", "recipes", "playbooks", "pipeline", "economics", "law"].includes(v0) ? v0 : "flow";
applyFilters();
setView(state.view);
if (h0.get("item") && byId[h0.get("item")]) select(h0.get("item"));
