# System Analysis

## Executive summary

<Summarize the analyzed scope, system count, data-object count, connection count, and most
important confirmed flow. State that the result is based on static analysis.>

## Scope and method

- **Source root:** `<repository-relative or explicit path>`
- **Analyzed:** `<languages, projects, and evidence classes>`
- **Excluded:** `<ignored paths and reasons>`
- **Method:** Static source and configuration analysis; no application code executed.

## System inventory

| System | Type | Responsibility | Web address | Evidence |
| --- | --- | --- | --- | --- |
| `<name>` | `<application/api/datastructure>` | `<confirmed responsibility>` | `<URL or —>` | `<path:line>` |

## Data-flow narrative

### <Flow name>

`<producer>` → `<consumer>`

<Explain the confirmed mechanism and the data that moves. Cite evidence paths.>

## Data-object dictionary

| Object | Datatype | Criticality | Source | Targets | Evidence |
| --- | --- | --- | --- | --- | --- |
| `<field>` | `<type>` | `<level>` | `<system.table.column>` | `<system.column>` | `<path:line>` |

Criticality values are static suggestions for review, not compliance classifications.

## Evidence index

### Systems

- `<system>` — `<path:line>`: `<what the source proves>`

### Connections

- `<source>` → `<target>` — `<path:line>`: `<what proves direction and mechanism>`

### Data objects

- `<object or grouped objects>` — `<path:line>`: `<what proves source and targets>`

## Uncertainties and limitations

- `<probable finding or blind spot, with evidence path and what would confirm it>`

Static analysis cannot prove runtime-only connections, dynamically constructed URLs or SQL,
reflection, generated clients, or dependency injection assembled outside the inspected source.

## Reproduction and review notes

- **Generated with:** Source2Lineage `<version>`
- **Validator:** `node <Source2Lineage-root>/scripts/validate-output.mjs <yaml> <markdown>`
- **Validator result:** `<PASS and concise output>`
- **Review priorities:** `<specific items a maintainer should confirm>`

