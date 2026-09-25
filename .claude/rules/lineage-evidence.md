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

Evidence references are repository-relative `path:line` locations. Include a symbol or config
key when one finding spans several lines. Short snippets may be used only when needed to
disambiguate direction; never copy secrets or large source passages.

Do not promote these to confirmed evidence on their own:

- filenames, folder names, or identifier names;
- README claims without code/config corroboration;
- comments describing intended behavior;
- dynamically assembled URLs or SQL whose resolved value is not visible;
- framework conventions without their registration or configuration site.

Scout reports may overlap at boundaries. Record the touchpoint and stop; the orchestrator
deduplicates and resolves disagreement during synthesis.

