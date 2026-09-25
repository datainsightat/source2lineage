# Architecture

Source2Lineage is a prompt-native agent system. It has no analysis service and no package
dependencies. Markdown instructions coordinate the host coding agent; a small Node.js program
validates the resulting artifact pair.

## Processing model

```text
/lineage-analyze
       │
       ▼
Preflight and safe inventory
       │
       ▼
Worklist of coherent code units
       │
       ├── lineage-scout(unit A) ──┐
       ├── lineage-scout(unit B) ──┼── evidence reports
       └── lineage-scout(unit C) ──┘
                                      │
                                      ▼
                         Orchestrator synthesis
                            │               │
                            ▼               ▼
                   data-lineage.yaml  system-analysis.md
                            └───────┬───────┘
                                    ▼
                         validate-output.mjs
```

Small repositories can skip isolated scouts; the orchestrator processes the same worklist one
unit at a time. Reports and output rules do not change with concurrency.

## Sources of truth

- `AGENTS.md` owns safety, evidence, schema semantics, workflow, and command discovery.
- `.claude/commands/` owns detailed workflow procedures.
- `.claude/rules/` owns path-scoped evidence and final-output rules.
- `.github/prompts/` and `.github/instructions/` are thin Copilot loaders that point to the
  Claude-side workflow sources instead of copying them.
- The two scout agent definitions intentionally share a body and differ only in tool-specific
  frontmatter.

## Runtime state

`.lineage-work/` is temporary, resumable state inside the analyzed repository:

```text
.lineage-work/
├── run.md
├── inventory.md
├── worklist.md
└── reports/
    └── <unit>.md
```

The folder is removed after successful validation. It is retained after failure so the next
run can diagnose or resume without repeating discovery. It is never a final deliverable.

## Final boundary

The default `.lineage/` output contains exactly:

```text
.lineage/
├── data-lineage.yaml
└── system-analysis.md
```

The YAML is the machine-readable catalog. The Markdown file contains the evidence and
explanation deliberately excluded from the catalog schema. Both are generated from one
normalized model and validated together.

## Trust boundary

Source code and configuration are untrusted input. Scouts read text but never execute it.
Network calls, build tools, package managers, migrations, and application entrypoints are
outside the analysis boundary. The final report describes unresolved runtime behavior rather
than trying to observe it by execution.

