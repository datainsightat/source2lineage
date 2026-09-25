# S2L — Source2Lineage Catalog Specification

Format version: `6`  
Recommended file name: `data-lineage.yaml`  
Serialization: JSON syntax compatible with YAML 1.2

S2L is a portable format for describing systems, directed data movement, and field-level
lineage. A single catalog records the participating systems, their connections, the earliest
confirmed source of each data object, its downstream representations, and optional visual
layout state.

This directory is the format specification for the catalog produced by Source2Lineage. It is
organized like a small standalone specification repository:

```text
s2l/
├── README.md
├── examples/
│   └── minimal.data-lineage.yaml
└── schema/
    └── data-lineage.schema.json
```

The words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in RFC 2119 and RFC 8174 when they appear in uppercase.

## Design goals

| Goal | Meaning |
| --- | --- |
| Portable | One file contains the complete machine-readable lineage catalog. |
| Deterministic | Equivalent findings serialize in a stable order for useful reviews and diffs. |
| Evidence-friendly | The model contains only confirmed systems, flows, and field mappings. |
| Tool-neutral | Names preserve source terminology rather than vendor-specific IDs. |
| Visualizable | Optional layout state lets compatible tools restore positions and viewports. |

## Minimal example

```json
{
  "version": 6,
  "systems": [
    {
      "name": "Orders App",
      "description": "Creates orders from confirmed requests.",
      "url": "https://orders.example.com",
      "type": "application",
      "outputs": ["Orders DB"]
    },
    {
      "name": "Orders DB",
      "description": "Stores order records.",
      "url": "",
      "type": "datastructure",
      "outputs": []
    }
  ],
  "objects": [
    {
      "id": "orders.order_id",
      "field": "order_id",
      "datatype": "uuid",
      "criticality": "medium",
      "source": {
        "system": "Orders App",
        "table": "OrderRequest",
        "column": "order_id"
      },
      "targets": [
        { "system": "Orders DB", "column": "orders.id" }
      ]
    }
  ],
  "layouts": {
    "systems": {},
    "catalog": {},
    "systemView": { "x": 0, "y": 0, "scale": 1 },
    "catalogView": { "x": 0, "y": 0, "scale": 1 }
  }
}
```

Although the conventional extension is `.yaml`, Source2Lineage writes JSON syntax. JSON is a
subset of YAML 1.2, avoids parser-dependent YAML features, and can be consumed directly by
the browser application and standard JSON tooling.

## Document structure

```text
data-lineage.yaml
├── version             format version; exactly 6
├── systems[]           applications, APIs, and data structures
│   ├── name            unique system identity
│   ├── description     human-readable role and evidence summary
│   ├── url             HTTP(S) address or an empty string
│   ├── type            application | api | datastructure
│   └── outputs[]       names of directly downstream systems
├── objects[]           logical fields traced through the systems
│   ├── id              stable unique identifier
│   ├── field           human-readable field name
│   ├── datatype        source datatype, or an empty string if unknown
│   ├── criticality     low | medium | high | critical
│   ├── source          earliest confirmed origin in scope
│   │   ├── system
│   │   ├── table
│   │   └── column
│   └── targets[]       confirmed downstream representations
│       ├── system
│       └── column
└── layouts             optional persisted presentation state
    ├── systems{}       positions keyed by system name
    ├── catalog{}       positions keyed by graph item identifier
    ├── systemView      system-graph viewport
    └── catalogView     lineage-graph viewport
```

All four root members are REQUIRED. Unknown members are forbidden at every fixed object level.
The catalog MUST contain at least one system and one data object.

## Systems

A system is a lineage boundary, not necessarily a separately deployed process.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | Non-empty and unique within `systems`. References use this exact, case-sensitive value. |
| `description` | string | yes | May be empty. SHOULD explain the system's role without unsupported claims. |
| `url` | string | yes | Empty when no explicit address is known; otherwise a valid `http://` or `https://` URI. |
| `type` | string | yes | One of `application`, `api`, or `datastructure`. |
| `outputs` | string[] | yes | Unique names of directly downstream systems. Self-links are forbidden. |

System types have these meanings:

- `application` — a manifest-owned deployable, service, or module;
- `api` — an exposed or external HTTP, GraphQL, or gRPC boundary;
- `datastructure` — a database, table grouping, stream, queue, file store, or equivalent
  persisted structure.

An output points from the producer, caller, or writer to the consumer, callee, or store. Every
entry in `outputs` MUST resolve to another system in the same document. Systems and each
`outputs` list MUST be sorted by name using locale comparison.

## Data objects

A data object traces one logical field from its earliest confirmed origin in the analyzed
scope to zero or more confirmed downstream representations.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `id` | string | yes | Unique, stable, non-empty, and matching `^[A-Za-z0-9_.:-]+$`. |
| `field` | string | yes | Non-empty human-readable field name. |
| `datatype` | string | yes | Source datatype; use `""` when it cannot be confirmed. |
| `criticality` | string | yes | One of `low`, `medium`, `high`, or `critical`. |
| `source` | object | yes | The earliest confirmed origin in the analyzed scope. |
| `targets` | object[] | yes | Confirmed downstream representations; may be empty. |

`source` contains exactly `system`, `table`, and `column`. Its `system` MUST reference a system
in this document. `table` and `column` are strings and MAY be empty when the source construct
does not expose those concepts.

Each target contains exactly `system` and `column`. Its `system` MUST reference a system in
this document. A target pair of `(system, column)` MUST be unique within the object. Objects
MUST be sorted by `id`; targets MUST be sorted by `system` and then `column`.

Criticality values are review hints rather than legal classifications:

| Value | Typical static evidence |
| --- | --- |
| `low` | Descriptive or non-sensitive operational fields. |
| `medium` | Technical IDs, business keys, statuses, amounts, prices, currencies, or operational codes. |
| `high` | Personal identity/contact data or account and customer identifiers. |
| `critical` | Passwords, secrets, access tokens, government identifiers, or payment secrets. |

## Layouts

Layouts preserve editor state and do not alter lineage semantics.

`layouts.systems` and `layouts.catalog` are maps whose values contain exactly numeric `x` and
`y` coordinates. Their keys SHOULD identify corresponding catalog items. Consumers MUST NOT
infer lineage from layout keys or coordinates.

`layouts.systemView` and `layouts.catalogView` each contain exactly numeric `x`, numeric `y`,
and a numeric `scale` greater than zero. Empty position maps and `{ "x": 0, "y": 0,
"scale": 1 }` viewports are the canonical defaults.

## Conformance

A conforming S2L v6 document MUST:

1. satisfy [`schema/data-lineage.schema.json`](schema/data-lineage.schema.json);
2. satisfy the reference, uniqueness, and ordering rules in this specification;
3. use JSON syntax that is also valid YAML 1.2;
4. contain only evidence-confirmed systems, connections, sources, and targets when generated
   by static analysis.

The JSON Schema defines the structural contract. The Source2Lineage validator additionally
checks deterministic ordering, unique identities, valid references, output self-links, and
duplicate mappings.

Validate a generated catalog together with its analysis report from the repository root:

```bash
node scripts/validate-output.mjs path/to/data-lineage.yaml path/to/system-analysis.md
```

The report is a companion deliverable, not part of the S2L catalog format. It carries source
evidence, uncertainty, and reproduction notes that are intentionally absent from the compact
catalog.

## Versioning

The root `version` identifies the catalog format consumed by Source2Lineage tools. Version 6
is the only version defined by this specification. A future change that removes fields,
changes field meaning, or strengthens required structure requires a new format version.
Additive guidance that does not change accepted documents may revise this prose without
changing the format version.

