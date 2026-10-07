# Data model

All content lives in `src/data.js`. It is a classic (non-module) script loaded before `src/app.js`, so its top-level `const`s are visible to `app.js`. Nothing in `data.js` executes logic. It only declares data.

## Top-level declarations

| Name | Type | Purpose |
|---|---|---|
| `LAYERS` | array of `{id, name, color, blurb}` | The nine layers. **Array order is display order** in the sidebar, catalog, legend, detail panel and map ring. `blurb` is shown under each catalog section heading. |
| `MODELS` | object `key → label` | Access-model enum used for badges and the sidebar filter. |
| `STAGES` | array of `{id, name, blurb}` | The five intelligence-cycle columns of the Workflow view, in order. |
| `XCUT` | `{id: "opsec", name, blurb}` | The cross-cutting row under the Workflow columns. |
| `C`, `F`, `FR`, `O`, `P` | strings | Shorthands for the `MODELS` keys `commercial`, `freemium`, `free`, `oss`, `public`. |
| `m(model, url, stage, notes)` | function → object | Builds the optional extras object. Pass `null` (or omit trailing arguments) to skip a field, e.g. `m(C, null, "analyze")`. |
| `st(stage, notes)` | function → object | Extras with only a stage and optional notes. |
| `RAW` | object `layerId → rows[]` | The entities. Keys must match `LAYERS[].id`. |

## Entity rows

Each row in `RAW[layer]` is a positional array:

```js
[id, category, name, description, relations?, extras?]
```

