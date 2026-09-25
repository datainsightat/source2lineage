import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCatalog, validateCatalog, validateFiles, validateReport } from '../scripts/validate-output.mjs';
import '../app/source_lineage_engine.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixture = name => path.join(root, 'fixtures', name);
const lineage = globalThis.SourceLineage;

test('agent workflow targets the canonical S2L specification', () => {
  const repository = path.join(root, '..');
  const constitution = fs.readFileSync(path.join(repository, 'AGENTS.md'), 'utf8');
  const workflow = fs.readFileSync(path.join(repository, '.claude', 'commands', 'lineage-analyze.md'), 'utf8');
  const outputRules = fs.readFileSync(path.join(repository, '.claude', 'rules', 'lineage-output.md'), 'utf8');
  for (const text of [constitution, outputRules]) {
    assert.match(text, /https:\/\/github\.com\/datainsightat\/s2l/);
    assert.match(text, /S2L.+version 6/is);
  }
  assert.match(workflow, /do not create a placeholder or source-inventory object/i);
  assert.doesNotMatch(workflow, /create one conservative .*source inventory.* object/i);
});

test('agent workflow covers the primary stack and analogous technologies', () => {
  const repository = path.join(root, '..');
  const constitution = fs.readFileSync(path.join(repository, 'AGENTS.md'), 'utf8');
  const workflow = fs.readFileSync(path.join(repository, '.claude', 'commands', 'lineage-analyze.md'), 'utf8');
  const guide = fs.readFileSync(path.join(repository, 'docs', 'detection-guide.md'), 'utf8');
  const scout = fs.readFileSync(path.join(repository, '.claude', 'agents', 'lineage-scout.md'), 'utf8');
  for (const technology of ['Java', 'Kotlin', 'Perl', 'SQL', 'MongoDB', 'JSON', 'CSV']) {
    for (const text of [constitution, workflow, guide, scout]) assert.match(text, new RegExp(`\\b${technology}\\b`, 'i'));
  }
  assert.match(guide, /## Analogous technologies/);
  assert.match(guide, /do not reproduce JSON values or\s+CSV rows/i);
  assert.match(workflow, /MongoDB inserts, updates, replacements, deletes, and bulk writes point application/i);
  assert.match(workflow, /JSON\/CSV writes point application/i);
});

test('recognizes Perl projects and standalone SQL source files', () => {
  for (const file of [
    'service/cpanfile',
    'service/Makefile.PL',
    'service/Build.PL',
    'service/dist.ini',
    'service/app.psgi',
    'service/lib/Orders.pm',
    'scripts/import.pl',
    'db/schema.sql',
    'db/schema.ddl',
    'db/load.dml',
    'db/session.psql'
  ]) assert.equal(lineage.shouldAnalyzePath(file), true, file);
  assert.equal(lineage.shouldAnalyzePath('service/t/routes.t'), false);
  assert.equal(lineage.shouldAnalyzePath('service/t/routes.t', { includeTests: true }), true);
});

test('extracts Perl dependencies, HTTP flow, and embedded SQL lineage', () => {
  const result = lineage.analyze([
    {
      path: 'service/Makefile.PL',
      content: "WriteMakefile(NAME => 'Order::Service');\n"
    },
    {
      path: 'service/app.psgi',
      content: [
        'use Dancer2;',
        "get '/orders' => sub { return []; };",
        "my $ddl = <<'SQL';",
        'CREATE TABLE orders (',
        '  order_id UUID,',
        '  total NUMERIC(12,2)',
        ');',
        'SQL'
      ].join('\n')
    },
    {
      path: 'client/Makefile.PL',
      content: "WriteMakefile(NAME => 'Order::Client');\n"
    },
    {
      path: 'client/lib/Order/Client.pm',
      content: [
        'package Order::Client;',
        'use Order::Service;',
        "my $response = $ua->get('https://orders.example.test/orders');"
      ].join('\n')
    }
  ], { projectName: 'Orders' });

  const systems = new Map(result.catalog.systems.map(system => [system.name, system]));
  assert.ok(systems.has('Order Client'));
  assert.ok(systems.has('Order Service'));
  assert.ok(systems.has('Order Service API'));
  assert.ok(systems.has('Table orders'));
  assert.ok(systems.get('Order Client').outputs.includes('Order Service'));
  assert.ok(systems.get('Order Client').outputs.includes('Order Service API'));
  assert.ok(result.catalog.objects.some(object => object.field === 'GET /orders'));
  assert.ok(result.catalog.objects.some(object => object.field === 'orders.order_id' && object.datatype === 'uuid'));
  assert.ok(result.catalog.objects.some(object => object.field === 'orders.total' && object.datatype === 'numeric(12,2)'));
  assert.deepEqual(validateCatalog(result.catalog), []);
});

test('accepts a compatible catalog and complete report', () => {
  const result = validateFiles(fixture('valid-data-lineage.yaml'), fixture('valid-system-analysis.md'));
  assert.deepEqual(result.errors, []);
});

test('rejects unknown systems, duplicate IDs, and invalid links', () => {
  const catalog = parseCatalog(fs.readFileSync(fixture('valid-data-lineage.yaml'), 'utf8'));
  catalog.systems[0].outputs.push('Missing System');
  catalog.objects.push({ ...catalog.objects[0] });
  catalog.objects[0].source.system = 'Missing System';
  const errors = validateCatalog(catalog);
  assert.ok(errors.some(error => error.includes('unknown system')));
  assert.ok(errors.some(error => error.includes('duplicates')));
});

test('rejects incomplete reports and placeholders', () => {
  const catalog = parseCatalog(fs.readFileSync(fixture('valid-data-lineage.yaml'), 'utf8'));
  const errors = validateReport('# System Analysis\n\nTODO: <fill this>', catalog);
  assert.ok(errors.some(error => error.includes('missing')));
  assert.ok(errors.some(error => error.includes('placeholder')));
  assert.ok(errors.some(error => error.includes('Orders App')));
});

test('rejects non-JSON YAML syntax with a clear message', () => {
  assert.throws(() => parseCatalog('version: 6\nsystems: []'), /must use JSON syntax/);
});
