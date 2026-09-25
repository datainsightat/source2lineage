---
paths:
  - "**/data-lineage.yaml"
  - "**/system-analysis.md"
---

# Final lineage output rules

The YAML and Markdown files are two views of one normalized model. System names, data-object
IDs, directions, source/target mappings, counts, and terminology must agree.

## YAML

- Write JSON syntax with a `.yaml` extension.
- Conform to `schemas/data-lineage.schema.json`.
- Sort systems by name, each system's outputs by name, objects by ID, and targets by system
  then column so repeated analysis is stable.
- Use only `application`, `api`, or `datastructure` system types.
- Use only `low`, `medium`, `high`, or `critical` criticality values.
- Every output, source system, and target system must name an existing system.
- Do not emit self-links, duplicate links, placeholder URLs, or evidence metadata outside the
  schema.
- Keep evidence in Markdown; keep YAML compatible with the browser catalog.

## Markdown

- Follow `templates/system-analysis.md` and write in `OutputLanguage` from `AGENTS.md`.
- State what was inspected and excluded.
- Explain flows from origin to destination, not as an unordered component list.
- Distinguish confirmed findings from probable findings and unknowns.
- Include an evidence index that lets a reviewer trace each system, connection, and object to
  code or configuration.
- Mention static-analysis limitations prominently and avoid claims of completeness.
- Include the exact validator command used and its result.

Run the validator after the final write. A pair that fails validation is not complete.

