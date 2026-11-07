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
const MODEL_COLORS = {commercial:"#f43f5e", freemium:"#f59e0b", free:"#10b981", oss:"#38bdf8", public:"#a855f7"};
const STAGE_COLORS = {plan:"#06b6d4", collect:"#10b981", process:"#f59e0b", analyze:"#8b5cf6", disseminate:"#ec4899", opsec:"#f97316"};
const state = {
  view: "map",
  layers: new Set(LAYERS.map(l => l.id)),
  models: new Set(Object.keys(MODELS)),
  q: "",
  sel: null,
  layout: "ring",
  colorMode: "layer",
  minLinks: 0,
  scope: "all",
  traceMode: false,
  traceStart: null,
  traceEnd: null,
  tracePath: null
};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hl = s => {
  const e = esc(s); if (!state.q) return e;
  const q = state.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return e.replace(new RegExp("(" + esc(q).replace(/&amp;/g,"&amp;") + ")", "ig"), "<mark>$1</mark>");
};
function updateHopSet() {
  const s = state.sel ? byId[state.sel] : null;
  for (const n of nodes) n.__twoHop = false;
  if (!s) return;
  for (const m of s.nb) {
    for (const k of m.nb) k.__twoHop = true;
  }
}
const visible = n => {
  if (!state.layers.has(n.layer)) return false;
  if (n.model && !state.models.has(n.model)) return false;
  if (n.nb.size < state.minLinks) return false;
  if (state.sel && state.scope !== "all") {
    const s = byId[state.sel];
    if (s && n !== s && !s.nb.has(n) && (state.scope === "1" || !n.__twoHop)) return false;
  }
  return true;
};
const matches = n => !state.q || (n.name + " " + n.desc + " " + n.cat + " " + LMAP[n.layer].name + " " + (n.notes ? n.notes.join(" ") : "")).toLowerCase().includes(state.q);
const color = n => {
  if (state.colorMode === "model" && n.model && MODEL_COLORS[n.model]) return MODEL_COLORS[n.model];
  if (state.colorMode === "stage" && n.stage && STAGE_COLORS[n.stage]) return STAGE_COLORS[n.stage];
  return LMAP[n.layer].color;
};
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
   MAP (3D projection, camera orbit, multi-layout, path finder)
   ===================================================================== */
const NS = "http://www.w3.org/2000/svg";
const svg = $("#graph");
const cam = {
  is3D: false,
  yaw: 0.72,
  pitch: 0.50,
  autoRotate: false,
  fov: 950,
  dist: 1200,
  x: 0,
  y: 0,
  k: 1,
  fitK: 1
};
let vp, gNodes, gC, gE, fitted = false;
let layoutAnim = null; // { step: 0, maxSteps: 35 }

function sEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/* --- Layout Generators --- */
function computeRingLayout() {
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
    n.x = a.x + (rnd() - .5) * 160; n.y = a.y + (rnd() - .5) * 160; n.z = 0;
    n.vx = 0; n.vy = 0;
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
  for (const n of nodes) {
    const hubElev = Math.max(0, (Math.sqrt(n.nb.size) - 2) * 28);
    n.layoutRing = { x: n.x, y: n.y, z: hubElev };
  }
}

function computeStrataLayout() {
  const tiers = {
    source: -360,
    technique: -200,
    tool: -40,
    provider: 120,
    discipline: 280,
    usecase: 280,
    governance: 440,
    community: 440,
    trend: 440
  };
  const byLayer = {};
  for (const n of nodes) (byLayer[n.layer] = byLayer[n.layer] || []).push(n);
  for (const [layer, list] of Object.entries(byLayer)) {
    const z = tiers[layer] || 0;
    const count = list.length;
    const rad = Math.max(130, Math.sqrt(count) * 48);
    list.forEach((n, idx) => {
      const angle = (idx / count) * Math.PI * 2;
      const r = rad * (0.65 + 0.35 * ((idx % 3) / 2));
      n.layoutStrata = { x: Math.cos(angle) * r * 1.2, y: Math.sin(angle) * r, z };
    });
  }
}

