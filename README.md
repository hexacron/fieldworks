# fieldworks

Two interactive, offline reference maps of the open-source intelligence (OSINT) and data-acquisition landscape.

| Project | Question it answers | Size |
|---|---|---|
| [**fieldguide**](fieldguide/) | *Who* provides open data, which techniques and tools investigators use, and the law, ethics and trends around it | 302 entities, 681 connections, 4 views |
| [**quarry**](quarry/) | *How* data providers acquire data and build their products: methods, recipes, pipeline, economics, law | 70 methods, 26 provider archetypes, 6 views |

quarry links into fieldguide wherever a method or archetype corresponds to a fieldguide entry.

Both are static pages: no build step, no dependencies and no network calls at runtime.

## Run locally

```sh
open fieldguide/index.html
open quarry/index.html
# or serve the repository root (required by some browsers' file:// policies):
python3 -m http.server 8000   # http://localhost:8000/fieldguide/ and /quarry/
```

## Share as single files

```sh
python3 tools/bundle.py
```

This builds `dist/fieldguide.html` and `dist/quarry.html`: self-contained files with all CSS and scripts inlined, which open from any folder or email attachment. quarry's fieldguide links are rewritten to point at `fieldguide.html` in the same folder, so share the two files together. `dist/` is build output and is not version-controlled; rebuild after any edit.

## Layout

| Path | Contents |
|---|---|
| `fieldguide/` | OSINT ecosystem map: `index.html`, `src/` (data, app, styles), `docs/`, `CHANGELOG.md` |
| `quarry/` | Data-acquisition map: `index.html`, `src/data/` (one file per method family plus the supply chain and rules), `src/app.js`, `docs/`, `CHANGELOG.md` |
| `tools/bundle.py` | Single-file build for both projects (Python 3 standard library) |
| `dist/` | Build output (git-ignored) |

The two directories must stay siblings: quarry's source links to `../fieldguide/index.html`.

## Editing

Content lives in each project's data files. Each project's `docs/data-model.md` describes the schema, and `docs/maintenance.md` has the verification checklist, curation rules and the list of time-sensitive claims to re-check.

## Status

Content compiled in October 2026 from general domain knowledge. It is not legal advice, and inclusion is not endorsement. Each project's README lists its scope boundaries and caveats.

## License

Dual-licensed by type of material:

| Material | License |
|---|---|
| **Code**: `*/index.html`, `*/src/app.js`, `*/src/styles.css`, `quarry/src/data/core.js` (registry helpers), `tools/` | [MIT](LICENSE) |
| **Content**: catalogue data (`fieldguide/src/data.js`, every other file in `quarry/src/data/`) and all documentation (`README.md` files, `docs/`, changelogs) | [CC BY 4.0](LICENSE-CONTENT) |

Built single files in `dist/` contain both: the code parts under MIT and the content under CC BY 4.0.

To reuse the content, attribute it as: “fieldworks (fieldguide / quarry) by hexacron, licensed under CC BY 4.0”, with a link to this repository, and note any changes you made.
