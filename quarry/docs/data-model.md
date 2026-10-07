# Data model

All content lives in `src/data/`. Every file is a classic (non-module) script. `core.js` loads first and defines the registries and helper functions; every other data file only calls those helpers. `src/app.js` loads last and resolves references between registries.

## Files

| File | Registers |
|---|---|
| `core.js` | `FAMILIES`, `RATINGS`, `EVIDENCE`; empty registries `ORIGINS`, `METHODS`, `STAGES`, `PRODUCTS`, `ARCHETYPES`, `RULES`; helpers `O M S D A G` |
| `web-records.js` | methods in families `web`, `records` |
| `network.js` | methods in family `net` |
| `sensors-crowd.js` | methods in families `sensor`, `crowd` |
| `embedded-commercial.js` | methods in families `embedded`, `commercial` |
| `human-rules.js` | methods in family `human`; all rules (`G`) |
| `underground.js` | methods in family `underground` |
| `ai.js` | methods in family `ai` |
| `chain.js` | origins (`O`), pipeline stages (`S`), products (`D`), provider archetypes (`A`) |

Load order is set by the `<script>` tags in `index.html`. `core.js` must be first and `app.js` last; the order of the files in between doesn't matter, because references are resolved in `app.js` after everything has loaded. A new data file needs a `<script>` tag.

## Entities

Every entity has a globally unique `id`. Prefixes keep the kinds apart:

| Kind | Helper | Prefix | Example |
|---|---|---|---|
| Family | (in `FAMILIES`) | none | `net` |
| Origin | `O` | `o_` | `o_infra` |
| Method | `M` | family prefix: `web_ net_ sen_ crowd_ emb_ rec_ com_ hum_ ug_ ai_` | `net_scan` |
| Pipeline stage | `S` | `p_` | `p_er` |
| Product | `D` | `d_` | `d_api` |
| Archetype | `A` | `a_` | `a_scanner` |
| Rule | `G` | `g_` | `g_cfaa` |

### Method `M({...})`

| Field | Type | Notes |
|---|---|---|
| `id`, `family`, `name` | string | `family` must be a `FAMILIES` id. |
| `summary` | string | 1–2 sentences. |
| `origins` | origin ids | Where the data physically arises. Drives the Supply chain view's first column. |
| `ratings` | `{cost, scale, freshness, moat, legal}` each 1–3 | Editorial. Scales are defined in `RATINGS`. A missing or out-of-range value is reported and defaults to 2. |
| `steps` | strings | **Operating instructions**, in order. Rendered as a numbered list. |
| `tools` | strings | Rendered as tags. |
| `economics`, `pitfalls`, `defenses`, `legal` | strings | Bulleted lists. |
| `rules` | rule ids | Unioned with every rule whose `applies` lists this method. |
| `vendors` | `{name, note, evidence}` | `evidence` ∈ `public`, `reported`, `inferred` (see `EVIDENCE`). |
| `fieldguide` | fieldguide ids | Optional. Rendered as links to `../fieldguide/index.html#view=catalog&node=<id>`. |

### Archetype `A({...})`

| Field | Type | Notes |
|---|---|---|
| `id`, `name`, `summary` | string | |
| `recipe` | `[methodId, weight, note][]` | Weight 3 = core, 2 = major, 1 = supporting (clamped to 1–3). Drives the Recipes matrix, the Supply chain links and each method's "Used to build" list. |
| `stages` | stage ids | Pipeline stages that matter most for this archetype. |
| `products` | product ids | How the archetype is delivered. Drives the last Supply chain column. |
| `vendors` | `{name, note, evidence}` | |
| `build` | strings | Ordered playbook for building the provider from zero. |
| `economics`, `risks` | strings | |
| `fieldguide` | fieldguide ids | Optional. |

### Origin `O`, Stage `S`, Product `D`, Rule `G`

- `O({id, name, summary})`
- `S({id, name, order, summary, steps[], tools[], failures[], economics[]})`. `order` sorts the Pipeline view.
- `D({id, name, summary, pricing[], examples[]})`
- `G({id, name, jurisdiction, summary, points[], applies[]})`. `applies` lists the method ids the rule constrains.

### Text markup

All list items and summaries support two pieces of markup:

- `` `code` ``: text between backticks renders as inline code.
- Sub-bullets: a newline followed by `- item` lines renders those lines as a nested list under the first line, e.g. `"Verify authenticity:\n- check A\n- check B"`.

Everything else is escaped. Strings are double-quoted JS literals, so don't put a raw `"` inside one.

## Derived relationships (computed in `app.js`)

| Derived | From |
|---|---|
| `method.uses` | Every archetype recipe entry naming the method. |
| `method.rulesR` | `method.rules` ∪ rules whose `applies` names the method. |
| `rule.appliesR` | `rule.applies` ∪ methods naming the rule in `rules`. |
| `origin.methods` | Methods listing the origin. |
| `stage.archetypes`, `product.archetypes` | Archetypes listing the stage or product. |
| `family.methods` | Methods in the family, in file order. |

Unresolved ids (wrong kind or nonexistent), unknown families and invalid ratings are collected in `window.__quarry.missing` and logged as `Unresolved references:`. Duplicate ids log `Duplicate id`; the later entry wins.

## Recipes

### Add a method

1. Pick the family and an id with that family's prefix.
2. Add `M({...})` to the family's file, filling every field.
3. Add the method to the recipes of the archetypes that use it (`chain.js`), and to `applies` of the rules that constrain it (`human-rules.js`), or list those rules in the method's own `rules`.
4. Run the [verification checklist](maintenance.md#verification-after-editing).

### Add an archetype

Add `A({...})` to `chain.js` with a recipe of existing method ids. It appears automatically in the Supply chain, Recipes and method "Used to build" lists.

### Add a family

Add `{id, name, color, blurb}` to `FAMILIES` in `core.js` and create a data file for its methods (plus a `<script>` tag). The sidebar, Supply chain, Recipes, Playbooks and Economics views pick it up from `FAMILIES`.

### Add a rating dimension

Add a key to `RATINGS` and a value to every method. The Economics axes, the detail-panel meter and the card pips are generated from `RATINGS`. Card pips use the short labels in `pips()` in `app.js`; add one there too.