function computeSphereLayout() {
  const sphereAnchors = {
    source: { x: 0, y: 0, z: 0 },
    provider: { theta: 0.2, phi: 0.4 },
    technique: { theta: 1.0, phi: 1.5 },
    tool: { theta: 2.1, phi: 1.3 },
    discipline: { theta: 3.2, phi: 1.6 },
    usecase: { theta: 4.3, phi: 1.4 },
    governance: { theta: 5.4, phi: 1.8 },
    community: { theta: 1.6, phi: 2.5 },
    trend: { theta: 4.8, phi: 2.6 }
  };
  const R = 480;
  const byLayer = {};
  for (const n of nodes) (byLayer[n.layer] = byLayer[n.layer] || []).push(n);
  for (const [layer, list] of Object.entries(byLayer)) {
    if (layer === "source") {
      list.forEach((n, i) => {
        const phi = Math.acos(1 - 2 * (i + 0.5) / list.length);
        const theta = Math.PI * (1 + 5 ** 0.5) * i;
        const r = 90 + (i % 5) * 15;
        n.layoutSphere = {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi)
        };
      });
    } else {
      const a = sphereAnchors[layer];
      const ax = R * Math.sin(a.phi) * Math.cos(a.theta);
      const ay = R * Math.sin(a.phi) * Math.sin(a.theta);
      const az = R * Math.cos(a.phi);
      list.forEach((n, i) => {
        const u = ((i * 137.5) % 360) * Math.PI / 180;
        const r = Math.sqrt((i + 1) / list.length) * 110;
        n.layoutSphere = {
          x: ax + Math.cos(u) * r,
          y: ay + Math.sin(u) * r,
          z: az + Math.sin(u * 2) * 35
        };
      });
    }
  }
}

function switchLayout(name) {
  state.layout = name;
  for (const n of nodes) {
    n.sx = n.x; n.sy = n.y; n.sz = n.z;
    const target = (name === "strata") ? n.layoutStrata : (name === "sphere") ? n.layoutSphere : n.layoutRing;
    n.tx = target.x; n.ty = target.y; n.tz = target.z;
  }
  layoutAnim = { step: 0, maxSteps: 35 };
  writeHash();
}

function stepLayoutAnim() {
  if (!layoutAnim) return;
  layoutAnim.step++;
  const t = layoutAnim.step / layoutAnim.maxSteps;
  const ease = 1 - Math.pow(1 - t, 3);
  for (const n of nodes) {
    n.x = n.sx + (n.tx - n.sx) * ease;
    n.y = n.sy + (n.ty - n.sy) * ease;
    n.z = n.sz + (n.tz - n.sz) * ease;
  }
  if (layoutAnim.step >= layoutAnim.maxSteps) {
    layoutAnim = null;
    for (const n of nodes) { n.x = n.tx; n.y = n.ty; n.z = n.tz; }
    fit();
  }
}

/* --- Graph SVG Construction --- */
function buildMap() {
  computeRingLayout();
  computeStrataLayout();
  computeSphereLayout();
  for (const n of nodes) {
    n.x = n.layoutRing.x; n.y = n.layoutRing.y; n.z = n.layoutRing.z;
    n.xp = n.x; n.yp = n.y; n.zp = n.z; n.p = 1;
  }
  vp = sEl("g", {}, svg);
  gC = sEl("g", {}, vp);
  gE = sEl("g", {}, vp);
  gNodes = sEl("g", {}, vp);

  for (const l of links) {
    l.el = sEl("line", {x1: l.s.xp, y1: l.s.yp, x2: l.t.xp, y2: l.t.yp, class: "edge"}, gE);
  }
  const hubs = new Set(LAYERS.flatMap(l => nodes.filter(n => n.layer === l.id).sort((a, b) => b.nb.size - a.nb.size).slice(0, 4)));
  for (const n of nodes) {
    n.r = 4 + Math.sqrt(n.nb.size) * 1.8;
    const g = sEl("g", {class: "node" + (hubs.has(n) ? " hub" : ""), transform: `translate(${n.xp},${n.yp})`}, gNodes);
    n.circleEl = sEl("circle", {r: n.r, fill: color(n)}, g);
    const t = sEl("text", {x: n.r + 3, y: 4, class: "lbl"}, g);
    t.textContent = n.name;
    g.__n = n; n.el = g;
  }
  for (const l of LAYERS) {
    const ns = nodes.filter(n => n.layer === l.id);
    const cx = ns.reduce((a, n) => a + n.xp, 0) / ns.length;
    const minY = Math.min(...ns.map(n => n.yp));
    const t = sEl("text", {x: cx, y: minY - 22, class: "clabel", fill: l.color, "data-layer": l.id}, gC);
    t.textContent = l.name;
    l.labelEl = t;
  }
  updateLegend();
  applyProjection();
  setupMapControls();
}

