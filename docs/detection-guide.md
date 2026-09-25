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

## Stack-specific source discovery

The primary stack is Java, Kotlin, Perl, SQL, MongoDB, JSON, and CSV. This is a priority list,
not a closed allowlist: apply the **Analogous technologies** rule below when the repository
uses another framework, document database, or structured file format.

### Java and Kotlin

Inspect `.java`, `.kt`, and `.kts` source under Maven and Gradle project boundaries. Direct
evidence includes:

- Spring MVC/WebFlux annotations and functional routes, JAX-RS declarations, and Ktor routes;
- `HttpClient`, Spring `WebClient`/`RestTemplate`, Feign, Retrofit, and generated-client calls
  with literal or explicitly configured targets;
- JPA/Hibernate entities, JDBC and jOOQ statements, Spring Data repositories, Kotlin Exposed
  tables/queries, and migration resources;
- Jackson, Gson, kotlinx.serialization, JSON Schema, CSV bindings, and explicit field-name
  annotations that prove serialized names.

Framework dependencies alone identify candidates; route, query, model, or registration syntax
is required to confirm lineage.

### Perl

Inspect `.pl`, `.pm`, `.psgi`, and included `.t` files within `cpanfile`, `Makefile.PL`,
`Build.PL`, or `dist.ini` boundaries. Direct evidence includes:

- `use`/`require` statements resolving to local modules;
- Dancer/Dancer2 or Mojolicious literal routes and literal user-agent calls;
- DBI SQL, MongoDB driver collection operations, JSON encode/decode mappings, and
  `Text::CSV`/equivalent header and column mappings.

Module names and CPAN dependencies alone do not prove a data flow.

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
Java/Kotlin (including Spring, JAX-RS, and Ktor), Perl (including Dancer and Mojolicious), and
other supported languages, plus GraphQL resolvers/schemas and protobuf service
implementations. Client evidence includes literal Java/Kotlin HTTP-client calls, Perl
user-agent calls, and generated-client calls whose target contract is visible.

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

## MongoDB and document stores

Confirmed MongoDB evidence includes literal database or collection selection, Spring Data
`@Document` mappings, Java/Kotlin codec or document models, Perl MongoDB driver calls,
`mongosh` scripts, collection validators, and explicit aggregation pipelines.

Direction rules:

```text
insert/update/replace/delete/bulk write → application → collection
find/query/aggregate/change-stream read → collection → application
```

Create a `datastructure` for a logical collection when its name and role are explicit. Do not
create one collection per unresolved runtime value. A database name without a collection may
support a database-level structure only when the analyzed operations genuinely work at that
level.

Document fields require a validator, typed/annotated model, codec mapping, projection,
aggregation stage, or literal document mapping. Preserve nested fields as dotted paths when
the code exposes them. A schemaless collection name alone does not prove fields. Treat dynamic
collection names, computed property paths, and unexpanded pipelines as uncertainty.

MongoDB URIs may contain credentials. Never reproduce a connection string; retain only safe,
explicit logical database and collection names. Since S2L `url` permits only HTTP(S), MongoDB
connection URIs do not belong in that field.

## JSON and CSV

JSON and CSV participate in lineage only when code or configuration establishes a read,
write, contract, or mapping. A file extension by itself is insufficient.

For JSON, confirmed field evidence includes JSON Schema, Jackson/Gson/kotlinx.serialization
models and annotations, Perl JSON mappings, explicit object construction, or parser/writer
property mappings. Treat JSONL and NDJSON as JSON record streams under the same rules. Record
nested properties as dotted paths when visible.

For CSV/TSV, confirmed field evidence includes a literal header, declared column list, typed
binding, or parser/writer mapping such as Apache Commons CSV, OpenCSV, Jackson CSV, or Perl
`Text::CSV`. Headerless positional data requires an explicit index-to-field mapping; never
invent names from sample values.

Direction rules:

```text
application serializes/writes JSON or CSV → application → file store/exchange
application parses/reads JSON or CSV      → file store/exchange → application
```

Represent a stable logical file collection, feed, bucket, or exchange as a `datastructure`;
do not create a system for every incidental file. Use the S2L source `table` field for the
logical JSON contract/file or CSV dataset and `column` for the property path or column name.

Inspect schemas, property names, headers, and mappings only. Do not reproduce JSON values or
CSV rows, and do not inspect suspected production dumps or files containing credentials or
personal records merely to infer a schema.

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

## Analogous technologies

Do not ignore an integration solely because its library or format is not named above. Apply
the closest established rule when direct syntax proves all of the following:

1. the owning application or boundary;
2. the logical data structure or API;
3. whether the operation reads or writes;
4. the container and fields being transferred.

For example, another document database follows the MongoDB evidence and direction rules, and
another delimited or structured file format follows the CSV/JSON rules. If one of these facts
is dynamic or unresolved, record the candidate under uncertainties instead of generalizing
from a package name.

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