| # | Field | Required | Rules |
|---|---|---|---|
| 0 | `id` | yes | Globally unique. Use the layer prefix below plus a short snake_case slug. Appears in URLs (`#node=p_shodan`), so treat it as stable. |
| 1 | `category` | yes | Free text. Groups cards under sub-headings in the Catalog, in **order of first appearance** within the layer. Reuse an existing category's exact spelling to join it. |
| 2 | `name` | yes | Display name. |
| 3 | `description` | yes | One or two neutral sentences. Shown on cards (clamped to 3 lines), in tooltips and in the detail panel. Searched. |
| 4 | `relations` | no | Space-separated IDs of related entities. See [Relations](#relations). Use `""` when you need extras but have no relations. |
| 5 | `extras` | no | `{model, url, stage, notes}`; build with `m()` or `st()`. |

Strings are double-quoted. Don't put a raw `"` inside a description; use `‘ ’` or rephrase.

### ID prefixes

| Layer | `LAYERS[].id` | Prefix | Example |
|---|---|---|---|
| Data Sources | `source` | `s_` | `s_ais` |
| Data Providers | `provider` | `p_` | `p_shodan` |
| Collection Techniques | `technique` | `k_` | `k_geoloc` |
| Tools & Platforms | `tool` | `t_` | `t_maltego` |
| Disciplines (INTs) | `discipline` | `d_` | `d_socmint` |
| Use Cases & Sectors | `usecase` | `u_` | `u_kyc` |
| Frameworks, Law & Ethics | `governance` | `g_` | `g_berkeley` |
| Community & Training | `community` | `c_` | `c_tracelabs` |
| Trends & Challenges | `trend` | `r_` | `r_api` |

The prefix is a convention for readability. The code takes the layer from the `RAW` key, not the prefix.

### Extras

| Field | Values | Effect |
|---|---|---|
| `model` | a `MODELS` key, or omitted | Shows a badge. Entities **with** a model are hidden when that model is switched off in the sidebar; entities **without** one are never affected by the access filter. Used on providers and tools. Community entries call `m(null, url)` to carry a URL with no model. |
| `url` | absolute `https://` URL, or omitted | Adds an **Open website ↗** button to the detail panel. Only include URLs you are confident are the official site. |
| `stage` | a `STAGES[].id` (`plan`, `collect`, `process`, `analyze`, `disseminate`) or `opsec` | Places the entity in the Workflow view and shows a "Workflow:" badge in the detail panel. **The Workflow view only renders `technique`, `tool` and `governance` entities**; a stage on any other layer appears only as the badge. Any other value is rendered as the cross-cutting row's name in the badge and is missing from the Workflow view. |
| `notes` | array of strings, or omitted | **Practitioner notes**: tradecraft depth beyond the one-line description (workflow, pitfalls, signals, legal exposure). Rendered as a bulleted list in the detail panel, flagged on catalog cards ("N practitioner notes"), and included in search. Keep each note to one or two sentences and finish with legal exposure where it applies. Currently used by the Collection engineering techniques; see [collection-engineering.md](collection-engineering.md). |

## Relations

- **Symmetric.** Declare a connection once, on either side. `app.js` deduplicates, so declaring both sides is harmless.
- **Self-links are ignored.**
- **Unresolved IDs are not fatal.** They are skipped, logged with `console.warn("Unresolved relations:", …)`, and listed in `window.__fieldguide.missing`.
- Relations drive everything derived: map edges, node size (√degree), which map labels are always visible (the 4 best-connected entities per layer), the detail panel's connection groups, card connection counts, the Source × technique matrix, and the matrix's provider bars.

### Direction conventions

These keep the file greppable: to find what a provider covers, read its row.

| Declared on | Points to |
|---|---|
| provider | the sources it covers |
| technique | the sources it exploits and the providers that best embody it |
| tool | the techniques it implements (and occasionally a source or provider it is tied to) |
| discipline | its sources and characteristic techniques; `d_osint` also lists its sub-disciplines |
| usecase | the disciplines, techniques and frameworks it depends on |
| governance | the techniques, sources or entities it constrains |
| community | the techniques, use cases or frameworks it is known for |
| trend | the sources, techniques, providers or rules it affects |
| source | nothing; sources are pure targets |

### What the matrix derives

- **Rows:** every `source`, filtered by the search box.
- **Columns:** every `technique` with at least one `source` relation, so `k_req`, `k_opsec`, `k_sat` and `k_report` are excluded.
- **Cell:** filled when the source and technique are related.
- **Providers bar:** the number of `provider` neighbours of the source.

## Recipes

### Add an entity

1. Pick the layer and an unused ID with the right prefix.
2. Append a row to `RAW[layer]`, ideally next to entities of the same category.
3. Add relations on the new row (following the direction conventions), or append the new ID to existing rows.
4. Providers and tools: add `m(model, url)`. Techniques, tools and governance: add a stage. If the entity needs tradecraft depth, add `notes`.
5. Run the [verification checklist](maintenance.md#verification-after-editing).

### Rename or remove an entity

- **Rename the display name:** edit field 2 only. Keep the ID; old deep links keep working.
- **Remove:** delete the row, then search `src/data.js` for the ID and remove it from other rows' relation strings. Leftovers show up in `window.__fieldguide.missing`.

### Add a category

Use a new `category` string. It becomes a Catalog sub-heading at the position where it first appears in the layer.

### Add a layer

1. Add `{id, name, color, blurb}` to `LAYERS` where it should appear.
2. Add `RAW[id] = [...]`.
3. Optionally document its prefix in the table above.

The map places every non-source layer on an ellipse around the sources and sizes its arc automatically, so no layout changes are needed. Sidebar, legend, catalog and detail panel pick it up from `LAYERS`. To include it in the Workflow view, extend the `groups` list in `stageBlock()` in `src/app.js`.

### Add an access model or stage

- **Access model:** add a key to `MODELS` (and optionally a shorthand). Add a `.badge.<key>` colour rule in `src/styles.css`, otherwise the badge renders in the neutral style.
- **Stage:** add to `STAGES`. The Workflow grid is `repeat(5, …)` in `src/styles.css`, and the arrow selector `.stage:nth-child(-n+4)::after` assumes five stages; update both.