/* --- 3D Projection Math --- */
function applyProjection() {
  const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
  const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);
  const fov = cam.fov, dist = cam.dist;

  for (const n of nodes) {
    if (cam.is3D) {
      const x1 = n.x * cosY + n.z * sinY;
      const z1 = -n.x * sinY + n.z * cosY;
      const y2 = n.y * cosP - z1 * sinP;
      const z2 = n.y * sinP + z1 * cosP;
      const p = fov / Math.max(120, dist - z2);
      n.xp = x1 * p;
      n.yp = y2 * p;
      n.zp = z2;
      n.p = p;
      n.circleEl.setAttribute("r", (n.r * (0.65 + 0.35 * p)).toFixed(1));
      const depthAlpha = Math.max(0.25, Math.min(1, 0.45 + 0.55 * ((z2 + 500) / 1000)));
      n.circleEl.style.opacity = depthAlpha;
    } else {
      n.xp = n.x;
      n.yp = n.y;
      n.zp = 0;
      n.p = 1;
      n.circleEl.setAttribute("r", n.r);
      n.circleEl.style.opacity = "";
    }
    n.el.setAttribute("transform", `translate(${n.xp.toFixed(1)},${n.yp.toFixed(1)})`);
  }

  if (cam.is3D) {
    const sorted = [...nodes].sort((a, b) => a.zp - b.zp);
    for (const n of sorted) gNodes.appendChild(n.el);
  }

  for (const l of links) {
    l.el.setAttribute("x1", l.s.xp.toFixed(1));
    l.el.setAttribute("y1", l.s.yp.toFixed(1));
    l.el.setAttribute("x2", l.t.xp.toFixed(1));
    l.el.setAttribute("y2", l.t.yp.toFixed(1));
    if (cam.is3D) {
      const avgZ = (l.s.zp + l.t.zp) / 2;
      const lAlpha = Math.max(0.08, Math.min(0.65, 0.18 + 0.4 * ((avgZ + 500) / 1000)));
      l.el.style.strokeOpacity = l.el.classList.contains("path-edge") ? "1" : l.el.classList.contains("hl") ? "0.85" : lAlpha;
    } else {
      l.el.style.strokeOpacity = "";
    }
  }

  for (const l of LAYERS) {
    const ns = nodes.filter(n => n.layer === l.id && visible(n));
    if (!ns.length) { l.labelEl.style.display = "none"; continue; }
    l.labelEl.style.display = state.layers.has(l.id) ? "" : "none";
    const cx = ns.reduce((a, n) => a + n.xp, 0) / ns.length;
    const minY = Math.min(...ns.map(n => n.yp));
    l.labelEl.setAttribute("x", cx.toFixed(1));
    l.labelEl.setAttribute("y", (minY - 22).toFixed(1));
  }

  drawGizmo();
}

function applyT() {
  vp.setAttribute("transform", `translate(${cam.x.toFixed(1)},${cam.y.toFixed(1)}) scale(${cam.k.toFixed(3)})`);
  gNodes.style.fontSize = (12 / cam.k) + "px";
  for (const l of LAYERS) l.labelEl.style.fontSize = (15 / cam.k) + "px";
  svg.classList.toggle("zoomed", cam.k > cam.fitK * 2.2);
}

function drawGizmo() {
  const canvas = $("#gizmo");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const len = 22;
  const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
  const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);
  const axes = [
    { label: "X", color: "#f87171", x: 1, y: 0, z: 0 },
    { label: "Y", color: "#4ade80", x: 0, y: 1, z: 0 },
    { label: "Z", color: "#60a5fa", x: 0, y: 0, z: 1 }
  ];
  for (const a of axes) {
    const x1 = a.x * cosY + a.z * sinY;
    const z1 = -a.x * sinY + a.z * cosY;
    const y2 = a.y * cosP - z1 * sinP;
    const z2 = a.y * sinP + z1 * cosP;
    a.px = cx + x1 * len;
    a.py = cy + y2 * len;
    a.pz = z2;
  }
  axes.sort((a, b) => a.pz - b.pz);
  for (const a of axes) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(a.px, a.py);
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(a.px, a.py, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = a.color;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.label, a.px, a.py);
  }
}

