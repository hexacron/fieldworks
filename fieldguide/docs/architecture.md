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

### Layouts

Three 3D layout geometries are computed at boot and can be switched dynamically with smooth cubic easing:

1. **Ecosystem Ring (`ring`):** 2D clustered force layout with sources at the origin and the 8 surrounding layer clusters on an ellipse. In 3D space, major hubs elevate vertically based on connectivity ($z = (\sqrt{\text{degree}} - 2) \cdot 28$), forming an organic 3D topography.
2. **3D Strata Stack (`strata`):** Organizes the ecosystem into discrete horizontal architectural tiers along the $Z$-axis, reflecting the intelligence supply chain:
   - $Z = -360$: Data Sources
   - $Z = -200$: Collection Techniques
   - $Z = -40$: Tools & Platforms
   - $Z = +120$: Data Providers
   - $Z = +280$: Disciplines & Use Cases
   - $Z = +440$: Governance, Community & Trends
   Cross-layer relationships appear as vertical bridging lines across tiers.
3. **3D Constellation (`sphere`):** Spherical distribution where Data Sources form an inner nucleus and the other 8 layers are anchored across the outer spherical hull ($R = 480$), creating an orbital galaxy.

### 3D Projection & Camera

- **Coordinates & Camera:** Nodes carry 3D coordinates $(x, y, z)$. Camera state maintains horizontal azimuth (`yaw`), elevation tilt (`pitch`), pan offset $(x, y)$, zoom scale $k$, and field of view ($fov = 950$, $dist = 1200$).
- **Perspective Projection:**
  $$x_1 = x \cos(\text{yaw}) + z \sin(\text{yaw}), \quad z_1 = -x \sin(\text{yaw}) + z \cos(\text{yaw})$$
  $$y_2 = y \cos(\text{pitch}) - z_1 \sin(\text{pitch}), \quad z_2 = y \sin(\text{pitch}) + z_1 \cos(\text{pitch})$$
  In 3D mode, the perspective factor is $p = \frac{fov}{\max(120, dist - z_2)}$. In 2D flat mode, $\text{yaw} = 0, \text{pitch} = 0, p = 1$, strictly matching standard 2D layout.
- **Depth Cueing & Sorting:** Nearer nodes are rendered with larger radii and full opacity; background nodes are gently attenuated. In 3D mode, nodes are depth-sorted by $z_2$ in DOM order so foreground elements properly occlude background elements.
- **3D Orientation Gizmo:** A 3D coordinate compass widget (`<canvas id="gizmo">`) renders live X (red), Y (green), and Z (blue) axes matching camera angles. Clicking snaps to Top (2D), Isometric 3D, Front, or Side.

### Graph Capabilities

- **Shortest Path Tracer:** Breadth-first search (BFS) finds the shortest route between two selected nodes across the network graph. Path nodes and edges are emphasized with glowing pulse animation; intermediate hops are displayed in an interactive HUD.
- **Neighborhood Scope Filter:** When an entity is selected, analysts can toggle visibility between **All**, **2-hop** (extended neighborhood), and **1-hop** (direct links only).
- **Degree/Hub Filtering:** Filters nodes by minimum link threshold (All, ≥3, ≥6, ≥10).
- **Visual Encodings:** Nodes and legend dynamically re-color by **Layer**, **Access Model** (Commercial, Freemium, Free, OSS, Public), or **Workflow Stage** (Plan, Collect, Process, Analyze, Disseminate, OPSEC).
- **Snapshot Export:** Exports current view as standalone SVG vector or high-resolution PNG image with radial backdrop.

### Pointer & Interaction

- **3D Mode:** Left-drag on canvas orbits pitch and yaw; Shift+drag or right-drag pans; scroll wheel zooms. Left-drag on a node moves it across the 3D camera tangent plane.
- **2D Mode:** Left-drag pans; Alt+drag or right-drag transitions to 3D orbit.
- **Clicking:** Under 4 px movement selects a node (or sets start/end in path tracer); background click clears selection.
## URL state

- `select()` and `setView()` call `writeHash()`, which uses `history.replaceState` to write `#view=<view>[&node=<id>]`. Browser history is not filled with entries.
- The hash is read **only at boot**. There is no `hashchange` listener, so editing the hash in an open tab needs a reload.

## Keyboard

| Key | Action |
|---|---|
| `/` | Focus search. |
| Enter (in search) | Select the first visible match; on the map, also centre it. |
| Esc | Leave the search box and clear selection (or cancel path tracer). |
| `3` or `V` | Toggle 3D perspective orbit / 2D flat view. |
| Space | Toggle continuous 3D auto-rotation. |
| `R` | Reset camera angle. |
| `P` | Toggle shortest-path tracer. |

## Output safety

All catalogue text reaches the DOM through `esc()` before `innerHTML`. Search highlighting escapes both the text and the regex. External links use `target="_blank" rel="noopener noreferrer"`. Nothing is fetched at runtime.

## Adding a view

1. `index.html`: add `<button data-view="NAME">` to `#tabs` and `<section class="view" id="v-NAME"><div id="NAME" style="position:absolute;inset:0"></div></section>` inside `<main>`.
2. `src/app.js`: write `renderNAME()`. Call it from `applyFilters()` if it should react to filters, or once at boot.
3. Delegate clicks: `$("#NAME").addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c) select(c.dataset.id); })`. Render clickable items with `data-id`.
4. Add `"NAME"` to the allowed-view list in BOOT so deep links to it work.
5. Add styles to `src/styles.css`, and document the view in `README.md`.
