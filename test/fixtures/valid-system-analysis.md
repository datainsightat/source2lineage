# System Analysis

## Executive summary

Static analysis found 2 systems, 1 data object, and 1 connection from Orders App to Orders DB.

## Scope and method

The source was inspected without executing application code. Evidence: `src/orders.js:12`.

## System inventory

| System | Type | Evidence |
| --- | --- | --- |
| Orders App | application | `src/orders.js:12` |
| Orders DB | datastructure | `db/schema.sql:1` |

## Data-flow narrative

Orders App writes confirmed order records to Orders DB (`src/orders.js:20`).

## Data-object dictionary

`order_id` flows from Orders App to Orders DB (`db/schema.sql:2`).

## Evidence index

- Orders App — `src/orders.js:12`
- Orders DB — `db/schema.sql:1`
- Orders App → Orders DB — `src/orders.js:20`

## Uncertainties and limitations

Static analysis cannot prove dynamically configured runtime connections.

## Reproduction and review notes

Validated with `node scripts/validate-output.mjs data-lineage.yaml system-analysis.md`.