function fit() {
  const vis = nodes.filter(n => visible(n));
  if (!vis.length) return;
  const r = svg.getBoundingClientRect();
  if (!r.width) return;
  const xs = vis.map(n => n.xp), ys = vis.map(n => n.yp);
  const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 140, minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 40;
  const k = Math.min(r.width / (maxX - minX), r.height / (maxY - minY));
  cam.k = k; cam.fitK = k;
  cam.x = (r.width - (maxX - minX) * k) / 2 - minX * k;
  cam.y = (r.height - (maxY - minY) * k) / 2 - minY * k;
  applyT(); fitted = true;
}

function zoomAt(factor, mx, my) {
  const k2 = Math.max(cam.fitK * 0.4, Math.min(cam.fitK * 12, cam.k * factor));
  cam.x = mx - (mx - cam.x) * (k2 / cam.k);
  cam.y = my - (my - cam.y) * (k2 / cam.k);
  cam.k = k2;
  applyT();
}

function centerOn(n, k) {
  const r = svg.getBoundingClientRect();
  cam.k = Math.max(cam.k, k || cam.fitK * 2.4);
  cam.x = r.width / 2 - n.xp * cam.k - (state.sel ? 180 : 0);
  cam.y = r.height / 2 - n.yp * cam.k;
  applyT();
}

function moveNode3D(n, dScreenX, dScreenY) {
  const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
  const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);
  const ux = cosY, uy = 0, uz = -sinY;
  const vx = -sinY * sinP, vy = cosP, vz = -cosY * sinP;
  const invScale = 1 / (cam.k * (n.p || 1));
  n.x += (dScreenX * ux + dScreenY * vx) * invScale;
  n.y += (dScreenX * uy + dScreenY * vy) * invScale;
  n.z += (dScreenX * uz + dScreenY * vz) * invScale;
  applyProjection();
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

/* --- Mouse & Pointer Interaction --- */
let drag = null;
svg.addEventListener("contextmenu", e => e.preventDefault());
svg.addEventListener("pointerdown", e => {
  const ne = e.target.closest(".node");
  const isPan = e.shiftKey || e.button === 1 || e.button === 2;
  drag = {
    x: e.clientX,
    y: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    node: ne ? ne.__n : null,
    moved: false,
    tx: cam.x,
    ty: cam.y,
    isPan: isPan
  };
  svg.setPointerCapture(e.pointerId);
  svg.classList.add(cam.is3D && !ne && !isPan ? "orbiting" : "dragging");
});
svg.addEventListener("pointermove", e => {
  if (!drag) {
    const ne = e.target.closest(".node");
    if (ne) { setFocus(ne.__n); showTip(ne.__n, e); }
    else { tip.style.display = "none"; setFocus(state.sel ? byId[state.sel] : null); }
    return;
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  const stepX = e.clientX - drag.lastX, stepY = e.clientY - drag.lastY;
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;

  if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
    drag.moved = true;
    tip.style.display = "none";
  }
  if (!drag.moved) return;

  if (drag.node) {
    if (cam.is3D) {
      moveNode3D(drag.node, stepX, stepY);
    } else {
      const r = svg.getBoundingClientRect();
      drag.node.x = (e.clientX - r.left - cam.x) / cam.k;
      drag.node.y = (e.clientY - r.top - cam.y) / cam.k;
      applyProjection();
    }
  } else if (drag.isPan || !cam.is3D) {
    cam.x = drag.tx + dx;
    cam.y = drag.ty + dy;
    applyT();
  } else {
    cam.yaw = (cam.yaw + stepX * 0.007) % (Math.PI * 2);
    cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + stepY * 0.007));
    applyProjection();
  }
});
svg.addEventListener("pointerup", () => {
  if (drag && !drag.moved) {
    if (state.traceMode) {
      if (drag.node) handlePathPick(drag.node.id);
    } else {
      select(drag.node ? drag.node.id : null);
    }
  }
  drag = null;
  svg.classList.remove("dragging", "orbiting");
});
svg.addEventListener("pointerleave", () => {
  tip.style.display = "none";
  if (!drag) setFocus(state.sel ? byId[state.sel] : null);
});
svg.addEventListener("wheel", e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
}, {passive: false});

