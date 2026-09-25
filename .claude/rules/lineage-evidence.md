---
paths:
  - .lineage-work/reports/**/*.md
---

# Lineage evidence rules

Scout reports are intermediate evidence records, not narrative documentation.

Each report must contain these sections in order:

1. `# Unit: <name>`
2. `scope:` and `files reviewed:` header lines
3. `## Candidate systems`
4. `## Confirmed connections`
5. `## Confirmed data objects`
6. `## Probable findings`
7. `## Unknowns and blind spots`
8. `## Evidence index`

For every candidate system record its proposed name, type, project root, description that can
be supported from source, explicit URL if present, and evidence. For every connection record
the source, target, mechanism, direction evidence, and evidence path. For every data object
record the field, datatype, criticality suggestion, source mapping, target mappings, and
evidence.

For database or file evidence, also record the technology, logical database/store, physical
container (SQL table/view, MongoDB collection, JSON contract/file, or CSV dataset), operation
(`read` or `write`), and the literal API/query/configuration that proves direction. For nested
MongoDB or JSON fields, preserve dotted property paths. For CSV, cite header or mapping
configuration only; do not include data rows.

Evidence references are repository-relative `path:line` locations. Include a symbol or config
key when one finding spans several lines. Short snippets may be used only when needed to
disambiguate direction; never copy secrets or large source passages.

Do not promote these to confirmed evidence on their own:

- filenames, folder names, or identifier names;
- README claims without code/config corroboration;
- comments describing intended behavior;
- dynamically assembled URLs or SQL whose resolved value is not visible;
- dynamically assembled MongoDB collection names or file paths whose resolved value is not
  visible;
- a `.json` or `.csv` filename without code/configuration proving how it participates in a
  flow;
- framework conventions without their registration or configuration site.

Scout reports may overlap at boundaries. Record the touchpoint and stop; the orchestrator
deduplicates and resolves disagreement during synthesis.
