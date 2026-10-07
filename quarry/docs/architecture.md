# Architecture

Plain HTML, CSS and JavaScript with no framework, bundler or package manager. Runs from `file://`.

```
index.html
  src/styles.css
  src/data/core.js         registries + helpers (must load first)
  src/data/*.js            content: helper calls only
  src/app.js               model resolution + all rendering (must load last)
```

All scripts are classic scripts, not ES modules, because browsers block module imports from `file://`. Top-level `const`s share the global lexical scope; that's how data files reach the helpers in `core.js` and how `app.js` reaches the registries.

## `src/app.js` sections

| Section | Responsibility |
|---|---|
| MODEL | Registers every entity in `byId` with a `kind`. Builds `_text` (lower-cased JSON of the entity's own fields) for search. Resolves all cross-references into `*R` fields and back-links (see [data-model.md](data-model.md#derived-relationships-computed-in-appjs)). Validates ratings. Publishes `window.__quarry = {counts, perFamily, missing}`. |
| STATE & HELPERS | `state`, escaping, inline markup (`fmt`), filters, chips, badges, pips. |
| SIDEBAR | Family checkboxes with "only", legal-exposure chips, reset. |
| SUPPLY CHAIN FLOW | Builds a 4-column layered graph and renders it as SVG; hover tracing, click to select. |
| RECIPES | Archetype × method matrix. |
| PLAYBOOKS | Method cards grouped by family. |
| PIPELINE | Stage cards in `order`. |
| ECONOMICS | 3×3 grid of any two ratings. |
| LAW & PRECEDENT | Rule cards. |
| DRAWER | Per-kind detail renderers and `select(id)`, the single selection entry point. |
| VIEWS, SEARCH, HASH | Tabs, debounced search (150 ms), keyboard, URL state. |
| BOOT | Sidebar, initial view from the URL hash, initial selection. |

## State and filtering

```js
state = { view, fams:Set<familyId>, legal:Set<1|2|3>, q, sel, flowMode:"methods"|"families", ex, ey }
```

- `methodVisible(m)`: the method's family is checked **and** its legal rating is enabled.
- `matches(x)`: substring match of the search text in the entity's `_text`. This covers every field, including steps, tools, vendors and notes.

| View | Family / legal filters | Search |
|---|---|---|
| Supply chain | Hidden methods (or families) drop out. Archetypes, products and origins with no remaining links drop out. | Non-matching nodes dim; matching labels turn amber. |
| Recipes | Columns limited to visible methods. | Rows limited to archetypes that match, or that use a matching method. Matching column labels are highlighted. |
| Playbooks | Only visible methods. | Only matching methods. |
| Pipeline | Ignored. | Non-matching stages dim. |
| Economics | Only visible methods. | Non-matches dim; matches are outlined. |
| Law | Method counts reflect visible methods. | Only matching rules. |

Every filter change calls `applyFilters()`, which re-renders all views. The flow graph is only rebuilt while the Supply chain view is active, because its layout needs the container width. Re-rendering is cheap at the current size.

## Supply chain layout

`buildFlowGraph()` builds nodes and weighted, directed edges:

| Edge | Weight |
|---|---|
| origin → method (or family) | 1 per method–origin pair |
| method (or family) → archetype | recipe weight (1–3) |
| archetype → product | 1.5 |

In **Families** mode, methods are aggregated into their family and parallel edges are summed. Nodes are only created when an edge touches them, so filtered-out branches disappear.

`renderFlow()` then lays the graph out:

- **Columns.** Four fixed columns at 17 / 38 / 66 / 84 % of the width.
- **Row order.** The middle column keeps registry (family) order. Origins, archetypes and products are ordered by the weighted barycenter of their neighbours' positions, which removes most crossings cheaply.
- **Height.** The SVG is as tall as the longest column needs (≈19 px per method, 64 px per family, 26 px per archetype, minimum 720 px), and the view scrolls.
- **Bar heights** are proportional to the node's larger of total in- and out-weight within its column.
- **Link widths** are `1 + 9·√(w / max w)`, drawn as cubic Béziers coloured by method family.

Hovering traces the full supply chain through a node: everything upstream along incoming edges and everything downstream along outgoing edges. Edges are highlighted only when both ends lie on the same upstream or downstream path. The selected entity stays traced while the pointer is elsewhere. Window resize re-renders the flow (debounced).

## Rendering and safety

- All entity text passes through `esc()` before reaching `innerHTML`. `fmt()` escapes first, then adds `<code>` and nested lists.
- Search highlighting escapes both the text and the regex.
- Vendor and fieldguide links are generated from data, use `rel="noopener noreferrer"`, and are the only outbound links.
- Nothing is fetched at runtime.

## URL state

`#view=<view>[&item=<id>]`, written with `history.replaceState` on view change and selection, and read only at boot.

## Adding a view

1. `index.html`: add a tab button `data-view="NAME"` and `<section class="view" id="v-NAME"><div id="NAME" class="scroll pad"></div></section>`.
2. `app.js`: write `renderNAME()`, call it from `applyFilters()`, and register click handling with `delegate($("#NAME"))`. Clickable elements need `data-id`.
3. Add `"NAME"` to the allowed views in BOOT.
4. Document it in `README.md`.
