# Maintenance

## Verification after editing

Run `node tools/validate.mjs` from the repository root. It loads the data files in the same order as the page and checks every reference, id prefix, rating, evidence tag, required field and fieldguide link. It also warns about methods no recipe uses (only `ug_purchase` is intentionally unused) and fails on maintainer notes left in reader-facing text. CI runs the same check on every push and pull request. Then check the page itself:

1. Reload `index.html` with the devtools console open.
2. **No console warnings.**
   - `Unresolved references:` lists every id that doesn't exist or has the wrong kind (e.g. a rule id in `origins`), plus unknown families and invalid ratings.
   - `Duplicate id` means two entries share an id; the later one wins.
3. Run `window.__quarry` in the console. `missing` must be `[]`; `counts` and `perFamily` should change by exactly what you added.
4. **Orphans.** `METHODS.filter(m => !m.uses.length).map(m => m.id)` lists methods no archetype uses. Only `ug_purchase` is intentionally unused (no archetype should be built on it).
5. **fieldguide links.** Every id in a `fieldguide` array must exist in `../fieldguide/src/data.js`. Click one from the detail panel to confirm it opens the right entry.
6. Check each view:
   - **Supply chain:** the new entity appears in both Methods and Families modes, and hovering it traces the expected chain.
   - **Recipes:** the cells and weights are correct.
   - **Playbooks:** the card shows the right badge and pips.
   - **Pipeline, Economics and Law:** the entity sits where expected.
7. Open `index.html#view=playbooks&item=<new id>`. It should load with the detail panel open.

Update the counts in `README.md` and add a `CHANGELOG.md` entry when content changes.

## Curation rules

- **Operating instructions are the point.** Steps should be specific enough that an engineer could start building: tools, commands, parameters, sequencing, scale and coverage metrics. Generic advice is a defect.
- **Boundaries (keep them when editing):**
  - Underground: no procurement from criminal sellers, no instructions for obtaining logs from criminal channels, no techniques for passing vetting in criminal communities.
  - Consumer and device data: write the disclosed, consented, contracted version only; covert variants appear only as enforcement findings.
  - No instructions for unauthorized access or exploitation.
  - Pirated content appears only as practice plus legal outcome.
- **Vendor evidence is mandatory.** Use `public` only when the vendor documents the practice, `reported` for press, court or regulator sources, and `inferred` sparingly (say so in the note). Don't attribute a sourcing method to a named vendor without one of these.
- **Numbers.** Costs are orders of magnitude marked `~` and `(estimate)`. Never invent statistics, prices or case outcomes.
- **Maintainer notes stay out of content.** Phrases like "verify" or "time-sensitive" belong in the claims register (below), not in user-facing text; the validator rejects them.
- **Neutral tone.** Legal exposure goes in `legal`, `risks` and the rules, not sprinkled through steps.

## Time-sensitive claims

Dated facts (acquisitions, enforcement actions, case outcomes, deal terms, programme names) are tracked in [`upkeep/claims.json`](../../upkeep/claims.json) at the repository root, with verification status, last-checked date and sources. The weekly upkeep issue lists every claim never verified or overdue. See [MAINTAINING.md](../../MAINTAINING.md).

When you add or change a dated fact in `src/data/`, add or update its claim in the same pull request. Cost figures marked `~ … (estimate)` are reviewed once a year rather than tracked individually.

## Known gaps

- **Western and US-heavy.** Records, law and vendors skew US/UK/EU; Chinese, Russian, Indian and Latin American data markets are thin.
- **Undisclosed sourcing.** Many vendors don't say how they acquire data. Recipes describe archetypes, and vendor-level attribution is limited to what the evidence supports.
- **Ratings are editorial** and coarse (1–3); treat the Economics view as orientation, not measurement.
- **Archetype coverage.** Some markets are folded into broader archetypes rather than modelled separately, e.g. weather and environmental data, financial alternative data beyond web/app intelligence, and healthcare data.
