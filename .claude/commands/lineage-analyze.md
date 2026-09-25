---
description: Analyze source code and create data-lineage.yaml plus system-analysis.md.
argument-hint: "[source path] [output directory]"
disable-model-invocation: true
---

# /lineage-analyze — Source code to lineage catalog

Read `AGENTS.md`, `docs/detection-guide.md`, `docs/output-contract.md`, and both files under
`.claude/rules/` before acting. The rules below are procedural restatements needed during the
run; `AGENTS.md` and the rule files remain authoritative.

Interpret the first argument as the source path and the second as the output directory.
Defaults are `.` and `.lineage`. Resolve both to explicit paths. The two final files are:

- `<output>/data-lineage.yaml`
- `<output>/system-analysis.md`

## Phase 1 — Preflight

1. Confirm the source path exists and is a directory.
2. Locate the Source2Lineage root by finding the `AGENTS.md` that declares
   `Source2LineageVersion`; read its `S2LSpecification` and `S2LFormatVersion` settings, then
   use its local implementation schema, template, and validator by resolved path.
3. Refuse an output directory inside a dependency, build, VCS, cache, secret, or generated
   directory.
4. If either final file already exists, stop and ask once before replacing either file. One
   approval covers the pair.
5. Create `.lineage-work/reports/` under the analyzed repository for temporary state. Exclude
   `.lineage-work/` and the chosen output directory from analysis.
6. Record source root, output paths, start time, exclusions, and arguments in
   `.lineage-work/run.md`.

Never read `.env*`, `*secret*`, `*.pem`, `*.key`, credential stores, binary files, dependency
directories, VCS metadata, build output, coverage, caches, virtual environments, or files over
1 MiB unless the user explicitly narrows the task to a known-safe file. Do not print ignored
file contents.

## Phase 2 — Inventory before interpretation

Use `git ls-files` when the source is a Git worktree; otherwise use a file listing/search tool.
Do not run package managers, builds, tests, application entrypoints, database clients, or
network commands.

Inventory:

- Maven/Gradle Java and Kotlin projects; Perl `cpanfile`, `Makefile.PL`, `Build.PL`, and
  `dist.ini` projects; and other manifests with their containing directories;
- workspace/project references and local dependencies;
- Java/Kotlin and Perl application entrypoints and route registration;
- SQL files, migrations, views, stored procedures, ORM mappings, repositories, and connection
  configuration;
- MongoDB client configuration, databases, collections, validators, document models, and
  literal reads/writes;
- JSON/JSONL schemas, models, mappings, and explicit readers/writers;
- CSV/TSV headers, mappings, parser/writer configuration, and explicit readers/writers;
- REST/HTTP, GraphQL, gRPC, SOAP, and webhook clients, servers, handlers, and generated clients;
- OpenAPI/Swagger, AsyncAPI, GraphQL, protobuf, and WSDL contracts in JSON, YAML, XML, or their
  native schema formats;
- message producers/consumers plus topic or queue declarations;
- file and object-store reads/writes;
- API request/response/message models and explicit serialization mappings;
- documentation that may explain names or purpose, marked as documentation-only until
  corroborated.

Write `.lineage-work/inventory.md` with counts and paths, but no lineage conclusions.

Build analysis units from manifest-owned projects or coherent top-level modules. A small
repository with one manifest is one unit. Split a repository when it has multiple deployables,
more than roughly 100 relevant source files, or clearly separate services/modules. Write
`.lineage-work/worklist.md` with Unit, Path, Boundary, Status, and Report columns.

If more than 20 coherent units are required or no defensible boundaries can be found, pause
with one targeted question about scope. Otherwise proceed autonomously.

## Phase 3 — Evidence mapping

When isolated agents are available, dispatch the repository's `lineage-scout` agent for
pending units, at most three concurrently. Otherwise analyze units sequentially in the main
context. The degree of parallelism changes cost and speed, not report content.

Every scout delegation must state:

- source root and assigned unit path;
- sibling unit names and paths, so boundaries are explicit;
- the exact report path `.lineage-work/reports/<unit-slug>.md`;
- that `AGENTS.md`, `.claude/rules/lineage-evidence.md`, and
  `docs/detection-guide.md` are authoritative;
- that it may write only its report, must not execute code, and must return at most five lines;
- the required report sections from the evidence rule.
- which of Java, Kotlin, Perl, SQL, MongoDB, JSON, CSV, APIs, or analogous technologies occur
  in the assigned unit so the scout applies the corresponding detection-guide rules.

After each report, verify that it has all required sections and at least one concrete evidence
reference for every confirmed finding. Mark the worklist row done only after this check. If a
scout proposes child units, add them to the worklist and analyze them; do not accept a shallow
replacement report.

