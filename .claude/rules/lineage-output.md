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
- Conform to the canonical S2L specification at `https://github.com/datainsightat/s2l` and
  S2L format version 6. Use `schemas/data-lineage.schema.json` as the local implementation
  schema for validation.
- Emit exactly four root members: `version`, `systems`, `objects`, and `layouts`. Do not add
  evidence, metadata, extensions, or any other property to fixed S2L objects.
- Require at least one evidence-confirmed system and one evidence-confirmed data object. Never
  synthesize a placeholder or inventory object just to make the document schema-valid.
- Sort systems by name, each system's outputs by name, objects by ID, and targets by system
  then column so repeated analysis is stable.
- Use only `application`, `api`, or `datastructure` system types.
- Use only `low`, `medium`, `high`, or `critical` criticality values.
- Make every object ID match `^[A-Za-z0-9_.:-]+$`; keep `field` non-empty; and represent an
  unknown datatype, source table, or source column as an empty string rather than omitting it.
- Every output, source system, and target system must name an existing system.
- Do not emit self-links, duplicate output names, duplicate `(target system, column)` pairs,
  placeholder URLs, or non-HTTP(S) nonblank URLs.
- Emit all four layout members. New catalogs use empty `systems` and `catalog` position maps
  and `{ "x": 0, "y": 0, "scale": 1 }` for both viewports.
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