/* --- Map Controls & Toolbar --- */
function set3D(enabled) {
  cam.is3D = enabled;
  $("#tog3d").classList.toggle("on", enabled);
  $("#tog3d").textContent = enabled ? "2D" : "3D";
  $("#tog3d").title = enabled ? "Switch to 2D flat view (3 / V)" : "Switch to 3D perspective orbit (3 / V)";
  if (!enabled) {
    cam.autoRotate = false;
    $("#autorot").classList.remove("on");
    $("#autorot").textContent = "▶";
    cam.yaw = 0;
    cam.pitch = 0;
  } else {
    if (cam.yaw === 0 && cam.pitch === 0) {
      cam.yaw = 0.72;
      cam.pitch = 0.50;
    }
  }
  applyProjection();
  fit();
  writeHash();
}

function setupMapControls() {
  $("#zin").onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1.4, r.width / 2, r.height / 2); };
  $("#zout").onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1 / 1.4, r.width / 2, r.height / 2); };
  $("#zfit").onclick = fit;
  $("#zreset").onclick = () => {
    if (cam.is3D) { cam.yaw = 0.72; cam.pitch = 0.50; applyProjection(); }
    fit();
  };
  $("#tog3d").onclick = () => set3D(!cam.is3D);
  $("#autorot").onclick = () => {
    if (!cam.is3D) set3D(true);
    cam.autoRotate = !cam.autoRotate;
    $("#autorot").classList.toggle("on", cam.autoRotate);
    $("#autorot").textContent = cam.autoRotate ? "❚❚" : "▶";
  };

  const gw = $("#gizmo-wrap");
  if (gw) {
    gw.onclick = e => {
      if (!cam.is3D) set3D(true);
      const rect = gw.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      if (Math.hypot(mx, my) < 14) { cam.yaw = 0; cam.pitch = 0; }
      else if (mx > 14) { cam.yaw = Math.PI / 2; cam.pitch = 0; }
      else if (my > 14) { cam.yaw = 0; cam.pitch = 1.35; }
      else { cam.yaw = 0.72; cam.pitch = 0.50; }
      applyProjection();
      fit();
    };
  }

  $("#ctl-layout").onchange = e => switchLayout(e.target.value);
  $("#ctl-color").onchange = e => {
    state.colorMode = e.target.value;
    updateNodeColors();
    updateMap();
  };
  $("#ctl-degree").onchange = e => {
    state.minLinks = parseInt(e.target.value, 10) || 0;
    applyFilters();
  };
  $("#ctl-scope").onclick = e => {
    const btn = e.target.closest("button[data-scope]");
    if (!btn) return;
    $("#ctl-scope").querySelectorAll("button").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    state.scope = btn.dataset.scope;
    applyFilters();
  };
  $("#btn-trace").onclick = () => {
    if (state.traceMode) stopPathTrace();
    else startPathTrace(state.sel);
  };
  $("#path-close").onclick = stopPathTrace;
  $("#btn-export").onclick = e => {
    e.stopPropagation();
    $("#export-menu").classList.toggle("open");
  };
  document.addEventListener("click", () => $("#export-menu")?.classList.remove("open"));
  $("#exp-svg").onclick = () => { $("#export-menu").classList.remove("open"); exportSVG(); };
  $("#exp-png").onclick = () => { $("#export-menu").classList.remove("open"); exportPNG(); };
}

/* --- Path Finding (BFS) --- */
function traceShortestPath(startId, endId) {
  if (!startId || !endId) return null;
  if (startId === endId) return [byId[startId]];
  const queue = [startId];
  const visited = new Set([startId]);
  const parent = {};
  while (queue.length > 0) {
    const currId = queue.shift();
    const curr = byId[currId];
    if (!curr) continue;
    for (const nb of curr.nb) {
      if (visited.has(nb.id)) continue;
      visited.add(nb.id);
      parent[nb.id] = currId;
      if (nb.id === endId) {
        const path = [];
        let c = endId;
        while (c) { path.unshift(byId[c]); c = parent[c]; }
        return path;
      }
      queue.push(nb.id);
    }
  }
  return null;
}