## Phase 4 — Synthesis

Read all completed reports. Build one normalized in-memory model before writing either final
file.

### Reconcile systems

- Merge candidates only when manifests, project references, or explicit registrations prove
  they are the same system.
- Disambiguate duplicate display names using the nearest project path.
- Choose `application`, `api`, or `datastructure` according to `AGENTS.md`.
- Derive descriptions from confirmed responsibility evidence. Avoid inferred business intent.
- Copy a URL only from explicit metadata or configuration and only for HTTP/HTTPS.

### Reconcile connections

- Orient each edge from caller/producer/writer to callee/consumer/store.
- A local import creates an application edge only when it crosses confirmed project
  boundaries.
- An exposed API gets its own API system when route/contract evidence exists.
- API calls point caller → API; API ownership/exposure points owning application → API.
  Request fields flow caller → API, response fields flow API → caller, and webhook payloads
  flow publisher/caller → receiving API. Do not reverse a connection merely because response
  data travels back over the same request.
- SQL writes point application → data structure; reads point data structure → application.
- MongoDB inserts, updates, replacements, deletes, and bulk writes point application →
  collection; finds, queries, and aggregations point collection → application.
- JSON/CSV writes point application → logical file store or exchange; reads point file store
  or exchange → application. A format or filename alone does not establish direction.
- Deduplicate edges, remove self-links, and ensure every endpoint names a retained system.
- Put dynamic or contradictory direction in the report's uncertainty section, not the graph.

### Reconcile data objects

- Create objects for confirmed SQL columns, MongoDB document fields, JSON properties, CSV
  columns, API path/query/header/body fields, request/response fields, GraphQL/protobuf/SOAP
  fields, contract fields, message fields, or explicit file-record fields.
- If no data object can be confirmed, do not create a placeholder or source-inventory object.
  Record the evidence gap in `.lineage-work/`, stop before final-file creation, and report that
  S2L v6 requires at least one evidence-confirmed object.
- Preserve source table/contract and source column/field names.
- In S2L `source.table`, preserve the physical or logical container name: SQL table/view,
  MongoDB collection, JSON record/file contract, or CSV dataset. Preserve target paths such as
  nested MongoDB/JSON properties and CSV column names in target `column`.
- For APIs, use a stable operation signature or contract message/type in `source.table` and
  preserve the exact parameter/property path in `source.column` and target `column`.
- Add targets only when a mapping, transfer, shared contract, or matching literal usage proves
  the flow. Matching names alone are insufficient.
- Assign criticality conservatively: `critical` for credentials, government identifiers, or
  payment secrets; `high` for direct personal/contact/account data; `medium` for identifiers,
  status, financial amounts, or business keys; otherwise `low`. State that this is a static
  suggestion, not a compliance classification.
- Produce deterministic IDs from normalized source-system + table/contract + field text.

Sort all collections according to `.claude/rules/lineage-output.md`. Preserve evidence in a
separate index for the Markdown report.

## Phase 5 — Write the two deliverables

Create the output directory if necessary.

Write `data-lineage.yaml` first in pretty-printed JSON syntax with:

- `version: 6`;
- normalized `systems` and `objects`;
- `layouts.systems` and `layouts.catalog` as empty objects;
- `layouts.systemView` and `layouts.catalogView` as `{ "x": 0, "y": 0, "scale": 1 }`.

Before writing, apply the S2L conformance checklist in `.claude/rules/lineage-output.md`.
Write only the four S2L root members and only the fields allowed by the S2L schema. If there
is no confirmed system or object, do not write either final artifact and do not claim a
successful analysis.

Then copy `templates/system-analysis.md` as the structural template and fill every section from
the same normalized model. Delete template guidance and placeholders. The Evidence index must
cover every YAML system and every edge, plus grouped evidence for all data objects. The report
must give counts matching the YAML and name every omission or uncertainty discovered by scouts.

Do not create extra final summaries, CSV files, diagrams, or logs.

## Phase 6 — Validate and hand off

Run:

```text
node <Source2Lineage-root>/scripts/validate-output.mjs <output>/data-lineage.yaml <output>/system-analysis.md
```

Fix every validator error. Then manually compare system/object/connection counts, verify that
every report system occurs in YAML, and sample at least three evidence references against the
source. Also verify the catalog against the S2L reference, uniqueness, ordering, URL, ID, and
closed-object rules in `.claude/rules/lineage-output.md`. Record the successful command in the
report's reproduction section.

After success, remove `.lineage-work/`. Report the two output paths, counts, important static
analysis limitations, and the validator result. If validation fails and cannot be corrected,
leave `.lineage-work/` intact and report the exact blocker; never claim completion.
