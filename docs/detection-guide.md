# Detection Guide

This guide defines what Source2Lineage looks for and what constitutes usable evidence. It is a
static, conservative analysis modeled on the browser Source Lineage Analyzer.

## Project boundaries

The nearest supported manifest owns a source file. Common manifests are:

| Ecosystem | Manifests |
| --- | --- |
| JavaScript/TypeScript | `package.json` |
| Python | `pyproject.toml` |
| Java/Kotlin | `pom.xml`, `build.gradle`, `build.gradle.kts` |
| .NET | `*.csproj`, `*.fsproj` |
| Go | `go.mod` |
| Rust | `Cargo.toml` |
| PHP | `composer.json` |
| Ruby | `Gemfile` |
| Elixir | `mix.exs` |
| Perl | `cpanfile`, `Makefile.PL`, `Build.PL`, `dist.ini` |

Workspace declarations and explicit project references are stronger boundary evidence than
folder layout. A root-only repository without a manifest becomes one fallback application.

## Local dependencies

Confirmed cross-project edges include:

- imports/requires resolving to a local package or module;
- relative imports crossing a confirmed project boundary;
- project references in manifests or build files;
- framework registrations that inject one local module into another.

Imports inside one project do not create separate systems. Similar package names alone do not
prove a dependency.

## HTTP and RPC

Server evidence includes literal route declarations and registered controllers/handlers in
JavaScript/TypeScript, Python, Java, .NET, Go, and Perl (including Dancer-style and
Mojolicious-style literal routes), plus GraphQL resolvers/schemas and protobuf service
implementations. Client evidence includes literal `fetch`, Axios, Requests, HttpClient,
RestTemplate/WebClient, Go HTTP, Perl user-agent calls, and generated-client calls whose target
contract is visible.

An exposed boundary becomes an `api` system. A caller-to-API edge needs a literal compatible
path/method, a generated client bound to the contract, or explicit configuration linking the
client to that API. Dynamically assembled base URLs remain uncertain unless configuration
resolves them locally.

Endpoint data objects require visible payload, parameter, response, GraphQL, or protobuf field
definitions. An endpoint path by itself may be represented by a conservative endpoint object,
but it does not justify invented payload fields.

## SQL and databases

Analyze standalone `.sql`, `.ddl`, `.dml`, and `.psql` files as well as literal SQL embedded
in supported application source, including Perl modules and scripts.

Direct evidence includes:

- `CREATE TABLE` declarations and migrations;
- literal `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and merge/upsert statements;
- ORM entity/table/column mappings;
- repository methods with explicit query or mapping definitions;
- database configuration that identifies the technology or logical store without exposing a
  credential.

Direction rules:

```text
application writes table  → application → data structure
application reads table   → data structure → application
```

Columns become data objects when their declarations or mappings are visible. `SELECT *`
proves table access, not individual fields, unless the schema is also present.

## Messages and events

A topic or queue becomes a data structure when its name and role are explicit. Producer calls
point application → topic/queue; consumer registrations point topic/queue → application.
Message fields require an explicit event class, schema, serializer mapping, or contract.

Dynamic topic construction and wildcard consumers are documented as uncertainty unless their
resolved scope is visible.

## Files and object stores

Explicit writes point application → store; explicit reads point store → application. Treat a
logical bucket, container, file collection, or well-defined exchange format as a data
structure. Do not create one system per incidental local file.

Record fields require a schema, serialization model, column/header mapping, or parser contract.

## Contracts

GraphQL schemas, protobuf definitions, OpenAPI files, JSON Schema, and typed DTOs can prove
field names and datatypes. They prove direction only when ownership and producer/consumer
wiring are also visible.

## Criticality suggestions

| Level | Static signals |
| --- | --- |
| `critical` | passwords, secrets, access tokens, government identifiers, payment secrets |
| `high` | names tied to persons, email, phone, postal address, birth data, account/customer identifiers |
| `medium` | technical IDs, business keys, status, amount, price, currency, operational codes |
| `low` | descriptive or non-sensitive operational fields without a stronger signal |

These are review suggestions, not legal or regulatory classifications.

## Exclusions

Always exclude dependency/vendor directories, `.git`, build output, generated output, caches,
virtual environments, coverage, `.env*`, key/certificate files, paths containing `secret`,
binary files, and files over 1 MiB by default. Test and fixture code is excluded unless the
user explicitly includes it or it is the only evidence for a contract under review.

## Evidence threshold

A final YAML finding needs direct syntax/configuration evidence. Two indirect signals may be
reported as probable in Markdown, but never promoted merely to make the graph look complete.
Contradictions, reflection, generated runtime wiring, and unresolved dependency injection are
limitations to explain, not gaps to fill with guesses.
