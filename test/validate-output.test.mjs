import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCatalog, validateCatalog, validateFiles, validateReport } from '../scripts/validate-output.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixture = name => path.join(root, 'fixtures', name);

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

