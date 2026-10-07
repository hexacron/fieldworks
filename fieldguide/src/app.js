"use strict";
/* =====================================================================
   MODEL: builds nodes and symmetric links from RAW (src/data.js)
   ===================================================================== */
const LMAP = Object.fromEntries(LAYERS.map(l => [l.id, l]));
const nodes = [], byId = {};
for (const [layer, rows] of Object.entries(RAW)) {
  for (const [id, cat, name, desc, rel = "", extra = {}] of rows) {
    if (byId[id]) console.warn("Duplicate id", id);
    const n = {id, layer, cat, name, desc, rel: rel.split(/\s+/).filter(Boolean),
               model: extra.model || null, url: extra.url || null, stage: extra.stage || null, notes: extra.notes || null,
               nb: new Set(), links: []};
    nodes.push(n); byId[id] = n;
  }
}
const links = [], missing = [], seenLink = new Set();
for (const n of nodes) for (const r of n.rel) {
  const t = byId[r];
  if (!t) { missing.push(n.id + " → " + r); continue; }
  if (t === n) continue;
  const key = n.id < t.id ? n.id + "|" + t.id : t.id + "|" + n.id;
  if (seenLink.has(key)) continue;
  seenLink.add(key);
  const l = {s: n, t};
  links.push(l); n.links.push(l); t.links.push(l); n.nb.add(t); t.nb.add(n);
}
if (missing.length) console.warn("Unresolved relations:", missing);
window.__fieldguide = {nodes: nodes.length, links: links.length, missing};

/* =====================================================================
   STATE & HELPERS
   ===================================================================== */
const state = {view: "map", layers: new Set(LAYERS.map(l => l.id)), models: new Set(Object.keys(MODELS)), q: "", sel: null};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hl = s => {
  const e = esc(s); if (!state.q) return e;
  const q = state.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return e.replace(new RegExp("(" + esc(q).replace(/&amp;/g,"&amp;") + ")", "ig"), "<mark>$1</mark>");
};
const visible = n => state.layers.has(n.layer) && (!n.model || state.models.has(n.model));
const matches = n => !state.q || (n.name + " " + n.desc + " " + n.cat + " " + LMAP[n.layer].name + " " + (n.notes ? n.notes.join(" ") : "")).toLowerCase().includes(state.q);
const color = n => LMAP[n.layer].color;
const badge = n => n.model ? `<span class="badge ${n.model}">${MODELS[n.model]}</span>` : "";

/* =====================================================================
   SIDEBAR
   ===================================================================== */
function renderSidebar() {
  $("#layers").innerHTML = LAYERS.map(l => {
    const cnt = nodes.filter(n => n.layer === l.id).length;
    return `<label class="layer" style="--c:${l.color}" data-layer="${l.id}">
      <input type="checkbox" ${state.layers.has(l.id) ? "checked" : ""}>
      <span class="sw"></span><span class="nm">${l.name}</span><span class="ct">${cnt}</span>
      <button class="only" data-only="${l.id}" title="Show only this layer">only</button></label>`;
  }).join("");
  $("#models").innerHTML = Object.entries(MODELS).map(([k, v]) =>
    `<button class="fchip ${state.models.has(k) ? "on" : ""}" data-model="${k}">${v}</button>`).join("");
}
$("#layers").addEventListener("change", e => {
  const lab = e.target.closest("[data-layer]"); if (!lab) return;
  const id = lab.dataset.layer;
  e.target.checked ? state.layers.add(id) : state.layers.delete(id);
  applyFilters();
});
$("#layers").addEventListener("click", e => {
  const b = e.target.closest("[data-only]"); if (!b) return;
  e.preventDefault();
  state.layers = new Set([b.dataset.only]);
  renderSidebar(); applyFilters();
});
$("#models").addEventListener("click", e => {
  const b = e.target.closest("[data-model]"); if (!b) return;
  const k = b.dataset.model;
  state.models.has(k) ? state.models.delete(k) : state.models.add(k);
  b.classList.toggle("on");
  applyFilters();
});
$("#reset").addEventListener("click", () => {
  state.layers = new Set(LAYERS.map(l => l.id)); state.models = new Set(Object.keys(MODELS));
  state.q = ""; $("#q").value = "";
  renderSidebar(); applyFilters();
});