function startPathTrace(fromId) {
  state.traceMode = true;
  $("#btn-trace").classList.add("active");
  $("#path-hud").style.display = "flex";
  state.traceStart = fromId || null;
  state.traceEnd = null;
  state.tracePath = null;
  updatePathUI();
}

function stopPathTrace() {
  state.traceMode = false;
  state.traceStart = null;
  state.traceEnd = null;
  state.tracePath = null;
  $("#btn-trace").classList.remove("active");
  $("#path-hud").style.display = "none";
  for (const n of nodes) n.el.classList.remove("path-node");
  for (const l of links) l.el.classList.remove("path-edge");
  updateMap();
}

function handlePathPick(id) {
  if (!state.traceStart) {
    state.traceStart = id;
    updatePathUI();
  } else if (!state.traceEnd && id !== state.traceStart) {
    state.traceEnd = id;
    const p = traceShortestPath(state.traceStart, state.traceEnd);
    state.tracePath = p;
    updatePathUI();
    applyPathHighlight(p);
  } else if (state.traceEnd) {
    state.traceStart = id;
    state.traceEnd = null;
    state.tracePath = null;
    updatePathUI();
    applyPathHighlight(null);
  }
}

function applyPathHighlight(path) {
  for (const n of nodes) n.el.classList.remove("path-node");
  for (const l of links) l.el.classList.remove("path-edge");
  if (!path || !path.length) { updateMap(); return; }
  for (const n of path) n.el.classList.add("path-node");
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const link = links.find(l => (l.s === a && l.t === b) || (l.s === b && l.t === a));
    if (link) link.el.classList.add("path-edge");
  }
  updateMap();
}

function updatePathUI() {
  const sChip = $("#path-start-chip");
  const eChip = $("#path-end-chip");
  const res = $("#path-hud-result");
  if (state.traceStart) {
    sChip.textContent = byId[state.traceStart]?.name || state.traceStart;
    sChip.classList.add("picked");
  } else {
    sChip.textContent = "Select start...";
    sChip.classList.remove("picked");
  }
  if (state.traceEnd) {
    eChip.textContent = byId[state.traceEnd]?.name || state.traceEnd;
    eChip.classList.add("picked");
  } else {
    eChip.textContent = "Select end...";
    eChip.classList.remove("picked");
  }
  if (state.tracePath) {
    res.innerHTML = `<b>${state.tracePath.length - 1} hops:</b> ` +
      state.tracePath.map(n => `<span class="path-step" data-id="${n.id}">${esc(n.name)}</span>`).join(" ➔ ");
    res.querySelectorAll(".path-step").forEach(el => {
      el.onclick = () => { select(el.dataset.id); centerOn(byId[el.dataset.id]); };
    });
  } else if (state.traceStart && state.traceEnd) {
    res.innerHTML = "<em>No connecting path found</em>";
  } else {
    res.innerHTML = "<em>Click two entities to reveal connection path</em>";
  }
}

