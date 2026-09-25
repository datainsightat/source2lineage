#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Lineage = require('./source_lineage_engine.js');

function usage() {
  return `Source Lineage Analyzer

Usage:
  node source_lineage_cli.js <source-path> [options]

Options:
  -o, --output <file>       Output file (default: source_lineage.yaml)
  -n, --name <name>         Name for a repository without a manifest
      --include-tests       Include test and fixture directories
      --ignore <names>      Additional comma-separated directory names
      --max-file-size <n>   Maximum bytes per file (default: 1048576)
  -h, --help                Show this help
`;
}

function parseArgs(argv) {
  const result = { source: '', output: 'source_lineage.yaml', name: '', includeTests: false, ignore: '', maxFileSize: 1024 * 1024 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '-h' || value === '--help') result.help = true;
    else if (value === '--include-tests') result.includeTests = true;
    else if (value === '-o' || value === '--output') result.output = argv[++index];
    else if (value === '-n' || value === '--name') result.name = argv[++index];
    else if (value === '--ignore') result.ignore = argv[++index];
    else if (value === '--max-file-size') result.maxFileSize = Number(argv[++index]);
    else if (value.startsWith('-')) throw new Error('Unknown option: ' + value);
    else if (!result.source) result.source = value;
    else throw new Error('Unexpected argument: ' + value);
  }
  if (!result.help && !result.source) throw new Error('A source path is required.');
  if (!result.output) throw new Error('The output path cannot be empty.');
  if (!Number.isInteger(result.maxFileSize) || result.maxFileSize < 1) throw new Error('--max-file-size must be a positive integer.');
  return result;
}

function collect(root, options) {
  const absoluteRoot = path.resolve(root);
  if (!fs.existsSync(absoluteRoot)) throw new Error('Source path does not exist: ' + root);
  const stat = fs.statSync(absoluteRoot);
  const base = stat.isDirectory() ? absoluteRoot : path.dirname(absoluteRoot);
  const pending = [absoluteRoot];
  const files = [];
  while (pending.length) {
    const current = pending.pop();
    const currentStat = fs.lstatSync(current);
    if (currentStat.isSymbolicLink()) continue;
    if (currentStat.isDirectory()) {
      const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => b.name.localeCompare(a.name));
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        const relative = Lineage.normalizePath(path.relative(base, full));
        if (entry.isDirectory() && !Lineage.shouldAnalyzePath(relative + '/placeholder.js', options)) continue;
        pending.push(full);
      }
      continue;
    }
    const relative = Lineage.normalizePath(path.relative(base, current) || path.basename(current));
    if (!Lineage.shouldAnalyzePath(relative, options)) continue;
    if (currentStat.size > options.maxFileSize) {
      files.push({ path: relative, content: '', size: currentStat.size });
      continue;
    }
    files.push({ path: relative, content: fs.readFileSync(current, 'utf8'), size: currentStat.size });
  }
  return files;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write(usage());
      return;
    }
    const options = { projectName: args.name || path.basename(path.resolve(args.source)), includeTests: args.includeTests, ignore: args.ignore, maxFileSize: args.maxFileSize };
    const result = Lineage.analyze(collect(args.source, options), options);
    fs.writeFileSync(path.resolve(args.output), Lineage.serialize(result.catalog), 'utf8');
    process.stdout.write('Analyzed ' + result.report.analyzedFiles + ' file(s) into ' + result.catalog.systems.length + ' system(s) and ' + result.catalog.objects.length + ' data object(s).\n');
    process.stdout.write('Wrote ' + path.resolve(args.output) + '\n');
    for (const warning of result.report.warnings) process.stderr.write('Warning: ' + warning + '\n');
  } catch (error) {
    process.stderr.write('Error: ' + error.message + '\n\n' + usage());
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { parseArgs, collect };