/* =====================================================================
   MAP (force-directed, clustered by layer)
   ===================================================================== */
const NS = "http://www.w3.org/2000/svg";
const svg = $("#graph");
const T = {x: 0, y: 0, k: 1}; let fitK = 1, fitted = false;
let vp, gNodes;
function sEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function layout() {
  // Sources sit in the center; every other layer gets an anchor on an ellipse, sized by cluster population.
  const ring = LAYERS.filter(l => l.id !== "source");
  const anchors = {source: {x: 0, y: 0}};
  const sizes = ring.map(l => Math.max(28, nodes.filter(n => n.layer === l.id).length));
  const total = sizes.reduce((a, b) => a + b, 0);
  let acc = 0;
  ring.forEach((l, i) => {
    const a = -Math.PI / 2 + ((acc + sizes[i] / 2) / total) * Math.PI * 2;
    acc += sizes[i];
    const rad = 520 + Math.sqrt(sizes[i]) * 14;
    anchors[l.id] = {x: Math.cos(a) * rad * 1.25, y: Math.sin(a) * rad};
  });
  let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const n of nodes) {
    const a = anchors[n.layer];
    n.x = a.x + (rnd() - .5) * 160; n.y = a.y + (rnd() - .5) * 160; n.vx = 0; n.vy = 0;
  }
  const N = nodes.length, iters = 450;
  for (let it = 0; it < iters; it++) {
    const alpha = 1 - it / iters;
    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < N; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > 160000) continue;
        if (d2 < 1) { dx = rnd() - .5; dy = rnd() - .5; d2 = 1; }
        const same = a.layer === b.layer ? 1 : 1.6;
        const f = 3200 * same / d2;
        const d = Math.sqrt(d2);
        a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
      }
    }
    for (const l of links) {
      const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 160) * 0.0007;
      l.s.vx += dx / d * f; l.s.vy += dy / d * f; l.t.vx -= dx / d * f; l.t.vy -= dy / d * f;
    }
    for (const n of nodes) {
      const a = anchors[n.layer];
      n.vx += (a.x - n.x) * 0.022; n.vy += (a.y - n.y) * 0.022;
      n.vx *= 0.55; n.vy *= 0.55;
      const vmax = 30 * alpha + 2;
      const v = Math.hypot(n.vx, n.vy);
      if (v > vmax) { n.vx *= vmax / v; n.vy *= vmax / v; }
      n.x += n.vx; n.y += n.vy;
    }
  }
}
function buildMap() {
  layout();
  vp = sEl("g", {}, svg);
  const gC = sEl("g", {}, vp), gE = sEl("g", {}, vp);
  gNodes = sEl("g", {}, vp);
  for (const l of links) {
    l.el = sEl("line", {x1: l.s.x, y1: l.s.y, x2: l.t.x, y2: l.t.y, class: "edge"}, gE);
  }
  // Always label the best-connected few per layer; everything else appears on zoom, hover or search.
  const hubs = new Set(LAYERS.flatMap(l => nodes.filter(n => n.layer === l.id).sort((a, b) => b.nb.size - a.nb.size).slice(0, 4)));
  for (const n of nodes) {
    n.r = 4 + Math.sqrt(n.nb.size) * 1.8;
    const g = sEl("g", {class: "node" + (hubs.has(n) ? " hub" : ""), transform: `translate(${n.x},${n.y})`}, gNodes);
    sEl("circle", {r: n.r, fill: color(n)}, g);
    const t = sEl("text", {x: n.r + 3, y: 4, class: "lbl"}, g);
    t.textContent = n.name;
    g.__n = n; n.el = g;
  }
  for (const l of LAYERS) {
    const ns = nodes.filter(n => n.layer === l.id);
    const cx = ns.reduce((a, n) => a + n.x, 0) / ns.length;
    const minY = Math.min(...ns.map(n => n.y));
    const t = sEl("text", {x: cx, y: minY - 22, class: "clabel", fill: l.color, "data-layer": l.id}, gC);
    t.textContent = l.name;
    l.labelEl = t;
  }
  $("#legend").innerHTML = `<b>Ecosystem map <button class="lx" title="Collapse">–</button></b><div class="row">${LAYERS.map(l => `<span><i style="background:${l.color}"></i>${l.name}</span>`).join("")}</div>
    <p>Node size = number of connections. Hover to trace, click for details, drag to rearrange, scroll to zoom.</p>`;
  $("#legend .lx").onclick = () => $("#legend").classList.toggle("min");
}
function applyT() {
  vp.setAttribute("transform", `translate(${T.x},${T.y}) scale(${T.k})`);
  gNodes.style.fontSize = (12 / T.k) + "px";
  for (const l of LAYERS) l.labelEl.style.fontSize = (15 / T.k) + "px";
  svg.classList.toggle("zoomed", T.k > fitK * 2.2);
}
function fit() {
  const vis = nodes.filter(n => n.el.style.display !== "none");
  if (!vis.length) return;
  const r = svg.getBoundingClientRect();
  if (!r.width) return;
  const xs = vis.map(n => n.x), ys = vis.map(n => n.y);
  const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 140, minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 40;
  const k = Math.min(r.width / (maxX - minX), r.height / (maxY - minY));
  T.k = k; fitK = k;
  T.x = (r.width - (maxX - minX) * k) / 2 - minX * k;
  T.y = (r.height - (maxY - minY) * k) / 2 - minY * k;
  applyT(); fitted = true;
}
function zoomAt(factor, mx, my) {
  const k2 = Math.max(fitK * 0.4, Math.min(fitK * 12, T.k * factor));
  T.x = mx - (mx - T.x) * (k2 / T.k); T.y = my - (my - T.y) * (k2 / T.k); T.k = k2; applyT();
}
function centerOn(n, k) {
  const r = svg.getBoundingClientRect();
  T.k = Math.max(T.k, k || fitK * 2.4);
  T.x = r.width / 2 - n.x * T.k - (state.sel ? 180 : 0);
  T.y = r.height / 2 - n.y * T.k;
  applyT();
}
function moveNode(n) {
  n.el.setAttribute("transform", `translate(${n.x},${n.y})`);
  for (const l of n.links) {
    if (l.s === n) { l.el.setAttribute("x1", n.x); l.el.setAttribute("y1", n.y); }
    else { l.el.setAttribute("x2", n.x); l.el.setAttribute("y2", n.y); }
  }
}
let focused = null;
function setFocus(n) {
  if (focused === n) return;
  if (focused) {
    focused.el.classList.remove("hl", "center");
    for (const m of focused.nb) m.el.classList.remove("hl");
    for (const l of focused.links) l.el.classList.remove("hl");
  }
  focused = n;
  svg.classList.toggle("focus", !!n);
  if (!n) return;
  n.el.classList.add("hl", "center");
  for (const m of n.nb) m.el.classList.add("hl");
  for (const l of n.links) l.el.classList.add("hl");
}
const tip = $("#tip");
function showTip(n, e) {
  tip.innerHTML = `<b>${esc(n.name)}</b><small>${LMAP[n.layer].name} · ${esc(n.cat)} · ${n.nb.size} links</small><div>${esc(n.desc)}</div>`;
  tip.style.display = "block";
  const x = Math.min(e.clientX + 14, innerWidth - 320), y = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 10);
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
let drag = null;
svg.addEventListener("pointerdown", e => {
  const ne = e.target.closest(".node");
  drag = {x: e.clientX, y: e.clientY, node: ne ? ne.__n : null, moved: false, tx: T.x, ty: T.y};
  svg.setPointerCapture(e.pointerId);
  svg.classList.add("dragging");
});
svg.addEventListener("pointermove", e => {
  if (!drag) {
    const ne = e.target.closest(".node");
    if (ne) { setFocus(ne.__n); showTip(ne.__n, e); }
    else { tip.style.display = "none"; setFocus(state.sel ? byId[state.sel] : null); }
    return;
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; tip.style.display = "none"; }
  if (!drag.moved) return;
  if (drag.node) {
    const r = svg.getBoundingClientRect();
    drag.node.x = (e.clientX - r.left - T.x) / T.k; drag.node.y = (e.clientY - r.top - T.y) / T.k;
    moveNode(drag.node);
  } else { T.x = drag.tx + dx; T.y = drag.ty + dy; applyT(); }
});
svg.addEventListener("pointerup", () => {
  if (drag && !drag.moved) select(drag.node ? drag.node.id : null);
  drag = null; svg.classList.remove("dragging");
});
svg.addEventListener("pointerleave", () => { tip.style.display = "none"; if (!drag) setFocus(state.sel ? byId[state.sel] : null); });
svg.addEventListener("wheel", e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
}, {passive: false});
$("#zin").onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1.4, r.width / 2, r.height / 2); };
$("#zout").onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1 / 1.4, r.width / 2, r.height / 2); };
$("#zfit").onclick = fit;
function updateMap() {
  for (const n of nodes) {
    const v = visible(n);
    n.el.style.display = v ? "" : "none";
    const mt = !!state.q && matches(n);
    n.el.classList.toggle("dim", !!state.q && !mt);
    n.el.classList.toggle("match", mt);
  }
  for (const l of links) l.el.style.display = (visible(l.s) && visible(l.t)) ? "" : "none";
  for (const l of LAYERS) l.labelEl.style.display = state.layers.has(l.id) ? "" : "none";
}

