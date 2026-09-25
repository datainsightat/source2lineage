# Output Contract

Every successful `/lineage-analyze` run creates exactly one YAML catalog and one Markdown
report. They represent the same model at different levels of detail.

The canonical catalog contract is the
[`datainsightat/s2l` specification](https://github.com/datainsightat/s2l), format version 6.
This document adds Source2Lineage generation and report requirements; it does not redefine
the S2L format.

## `data-lineage.yaml`

The file uses pretty-printed JSON syntax, which is valid YAML 1.2 and can be opened directly in
`app/source_lineage_analyzer.html`.

```json
{
  "version": 6,
  "systems": [
    {
      "name": "Orders App",
      "description": "Creates orders from confirmed HTTP requests.",
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

The canonical machine schema is published by S2L. The local
`schemas/data-lineage.schema.json` is Source2Lineage's implementation copy for offline
validation. Additional consistency rules enforced by the validator include unique system
names and object IDs, valid references, no self-links, no duplicate outputs or target pairs,
and HTTP/HTTPS-only nonblank URLs.

S2L conformance also requires:

- exactly `version`, `systems`, `objects`, and `layouts` at the root;
- at least one system and one data object;
- only schema-defined fields in systems, objects, mappings, positions, and viewports;
- object IDs matching `^[A-Za-z0-9_.:-]+$`;
- every output, source, and target system reference resolving within the catalog;
- all four layout members, with a positive viewport scale.

Source2Lineage MUST NOT invent a placeholder data object when analysis finds no confirmed
field. Such a run cannot produce a conforming S2L catalog and must report the evidence gap
instead of writing misleading final artifacts.

Collections are deterministic:

- systems sort by name;
- outputs sort by system name;
- objects sort by ID;
- targets sort by system, then column.

## `system-analysis.md`

The report follows `templates/system-analysis.md`. It explains the catalog and carries the
evidence that the browser schema intentionally does not contain.

Required sections are:

1. Executive summary
2. Scope and method
3. System inventory
4. Data-flow narrative
5. Data-object dictionary
6. Evidence index
7. Uncertainties and limitations
8. Reproduction and review notes

System names and flow directions must match the YAML exactly. Every system and edge needs a
repository-relative `path:line` reference. Data-object evidence may be grouped by one schema or
contract declaration when the location genuinely proves all grouped fields.

## Validation

```bash
node scripts/validate-output.mjs path/to/data-lineage.yaml path/to/system-analysis.md
```

Exit codes:

- `0` — the pair is structurally valid and internally consistent;
- `1` — content or consistency errors;
- `2` — invocation or missing-file errors.

The validator does not prove that evidence references are truthful or that static analysis is
complete. `/lineage-validate` adds a manual consistency and evidence review after the automated
check.