/* --- Export Routines --- */
function exportSVG() {
  const r = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", r.width);
  clone.setAttribute("height", r.height);
  clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#0a0e16");
  clone.insertBefore(bg, clone.firstChild);
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    .edge { stroke: #40507a; stroke-opacity: 0.35; stroke-width: 1; }
    .edge.hl { stroke: #93c5fd; stroke-opacity: 0.85; stroke-width: 2; }
    .edge.path-edge { stroke: #38bdf8; stroke-opacity: 1; stroke-width: 3.5; }
    .node circle { stroke: #0a0e16; stroke-width: 1.5; }
    .node.center circle { stroke: #fff; stroke-width: 2.5; }
    .node.match circle { stroke: #fff; stroke-width: 2; }
    .node.path-node circle { stroke: #38bdf8; stroke-width: 3; }
    .lbl { fill: #e6ebf5; font-family: system-ui, sans-serif; font-size: 11px; paint-order: stroke; stroke: #0a0e16; stroke-width: 3px; }
    .clabel { font-family: system-ui, sans-serif; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; paint-order: stroke; stroke: #0a0e16; stroke-width: 4px; }
  `;
  clone.appendChild(styleEl);
  const str = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fieldguide-graph-${cam.is3D ? "3d" : "2d"}-${state.layout}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPNG() {
  const r = svg.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = r.width * scale;
  canvas.height = r.height * scale;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
  );
  grad.addColorStop(0, "#101a2c");
  grad.addColorStop(0.7, "#0a0e16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.k, cam.k);

  for (const l of links) {
    if (!visible(l.s) || !visible(l.t)) continue;
    const isHl = l.el.classList.contains("hl");
    const isPath = l.el.classList.contains("path-edge");
    ctx.beginPath();
    ctx.moveTo(l.s.xp, l.s.yp);
    ctx.lineTo(l.t.xp, l.t.yp);
    ctx.strokeStyle = isPath ? "#38bdf8" : isHl ? "#93c5fd" : "#40507a";
    ctx.globalAlpha = isPath ? 1 : isHl ? 0.85 : 0.28;
    ctx.lineWidth = (isPath ? 3.5 : isHl ? 2 : 1) / cam.k;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const n of nodes) {
    if (!visible(n)) continue;
    const isSel = state.sel === n.id;
    const isHl = n.el.classList.contains("hl");
    const isMatch = n.el.classList.contains("match");
    const isPath = n.el.classList.contains("path-node");
    const r = cam.is3D ? n.r * (0.65 + 0.35 * n.p) : n.r;
    ctx.beginPath();
    ctx.arc(n.xp, n.yp, r, 0, Math.PI * 2);
    ctx.fillStyle = color(n);
    ctx.fill();
    ctx.lineWidth = (isSel ? 2.5 : isPath ? 3 : isMatch ? 2 : 1.5) / cam.k;
    ctx.strokeStyle = isSel || isMatch ? "#ffffff" : isPath ? "#38bdf8" : "#0a0e16";
    ctx.stroke();

    const isHub = n.el.classList.contains("hub");
    const showLbl = isHub || cam.k > cam.fitK * 2.2 || isHl || isMatch || isPath;
    if (showLbl) {
      ctx.font = `${Math.round(11 / cam.k)}px system-ui, sans-serif`;
      ctx.fillStyle = "#e6ebf5";
      ctx.strokeStyle = "#0a0e16";
      ctx.lineWidth = 3 / cam.k;
      ctx.strokeText(n.name, n.xp + r + 3, n.yp + 4);
      ctx.fillText(n.name, n.xp + r + 3, n.yp + 4);
    }
  }

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fieldguide-graph-${cam.is3D ? "3d" : "2d"}-${state.layout}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* --- Legend & Colors --- */
function updateLegend() {
  const el = $("#legend");
  if (!el) return;
  const isMin = el.classList.contains("min");
  let title = "Ecosystem map";
  let items = [];
  if (state.colorMode === "layer") {
    title = "Ecosystem map · Layers";
    items = LAYERS.map(l => `<span><i style="background:${l.color}"></i>${l.name}</span>`);
  } else if (state.colorMode === "model") {
    title = "Ecosystem map · Access Models";
    items = Object.entries(MODELS).map(([k, name]) => `<span><i style="background:${MODEL_COLORS[k]}"></i>${name}</span>`);
  } else if (state.colorMode === "stage") {
    title = "Ecosystem map · Intelligence Stages";
    items = [...STAGES, XCUT].map(s => `<span><i style="background:${STAGE_COLORS[s.id]}"></i>${s.name}</span>`);
  }
  el.innerHTML = `<b>${title} <button class="lx" title="Collapse">${isMin ? "+" : "–"}</button></b><div class="row">${items.join("")}</div>
    <p>Orbit 3D: drag · Pan: Shift+drag · Zoom: scroll · Auto-spin: Space · Path tracer: P</p>`;
  if (isMin) el.classList.add("min");
  const lx = el.querySelector(".lx");
  if (lx) {
    lx.onclick = () => {
      el.classList.toggle("min");
      lx.textContent = el.classList.contains("min") ? "+" : "–";
    };
  }
}

function updateNodeColors() {
  for (const n of nodes) {
    const c = color(n);
    if (n.circleEl) n.circleEl.setAttribute("fill", c);
  }
  updateLegend();
}

function updateMap() {
  for (const n of nodes) {
    const v = visible(n);
    n.el.style.display = v ? "" : "none";
    const mt = !!state.q && matches(n);
    n.el.classList.toggle("dim", (!!state.q && !mt) || (state.traceMode && state.tracePath && !n.el.classList.contains("path-node")));
    n.el.classList.toggle("match", mt);
  }
  for (const l of links) {
    const isPath = l.el.classList.contains("path-edge");
    l.el.style.display = (visible(l.s) && visible(l.t)) ? "" : "none";
    if (state.traceMode && state.tracePath && !isPath) {
      l.el.style.strokeOpacity = "0.03";
    }
  }
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
      <button class="btn" id="dtrace">Trace path</button>
      ${n.url ? `<a class="btn" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">Open website ↗</a>` : ""}
    </div>
    ${n.notes ? `<h3>Practitioner notes</h3><ul class="notes">${n.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <h3>Connections</h3>${groups || `<p class="desc">No direct connections.</p>`}
  </div>`;
  const dxBtn = $("#dx"); if (dxBtn) dxBtn.onclick = () => select(null);
  const dmapBtn = $("#dmap"); if (dmapBtn) dmapBtn.onclick = () => { setView("map"); centerOn(n); };
  const dtraceBtn = $("#dtrace"); if (dtraceBtn) dtraceBtn.onclick = () => { setView("map"); startPathTrace(n.id); };
  drawer.querySelectorAll(".chip").forEach(c => c.onclick = () => select(c.dataset.id));
}
function select(id) {
  state.sel = id && byId[id] ? id : null;
  const n = state.sel ? byId[state.sel] : null;
  updateHopSet();
  const scopeWrap = $("#ctl-scope-wrap");
  if (scopeWrap) scopeWrap.style.display = n ? "inline-flex" : "none";
  if (n) { renderDrawer(n); drawer.classList.add("open"); drawer.scrollTop = 0; }
  else drawer.classList.remove("open");
  setFocus(n);
  if (state.scope !== "all") updateMap();
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
  const isInput = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
  else if (e.key === "Escape") {
    if (document.activeElement === $("#q")) $("#q").blur();
    if (state.traceMode) stopPathTrace();
    else select(null);
  } else if (!isInput) {
    if (e.key === "3" || e.key.toLowerCase() === "v") {
      set3D(!cam.is3D);
    } else if (e.key === " " && state.view === "map") {
      e.preventDefault();
      $("#autorot")?.click();
    } else if (e.key.toLowerCase() === "r" && state.view === "map") {
      $("#zreset")?.click();
    } else if (e.key.toLowerCase() === "p" && state.view === "map") {
      $("#btn-trace")?.click();
    }
  }
});
function writeHash() {
  let h = `#view=${state.view}` + (state.sel ? `&node=${state.sel}` : "");
  if (cam.is3D) h += `&dim=3d`;
  if (state.layout !== "ring") h += `&layout=${state.layout}`;
  if (location.hash !== h) history.replaceState(null, "", h);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return {
    view: p.get("view"),
    node: p.get("node"),
    dim: p.get("dim"),
    layout: p.get("layout")
  };
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
if (h0.dim === "3d") set3D(true);
if (h0.layout && ["ring", "strata", "sphere"].includes(h0.layout)) {
  $("#ctl-layout").value = h0.layout;
  switchLayout(h0.layout);
}
setView(["map", "catalog", "workflow", "matrix"].includes(h0.view) ? h0.view : "map");
if (h0.node && byId[h0.node]) { select(h0.node); if (state.view === "map") centerOn(byId[h0.node]); }

/* --- Continuous Animation Loop (auto-rotate and layout transitions) --- */
function loop() {
  let needsProj = false;
  if (cam.autoRotate && cam.is3D && !drag) {
    cam.yaw = (cam.yaw + 0.005) % (Math.PI * 2);
    needsProj = true;
  }
  if (layoutAnim) {
    stepLayoutAnim();
    needsProj = true;
  }
  if (needsProj) applyProjection();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