/* =====================================================================
   CATALOG
   ===================================================================== */
function connSummary(n) {
  const c = {};
  for (const m of n.nb) c[m.layer] = (c[m.layer] || 0) + 1;
  return LAYERS.filter(l => c[l.id]).map(l => `<span title="${l.name}"><i style="background:${l.color}"></i>${c[l.id]}</span>`).join("");
}
function renderCatalog() {
  let html = "";
  for (const l of LAYERS) {
    if (!state.layers.has(l.id)) continue;
    const items = nodes.filter(n => n.layer === l.id && visible(n) && matches(n));
    if (!items.length) continue;
    html += `<section class="sec"><h2><span class="dot" style="background:${l.color}"></span>${l.name}<span class="cnt">${items.length}</span></h2><p class="blurb">${l.blurb}</p>`;
    for (const c of [...new Set(items.map(n => n.cat))]) {
      html += `<h3>${esc(c)}</h3><div class="cards">` + items.filter(n => n.cat === c).map(n =>
        `<button class="card${state.sel === n.id ? " sel" : ""}" data-id="${n.id}" style="--c:${l.color}">
          <div class="ct"><b>${hl(n.name)}</b>${badge(n)}</div><p>${hl(n.desc)}</p><div class="meta">${connSummary(n)}${n.notes ? `<span class="nt">${n.notes.length} practitioner notes</span>` : ""}</div></button>`).join("") + `</div>`;
    }
    html += `</section>`;
  }
  $("#catalog").innerHTML = html || `<p class="empty">No entities match the current filters.</p>`;
}
$("#catalog").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id); });

