# fieldworks

Two interactive, offline reference maps of the open-source intelligence (OSINT) and data-acquisition landscape.

| Project | Question it answers | Size |
|---|---|---|
| [**fieldguide**](fieldguide/) | *Who* provides open data, which techniques and tools investigators use, and the law, ethics and trends around it | 302 entities, 681 connections, 4 views |
| [**quarry**](quarry/) | *How* data providers acquire data and build their products: methods, recipes, pipeline, economics, law | 70 methods, 26 provider archetypes, 6 views |

quarry links into fieldguide wherever a method or archetype corresponds to a fieldguide entry.

Both are static pages: no runtime dependencies and no network calls. **Live site:** `https://hexacron.github.io/fieldworks/` once the repository is public (see [MAINTAINING.md](MAINTAINING.md#going-public-one-time)).

## Run locally

```sh
open fieldguide/index.html
open quarry/index.html
# or serve the repository root (required by some browsers' file:// policies):
python3 -m http.server 8000   # http://localhost:8000/ (landing), /fieldguide/, /quarry/
```

## Build

```sh
python3 tools/build.py          # dist/fieldguide.html + dist/quarry.html
python3 tools/build.py --site   # also the full website in _site/ (what GitHub Pages serves)
```

The files in `dist/` are self-contained single HTML files (all CSS and scripts inlined) that open from any folder or email attachment. quarry's fieldguide links point at `fieldguide.html` in the same folder, so share the two files together. Every page shows a build stamp (version and date) in its header. Tagged releases attach both files to a GitHub Release automatically.

## A living document

The catalogues are maintained on a schedule rather than written once:

- **Validation on every change.** `node tools/validate.mjs` checks every reference, rating, evidence tag and cross-project link, and runs in CI on every push and pull request.
- **Claims register.** Dated facts (acquisitions, rulings, enforcement, deal terms) live in [`upkeep/claims.json`](upkeep/claims.json) with verification status, date and sources. Each is re-verified every 90 days.
- **Weekly upkeep issue.** Every Monday a workflow opens an issue listing:
  - claims due for verification;
  - broken links and archived tool repositories;
  - a news digest of regulator, court, security-press and OSINT-community items that mention catalogued vendors or tools.
- **Public corrections** through issue forms with an evidence standard.
- **Monthly releases** with a changelog.

The routine is in [MAINTAINING.md](MAINTAINING.md); how to report or contribute is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

| Path | Contents |
|---|---|
| `index.html`, `assets/` | Landing page and social-preview images |
| `fieldguide/` | OSINT ecosystem map: `index.html`, `src/` (data, app, styles), `docs/`, `CHANGELOG.md` |
| `quarry/` | Data-acquisition map: `index.html`, `src/data/` (one file per method family plus the supply chain and rules), `src/app.js`, `docs/`, `CHANGELOG.md` |
| `tools/validate.mjs` | Data validation (Node 18+, no dependencies) |
| `tools/build.py` | Single-file bundles and website build (Python 3.9+ standard library) |
| `tools/upkeep.py` | Weekly checks: claims due, link health, news watch |
| `upkeep/` | Claims register, news-watch feeds and keywords, acknowledged link findings |
| `.github/` | CI, Pages deploy, release and weekly-upkeep workflows; issue forms; PR template |
| `dist/`, `_site/` | Build output (git-ignored) |

The two project directories must stay siblings: quarry's source links to `../fieldguide/index.html`.

## Editing

Content lives in each project's data files. Each project's `docs/data-model.md` describes the schema, and `docs/maintenance.md` has the page checks and curation rules. See [CONTRIBUTING.md](CONTRIBUTING.md) for the evidence standard and scope boundaries.

## Status

Content compiled in October 2026 from general domain knowledge and now maintained as described above. Claims still marked `compiled` in the register have not yet been verified against a source. It is not legal advice, and inclusion is not endorsement. Each project's README lists its scope boundaries and caveats.

## License

Dual-licensed by type of material:

| Material | License |
|---|---|
| **Code**: `index.html`, `*/index.html`, `*/src/app.js`, `*/src/styles.css`, `quarry/src/data/core.js` (registry helpers), `tools/`, `.github/`, `upkeep/watch.json`, `upkeep/links.json` | [MIT](LICENSE) |
| **Content**: catalogue data (`fieldguide/src/data.js`, every other file in `quarry/src/data/`), `upkeep/claims.json`, `assets/` images and all documentation (`README.md` files, `docs/`, guides, changelogs) | [CC BY 4.0](LICENSE-CONTENT) |

Built single files in `dist/` contain both: the code parts under MIT and the content under CC BY 4.0.

To reuse the content, attribute it as: “fieldworks (fieldguide / quarry) by hexacron, licensed under CC BY 4.0”, with a link to this repository, and note any changes you made.
