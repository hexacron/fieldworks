# Contributing

fieldworks is a living reference. Corrections and suggestions are the most valuable contributions.

## Reporting

- **Something is wrong or outdated:** open a [correction](../../issues/new?template=correction.yml). Include a source.
- **Something is missing:** [suggest an entry](../../issues/new?template=new-entry.yml).
- **Affiliated with an organisation in the catalogue?** You're welcome to report; please disclose it in the form.

Every entry has a deep link (copy it from the address bar after clicking the entry); including it makes triage faster.

## Evidence standard

- Facts need a source: official documentation, court records, regulator releases or reputable press. Blog posts and vendor marketing count as evidence only for what the vendor says about itself.
- quarry tags each vendor attribution `public` (vendor documents it), `reported` (press, courts or regulators) or `inferred` (industry-typical, unconfirmed). A correction can move an attribution between levels; a credible contrary source removes an `inferred` attribution.
- Dated facts (acquisitions, rulings, enforcement, deal terms, programme names) are registered in [`upkeep/claims.json`](upkeep/claims.json) with their sources, so they're re-checked on a schedule.
- Requests to remove accurate, sourced information are declined.

## Scope boundaries

Both projects document how things work, including detailed operating instructions in quarry. These lines hold for every contribution:

- No instructions for gaining unauthorized access to systems, accounts or data, or for exploiting vulnerabilities.
- **Underground collection:** no procurement from criminal sellers, no obtaining data from criminal distribution channels, no techniques for passing vetting in criminal communities.
- **Consumer and device data:** describe the disclosed, consented, contracted version; covert practices appear only as what enforcement found.
- **Pirated content:** described only as documented practice and its legal outcome.
- **No personal data:** no example identities, handles or records.

## Changing content yourself

1. Read the relevant data model: [`fieldguide/docs/data-model.md`](fieldguide/docs/data-model.md) or [`quarry/docs/data-model.md`](quarry/docs/data-model.md), plus the curation rules in each project's `docs/maintenance.md`.
2. Edit the data files. Each entry is one array row (fieldguide) or one helper call (quarry).
3. Run the checks (Node 18+ and Python 3.9+, no dependencies):
   ```sh
   node tools/validate.mjs        # must print OK
   python3 tools/build.py --site  # bundles + site build
   ```
4. Open the affected page and look at your change.
5. Open a pull request; the template lists the remaining checks. CI runs the validator and build.

## Licensing of contributions

By contributing you agree that your contributions are licensed like the rest of the repository: code under [MIT](LICENSE), content (catalogue data and documentation) under [CC BY 4.0](LICENSE-CONTENT).