/* =====================================================================
   WORKFLOW
   ===================================================================== */
function chip(n) { return `<button class="chip" data-id="${n.id}" style="--c:${color(n)}">${esc(n.name)}</button>`; }
function stageBlock(stageId) {
  const groups = [["technique", "Techniques"], ["tool", "Tools"], ["governance", "Frameworks & rules"]];
  return groups.map(([layer, label]) => {
    const items = nodes.filter(n => n.layer === layer && n.stage === stageId);
    return items.length ? `<h4>${label}</h4><div class="chips">${items.map(chip).join("")}</div>` : "";
  }).join("");
}
function renderWorkflow() {
  $("#workflow").innerHTML = `<p class="wf-intro">The intelligence cycle applied to OSINT. Each technique, tool and framework is placed at the stage where it does most of its work; click any item for details and connections.</p>
  <div class="wf">${STAGES.map((s, i) => `<div class="stage"><div class="num">STAGE ${i + 1}</div><h3>${s.name}</h3><p>${s.blurb}</p>${stageBlock(s.id)}</div>`).join("")}
  <div class="stage xcut"><div class="num">ALWAYS</div><h3>${XCUT.name}</h3><p>${XCUT.blurb}</p>${stageBlock(XCUT.id)}</div></div>
  <div class="feedback">↺ Feedback: consumer reactions and new questions return to planning and refine requirements.</div>`;
  updateWorkflow();
}
function updateWorkflow() {
  for (const c of document.querySelectorAll("#workflow .chip")) {
    const n = byId[c.dataset.id];
    c.classList.toggle("dim", !visible(n) || (!!state.q && !matches(n)));
    c.classList.toggle("match", !!state.q && matches(n));
  }
}
$("#workflow").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id); });

