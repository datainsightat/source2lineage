# Source2Lineage Browser App

This directory contains the local browser application and deterministic source-analysis engine
bundled with [Source2Lineage](../README.md).

## Files

- `source_lineage_analyzer.html` — analyzes a repository folder, opens or creates lineage
  catalogs, supports manual system and data-object editing, and renders interactive graphs.
- `source_lineage_engine.js` — dependency-free static-analysis engine shared by the browser and
  CLI.
- `source_lineage_cli.js` — command-line interface for repeatable source analysis.
- `demo_product_catalog.yaml` — editable example with a product specification app, PostgreSQL
  database, internal API, external API, and representative product data objects.

## Open the browser app

No installation or web server is required. Open `source_lineage_analyzer.html` directly in a
current browser—for example, by double-clicking the file after cloning or downloading the
repository. The app runs from the local filesystem, and selected source files are not
uploaded.

### Try the demo

1. Select **Open YAML**.
2. Choose `demo_product_catalog.yaml`.
3. Review or edit the **Systeme**, **Datenobjekte**, and **Gesamtvisualisierung** tabs.
4. Select **Download YAML** to save the modified catalog.

### Analyze source code

1. Open the **Analysis** tab.
2. Choose a repository folder.
3. Adjust the project name or filters if necessary.
4. Select **Analyze source**.
5. Review the evidence and warnings, refine the generated catalog in the editor tabs, and
   download the result.

### Build a catalog manually

1. Select **New catalog**.
2. Add applications, APIs, or data structures under **Systeme**.
3. Add field-level sources and targets under **Datenobjekte**.
4. Arrange and inspect the graph under **Gesamtvisualisierung**.
5. Download the finished YAML file.

## Command-line analysis

Node.js 18 or newer is recommended.

```bash
node source_lineage_cli.js /path/to/repository --output source_lineage.yaml
```

Options:

```text
--name <name>             fallback name when no project manifest exists
--include-tests           include test and fixture directories
--ignore <a,b,c>          add ignored directory names
--max-file-size <bytes>   change the per-file safety limit
```

## Detection scope

The engine recognizes manifest-defined projects, local imports, common HTTP server/client
patterns, SQL tables, SQL reads/writes, and declared SQL columns across common JavaScript,
TypeScript, Python, Java, .NET, Go, Rust, Perl, and SQL source files. Perl support includes
`cpanfile`, `Makefile.PL`, `Build.PL`, and `dist.ini` project discovery, module imports,
Dancer/Mojolicious-style literal routes, user-agent calls, and embedded SQL.

Generated YAML uses JSON syntax, which is valid YAML 1.2 and can be reopened without an
external parser.

## Safety and limitations

The scanner excludes dependencies, VCS metadata, build output, caches, virtual environments,
tests/fixtures by default, environment/secret/key files, binary content, and oversized files.
It never executes the analyzed source.

Static analysis cannot prove runtime-only dependency injection, dynamically assembled URLs or
SQL, reflection, generated clients without visible contracts, or environment-specific wiring.
Treat the result as an evidence-backed starting point for review.
