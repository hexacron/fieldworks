# Architecture

Plain HTML, CSS and JavaScript with no framework, bundler or package manager. `index.html` loads `src/styles.css`, then two classic scripts in order:

```
src/data.js   declares LAYERS, MODELS, STAGES, XCUT, RAW (data only)
src/app.js    builds the model and renders everything
```

Both are classic scripts (not ES modules) so the page works from `file://`, where browsers block module imports. Top-level `const`s share the global lexical scope, which is how `app.js` sees the data. Keep that load order.

## `src/app.js` sections

| Section | Responsibility |
|---|---|
| MODEL | Flattens `RAW` into `nodes` (`{id, layer, cat, name, desc, rel, model, url, stage, notes, nb:Set, links:[]}`) and `byId`. Resolves relations into deduplicated, undirected `links` (`{s, t}`). Collects unresolved IDs in `missing`. Exposes `window.__fieldguide = {nodes, links, missing}` (counts plus the missing list) for console checks. |
| STATE & HELPERS | `state`, DOM/escape helpers, `visible(n)`, `matches(n)`. |
| SIDEBAR | Layer checkboxes and "only" buttons, access-model chips, reset. |
| MAP | Force layout, SVG construction, pan/zoom/drag, hover focus, tooltip, filter application. |
| CATALOG | Card grid, re-rendered on every filter change. |
| WORKFLOW | Stage columns, rendered once; chips are dimmed or highlighted on filter change. |
| MATRIX | Source × technique table, re-rendered on every filter change; row/column hover highlight. |
| DRAWER | Detail panel (description, badges, practitioner notes, connections by layer) and `select(id)`, the single entry point for selection from every view. |
| VIEWS, SEARCH, HASH | Tab switching, debounced search, keyboard shortcuts, URL state. |
| BOOT | Initial render, then applies view and selection from the URL. |

## State

```js
state = {
  view:   "map" | "catalog" | "workflow" | "matrix",
  layers: Set<layerId>,      // checked layers
  models: Set<modelKey>,     // enabled access models
  q:      string,            // lower-cased search text
  sel:    nodeId | null      // selected entity
}
```

- `visible(n)`: the node's layer is checked **and** (it has no model, or its model is enabled).
- `matches(n)`: case-insensitive substring of name + description + category + layer name + practitioner notes; always true when the search is empty. Because notes are searched, a term can match an entity whose card shows no highlighted text.

Any filter change calls `applyFilters()`, which updates all four views and the header counter. Search input is debounced by 120 ms.

### How each view applies filters

| | Layer / access filters | Search |
|---|---|---|
| Map | Non-visible nodes, their edges and their layer's cluster label are hidden. | Non-matches are dimmed; matches get a white ring and an always-on label. Nothing is hidden. |
| Catalog | Non-visible entities are omitted. | Non-matches are omitted; matches are highlighted with `<mark>`. |
| Workflow | Non-visible chips are dimmed. | Non-matches are dimmed; matches are outlined. |
| Matrix | Ignored. The matrix always shows the full catalogue. | Filters rows (sources) only. |
| Detail panel | Ignored. It always lists every connection. | Ignored. |
| Header counter | Counts entities that are visible **and** match. | |

## Map

### Layout

Computed once at load by `layout()`. The simulation is deterministic, so the map looks the same on every load. It took about 74 ms for 259 nodes in headless Chromium on an Apple-silicon Mac.

- **Anchors.** `source` is anchored at the origin. The other layers are anchored around an ellipse starting at 12 o'clock in `LAYERS` order. Each gets an arc proportional to `max(28, layerSize)` (small layers get a floor so they don't collide). Radius is `520 + √size·14`, with x stretched ×1.25 to suit landscape screens.
- **Start.** Each node starts at its anchor ±80 px, jittered by a seeded Park–Miller generator (seed 42).
- **Simulation (450 iterations), per iteration:**
  - pairwise repulsion `3200/d²` within 400 px, ×1.6 between different layers to separate clusters;
  - link springs with rest length 160 and stiffness 0.0007 (kept weak so clusters aren't dragged into each other);
  - anchor gravity 0.022;
  - velocity damping 0.55, with a velocity cap of `30·alpha + 2` that cools linearly.
- **Cost.** Repulsion is O(n²) per iteration. At several times the current node count, replace it with a Barnes–Hut quadtree or precompute positions [inference: not measured].

To retune, change the constants in `layout()` and check the result visually. The main failure mode is adjacent clusters overlapping; raise anchor gravity or the cross-layer repulsion factor to fix it.

Dragging a node moves only that node and its edges. Nothing re-simulates, and moved positions are not persisted.

### Rendering and interaction

- SVG layers: cluster labels → edges → nodes, all inside one `<g>` transformed by `T = {x, y, k}`.
- **Labels.** Node labels use font size `12/k` and cluster labels `15/k`, so text stays the same size on screen at any zoom. Strokes use `vector-effect: non-scaling-stroke`.
- **When labels show.** By default only the 4 best-connected nodes per layer are labelled (`.hub`). All labels appear when `k > 2.2 × fitK` (`#graph.zoomed`), and also on hover/selection neighbours and search matches.
- **Fit.** `fitK` is computed the first time the map is shown and again on window resize while the map is active. Zoom is clamped to `[0.4, 12] × fitK`.
- **Focus mode.** Hovering a node (or having one selected) adds `#graph.focus` and marks the node, its neighbours and its edges `.hl`; everything else fades. Leaving a node restores focus to the selection.
- **Pointer.** Movement under 4 px counts as a click: on a node it selects, on the background it deselects. Larger movement drags the node, or pans when started on the background.
- **Centring.** `centerOn(n)` zooms to at least `2.4 × fitK` and offsets left by 180 px when a selection is open, so the node isn't hidden under the detail panel.

## URL state

- `select()` and `setView()` call `writeHash()`, which uses `history.replaceState` to write `#view=<view>[&node=<id>]`. Browser history is not filled with entries.
- The hash is read **only at boot**. There is no `hashchange` listener, so editing the hash in an open tab needs a reload.

## Keyboard

| Key | Action |
|---|---|
| `/` | Focus search. |
| Enter (in search) | Select the first visible match; on the map, also centre it. |
| Esc | Leave the search box and clear the selection. |

## Output safety

All catalogue text reaches the DOM through `esc()` before `innerHTML`. Search highlighting escapes both the text and the regex. External links use `target="_blank" rel="noopener noreferrer"`. Nothing is fetched at runtime.

## Adding a view

1. `index.html`: add `<button data-view="NAME">` to `#tabs` and `<section class="view" id="v-NAME"><div id="NAME" style="position:absolute;inset:0"></div></section>` inside `<main>`.
2. `src/app.js`: write `renderNAME()`. Call it from `applyFilters()` if it should react to filters, or once at boot.
3. Delegate clicks: `$("#NAME").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id); })`. Render clickable items with `data-id`.
4. Add `"NAME"` to the allowed-view list in BOOT so deep links to it work.
5. Add styles to `src/styles.css`, and document the view in `README.md`.
