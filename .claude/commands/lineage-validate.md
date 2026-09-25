---
description: Validate a data-lineage YAML catalog and its Markdown system explanation.
argument-hint: "<data-lineage.yaml> <system-analysis.md>"
disable-model-invocation: true
---

# /lineage-validate — Check an artifact pair

Read `AGENTS.md`, `.claude/rules/lineage-output.md`, and `docs/output-contract.md` first.

Require two arguments: the YAML path and Markdown path. Resolve them explicitly and perform
read-only checks; do not modify either file unless the user separately asks for fixes.

1. Run `node scripts/validate-output.mjs <yaml> <markdown>` from the Source2Lineage root.
2. If the validator passes, manually check that:
   - system, object, and connection counts in the report match the YAML;
   - each YAML system appears in the System inventory;
   - every flow direction described in prose agrees with `outputs` and object targets;
   - every evidence reference is repository-relative and plausibly locates a source fact;
   - probable/unknown findings did not leak into YAML as confirmed facts;
   - the reproduction section records the validation command.
3. Return `VALID` only when the automated and manual checks pass. Otherwise return `INVALID`
   followed by concrete, path-specific findings grouped as schema, consistency, evidence, or
   documentation problems.

Do not soften an automated failure into a warning. Do not claim that static analysis proves
runtime completeness.

