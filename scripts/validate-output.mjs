import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const systemTypes = new Set(['application', 'api', 'datastructure']);
const criticalities = new Set(['low', 'medium', 'high', 'critical']);
const requiredHeadings = [
  'Executive summary',
  'Scope and method',
  'System inventory',
  'Data-flow narrative',
  'Data-object dictionary',
  'Evidence index',
  'Uncertainties and limitations',
  'Reproduction and review notes'
];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSorted(values) {
  return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value) <= 0);
}

function checkKeys(value, required, allowed, location, errors) {
  if (!isRecord(value)) {
    errors.push(`${location} must be an object.`);
    return false;
  }
  for (const key of required) if (!(key in value)) errors.push(`${location}.${key} is required.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${location}.${key} is not allowed.`);
  return true;
}

function validateView(view, location, errors) {
  if (!checkKeys(view, ['x', 'y', 'scale'], ['x', 'y', 'scale'], location, errors)) return;
  if (!isFiniteNumber(view.x)) errors.push(`${location}.x must be a finite number.`);
  if (!isFiniteNumber(view.y)) errors.push(`${location}.y must be a finite number.`);
  if (!isFiniteNumber(view.scale) || view.scale <= 0) errors.push(`${location}.scale must be greater than zero.`);
}

function validatePositions(positions, location, errors) {
  if (!isRecord(positions)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  for (const [name, position] of Object.entries(positions)) {
    if (!checkKeys(position, ['x', 'y'], ['x', 'y'], `${location}[${JSON.stringify(name)}]`, errors)) continue;
    if (!isFiniteNumber(position.x) || !isFiniteNumber(position.y)) errors.push(`${location}[${JSON.stringify(name)}] must contain finite x and y values.`);
  }
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!checkKeys(catalog, ['version', 'systems', 'objects', 'layouts'], ['version', 'systems', 'objects', 'layouts'], 'catalog', errors)) return errors;
  if (catalog.version !== 6) errors.push('catalog.version must be 6.');
  if (!Array.isArray(catalog.systems) || catalog.systems.length === 0) errors.push('catalog.systems must be a non-empty array.');
  if (!Array.isArray(catalog.objects) || catalog.objects.length === 0) errors.push('catalog.objects must be a non-empty array.');

  const names = new Set();
  const systemNames = (Array.isArray(catalog.systems) ? catalog.systems : []).map(system => String(system?.name || ''));
  if (!isSorted(systemNames)) errors.push('catalog.systems must be sorted by name.');
  for (const [index, system] of (Array.isArray(catalog.systems) ? catalog.systems : []).entries()) {
    const location = `catalog.systems[${index}]`;
    if (!checkKeys(system, ['name', 'description', 'url', 'type', 'outputs'], ['name', 'description', 'url', 'type', 'outputs'], location, errors)) continue;
    if (typeof system.name !== 'string' || !system.name.trim()) errors.push(`${location}.name must be a non-empty string.`);
    else if (names.has(system.name)) errors.push(`${location}.name duplicates ${JSON.stringify(system.name)}.`);
    else names.add(system.name);
    if (typeof system.description !== 'string') errors.push(`${location}.description must be a string.`);
    if (typeof system.url !== 'string') errors.push(`${location}.url must be a string.`);
    else if (system.url) {
      try {
        const parsed = new URL(system.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
      } catch {
        errors.push(`${location}.url must be blank or a valid HTTP/HTTPS URL.`);
      }
    }
    if (!systemTypes.has(system.type)) errors.push(`${location}.type is invalid.`);
    if (!Array.isArray(system.outputs)) errors.push(`${location}.outputs must be an array.`);
    else {
      if (system.outputs.some(output => typeof output !== 'string' || !output)) errors.push(`${location}.outputs must contain non-empty strings.`);
      if (new Set(system.outputs).size !== system.outputs.length) errors.push(`${location}.outputs contains duplicates.`);
      if (!isSorted(system.outputs.map(String))) errors.push(`${location}.outputs must be sorted by name.`);
    }
  }

  for (const [index, system] of (Array.isArray(catalog.systems) ? catalog.systems : []).entries()) {
    if (!Array.isArray(system.outputs)) continue;
    for (const output of system.outputs) {
      if (!names.has(output)) errors.push(`catalog.systems[${index}].outputs references unknown system ${JSON.stringify(output)}.`);
      if (output === system.name) errors.push(`catalog.systems[${index}].outputs contains a self-link.`);
    }
  }

  const ids = new Set();
  const objectIds = (Array.isArray(catalog.objects) ? catalog.objects : []).map(object => String(object?.id || ''));
  if (!isSorted(objectIds)) errors.push('catalog.objects must be sorted by ID.');
  for (const [index, object] of (Array.isArray(catalog.objects) ? catalog.objects : []).entries()) {
    const location = `catalog.objects[${index}]`;
    if (!checkKeys(object, ['id', 'field', 'datatype', 'criticality', 'source', 'targets'], ['id', 'field', 'datatype', 'criticality', 'source', 'targets'], location, errors)) continue;
    if (typeof object.id !== 'string' || !/^[A-Za-z0-9_.:-]+$/.test(object.id)) errors.push(`${location}.id must match ^[A-Za-z0-9_.:-]+$.`);
    else if (ids.has(object.id)) errors.push(`${location}.id duplicates ${JSON.stringify(object.id)}.`);
    else ids.add(object.id);
    if (typeof object.field !== 'string' || !object.field.trim()) errors.push(`${location}.field must be a non-empty string.`);
    if (typeof object.datatype !== 'string') errors.push(`${location}.datatype must be a string.`);
    if (!criticalities.has(object.criticality)) errors.push(`${location}.criticality is invalid.`);
    if (checkKeys(object.source, ['system', 'table', 'column'], ['system', 'table', 'column'], `${location}.source`, errors)) {
      if (!names.has(object.source.system)) errors.push(`${location}.source.system references unknown system ${JSON.stringify(object.source.system)}.`);
      if (typeof object.source.table !== 'string') errors.push(`${location}.source.table must be a string.`);
      if (typeof object.source.column !== 'string') errors.push(`${location}.source.column must be a string.`);
    }
    if (!Array.isArray(object.targets)) errors.push(`${location}.targets must be an array.`);
    else {
      const targetKeys = object.targets.map(target => `${String(target?.system || '')}\u0000${String(target?.column || '')}`);
      if (new Set(targetKeys).size !== targetKeys.length) errors.push(`${location}.targets contains duplicates.`);
      if (!isSorted(targetKeys)) errors.push(`${location}.targets must be sorted by system and column.`);
      for (const [targetIndex, target] of object.targets.entries()) {
      const targetLocation = `${location}.targets[${targetIndex}]`;
      if (!checkKeys(target, ['system', 'column'], ['system', 'column'], targetLocation, errors)) continue;
      if (!names.has(target.system)) errors.push(`${targetLocation}.system references unknown system ${JSON.stringify(target.system)}.`);
      if (typeof target.column !== 'string') errors.push(`${targetLocation}.column must be a string.`);
      }
    }
  }

  if (checkKeys(catalog.layouts, ['systems', 'catalog', 'systemView', 'catalogView'], ['systems', 'catalog', 'systemView', 'catalogView'], 'catalog.layouts', errors)) {
    validatePositions(catalog.layouts.systems, 'catalog.layouts.systems', errors);
    validatePositions(catalog.layouts.catalog, 'catalog.layouts.catalog', errors);
    validateView(catalog.layouts.systemView, 'catalog.layouts.systemView', errors);
    validateView(catalog.layouts.catalogView, 'catalog.layouts.catalogView', errors);
  }
  return errors;
}

export function validateReport(report, catalog) {
  const errors = [];
  if (!/^# System Analysis\s*$/m.test(report)) errors.push('report must start with the # System Analysis title.');
  for (const heading of requiredHeadings) if (!report.includes(`## ${heading}`)) errors.push(`report is missing the ## ${heading} section.`);
  if (/<[^>]+>|\bTODO\b|\bTBD\b/.test(report)) errors.push('report contains an unfilled placeholder.');
  if (!/[^\s`:]+:\d+/.test(report)) errors.push('report must contain at least one path:line evidence reference.');
  for (const system of catalog.systems || []) if (!report.includes(system.name)) errors.push(`report does not mention system ${JSON.stringify(system.name)}.`);
  if (!/static analysis/i.test(report)) errors.push('report must state that it is based on static analysis.');
  if (!/validate-output\.mjs/.test(report)) errors.push('report must record the validator command.');
  return errors;
}

export function parseCatalog(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`data-lineage.yaml must use JSON syntax (valid YAML 1.2): ${error.message}`);
  }
}

export function validateFiles(yamlPath, markdownPath) {
  const catalog = parseCatalog(fs.readFileSync(yamlPath, 'utf8'));
  const report = fs.readFileSync(markdownPath, 'utf8');
  return { catalog, errors: [...validateCatalog(catalog), ...validateReport(report, catalog)] };
}

function main(args) {
  if (args.length !== 2) {
    console.error('Usage: node scripts/validate-output.mjs <data-lineage.yaml> <system-analysis.md>');
    return 2;
  }
  const yamlPath = path.resolve(args[0]);
  const markdownPath = path.resolve(args[1]);
  for (const filePath of [yamlPath, markdownPath]) if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    return 2;
  }
  try {
    const { catalog, errors } = validateFiles(yamlPath, markdownPath);
    if (errors.length) {
      console.error(`INVALID (${errors.length} problem${errors.length === 1 ? '' : 's'})`);
      errors.forEach(error => console.error(`- ${error}`));
      return 1;
    }
    const connections = catalog.systems.reduce((count, system) => count + system.outputs.length, 0);
    console.log(`VALID: ${catalog.systems.length} system${catalog.systems.length === 1 ? '' : 's'}, ${catalog.objects.length} data object${catalog.objects.length === 1 ? '' : 's'}, ${connections} connection${connections === 1 ? '' : 's'}.`);
    return 0;
  } catch (error) {
    console.error(`INVALID: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));