/* =====================================================================
   MATRIX (sources × techniques)
   ===================================================================== */
function renderMatrix() {
  const rows = nodes.filter(n => n.layer === "source" && matchesOrAll(n));
  const cols = nodes.filter(n => n.layer === "technique" && [...n.nb].some(m => m.layer === "source"));
  const maxP = Math.max(...nodes.filter(n => n.layer === "source").map(n => [...n.nb].filter(m => m.layer === "provider").length));
  let h = `<p class="mx-intro">Which collection techniques exploit which data sources. The right-hand bar shows how many catalogued providers serve each source. Click any label or cell to inspect.</p>
  <table class="mx"><thead><tr><th class="corner">Data source ↓ · technique →</th>${cols.map(c => `<th data-c="${c.id}"><div data-id="${c.id}">${esc(c.name)}</div></th>`).join("")}<th class="barh"><div>Providers</div></th></tr></thead><tbody>`;
  for (const r of rows) {
    const pc = [...r.nb].filter(m => m.layer === "provider").length;
    h += `<tr data-r="${r.id}"><th data-id="${r.id}">${esc(r.name)}</th>` + cols.map(c =>
      r.nb.has(c) ? `<td class="on" data-c="${c.id}" data-id="${c.id}" title="${esc(r.name)} × ${esc(c.name)}"><span></span></td>` : `<td data-c="${c.id}"></td>`
    ).join("") + `<td class="bar" data-id="${r.id}" title="${pc} providers"><span style="width:${Math.round(pc / maxP * 100)}px"></span>${pc}</td></tr>`;
  }
  h += `</tbody></table>`;
  $("#matrix").innerHTML = rows.length ? h : `<p class="empty">No data sources match the search.</p>`;
}
const matchesOrAll = n => !state.q || matches(n);
let mxHot = null;
$("#matrix").addEventListener("mouseover", e => {
  const td = e.target.closest("td,th[data-c]"); const tr = e.target.closest("tr[data-r]");
  const c = td && td.dataset.c;
  if (mxHot) mxHot.forEach(x => x.classList.remove("hc", "hr"));
  mxHot = [];
  if (tr) { tr.classList.add("hr"); mxHot.push(tr); }
  if (c) document.querySelectorAll(`#matrix [data-c="${c}"]`).forEach(x => { x.classList.add("hc"); mxHot.push(x); });
});
$("#matrix").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id); });

/* =====================================================================
   DRAWER
   ===================================================================== */
const drawer = $("#drawer");
function renderDrawer(n) {
  const l = LMAP[n.layer];
  const groups = LAYERS.map(L => {
    const items = [...n.nb].filter(m => m.layer === L.id).sort((a, b) => b.nb.size - a.nb.size);
    return items.length ? `<h4 style="--c:${L.color}">${L.name} (${items.length})</h4><div class="chips">${items.map(chip).join("")}</div>` : "";
  }).join("");
  const stage = n.stage ? (STAGES.find(s => s.id === n.stage) || XCUT).name : null;
  drawer.style.setProperty("--c", l.color);
  drawer.innerHTML = `<div class="bar"></div><div class="inner">
    <div class="top"><div><div class="kicker">${l.name} · ${esc(n.cat)}</div><h2>${esc(n.name)}</h2></div><button class="x" id="dx" title="Close (Esc)">✕</button></div>
    <div class="facts">${badge(n)}${stage ? `<span class="badge">Workflow: ${esc(stage)}</span>` : ""}<span class="badge">${n.nb.size} connections</span></div>
    <p class="desc">${esc(n.desc)}</p>
    <div class="actions">
      <button class="btn" id="dmap">Show on map</button>
      ${n.url ? `<a class="btn" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">Open website ↗</a>` : ""}
    </div>
    ${n.notes ? `<h3>Practitioner notes</h3><ul class="notes">${n.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <h3>Connections</h3>${groups || `<p class="desc">No direct connections.</p>`}
  </div>`;
  $("#dx").onclick = () => select(null);
  $("#dmap").onclick = () => { setView("map"); centerOn(n); };
  drawer.querySelectorAll(".chip").forEach(c => c.onclick = () => select(c.dataset.id));
}
function select(id) {
  state.sel = id && byId[id] ? id : null;
  const n = state.sel ? byId[state.sel] : null;
  if (n) { renderDrawer(n); drawer.classList.add("open"); drawer.scrollTop = 0; }
  else drawer.classList.remove("open");
  setFocus(n);
  document.querySelectorAll(".card.sel").forEach(c => c.classList.remove("sel"));
  if (n) document.querySelectorAll(`.card[data-id="${n.id}"]`).forEach(c => c.classList.add("sel"));
  writeHash();
}

/* =====================================================================
   VIEWS, SEARCH, HASH
   ===================================================================== */
function setView(v) {
  state.view = v;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.view === v));
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  if (v === "map" && !fitted) fit();
  writeHash();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) setView(b.dataset.view); });
function applyFilters() {
  updateMap(); renderCatalog(); updateWorkflow(); renderMatrix();
  const vis = nodes.filter(n => visible(n) && matches(n)).length;
  $("#stat").textContent = `${vis} of ${nodes.length} entities · ${links.length} connections`;
}
let qt;
$("#q").addEventListener("input", e => {
  clearTimeout(qt);
  qt = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 120);
});
$("#q").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const first = nodes.find(n => visible(n) && state.q && matches(n));
    if (first) { select(first.id); if (state.view === "map") centerOn(first); }
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
  else if (e.key === "Escape") { if (document.activeElement === $("#q")) $("#q").blur(); select(null); }
});
function writeHash() {
  const h = `#view=${state.view}` + (state.sel ? `&node=${state.sel}` : "");
  if (location.hash !== h) history.replaceState(null, "", h);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return {view: p.get("view"), node: p.get("node")};
}
window.addEventListener("resize", () => { if (state.view === "map") fit(); });

/* =====================================================================
   BOOT
   ===================================================================== */
renderSidebar();
buildMap();
renderWorkflow();
applyFilters();
const h0 = readHash();
setView(["map", "catalog", "workflow", "matrix"].includes(h0.view) ? h0.view : "map");
if (h0.node && byId[h0.node]) { select(h0.node); if (state.view === "map") centerOn(byId[h0.node]); }
