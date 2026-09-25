(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SourceLineage = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_IGNORES = new Set([
    '.git', '.hg', '.svn', '.idea', '.vscode', '.next', '.nuxt', '.output', '.terraform',
    'node_modules', 'vendor', 'dist', 'build', 'target', 'coverage', '__pycache__', '.pytest_cache',
    '.mypy_cache', '.venv', 'venv', 'env', 'bin', 'obj'
  ]);
  const SOURCE_EXTENSIONS = new Set([
    '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.java', '.cs', '.go', '.rs',
    '.pl', '.pm', '.psgi', '.t', '.sql', '.ddl', '.dml', '.psql', '.graphql', '.gql', '.proto',
    '.json', '.toml', '.xml', '.gradle', '.kts',
    '.yaml', '.yml'
  ]);
  const FIXED_MANIFESTS = new Set([
    'package.json', 'pyproject.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'go.mod',
    'cargo.toml', 'composer.json', 'gemfile', 'mix.exs', 'cpanfile', 'makefile.pl', 'build.pl',
    'dist.ini'
  ]);
  const TEST_SEGMENTS = new Set(['test', 'tests', 't', '__tests__', 'spec', 'specs', 'fixtures', '__fixtures__']);

  function normalizePath(value) {
    const parts = String(value || '').replace(/\\/g, '/').split('/');
    const clean = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') clean.pop();
      else clean.push(part);
    }
    return clean.join('/');
  }

  function dirname(value) {
    const path = normalizePath(value);
    const index = path.lastIndexOf('/');
    return index < 0 ? '' : path.slice(0, index);
  }

  function basename(value) {
    const path = normalizePath(value);
    return path.slice(path.lastIndexOf('/') + 1);
  }

  function extension(value) {
    const name = basename(value).toLowerCase();
    const index = name.lastIndexOf('.');
    return index < 0 ? '' : name.slice(index);
  }

  function isManifest(path) {
    const name = basename(path).toLowerCase();
    return FIXED_MANIFESTS.has(name) || name.endsWith('.csproj') || name.endsWith('.fsproj');
  }

  function shouldAnalyzePath(path, options) {
    const settings = options || {};
    const normalized = normalizePath(path);
    if (!normalized) return false;
    const parts = normalized.split('/');
    const lowerParts = parts.map(part => part.toLowerCase());
    const ignores = new Set([...DEFAULT_IGNORES, ...String(settings.ignore || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)]);
    if (lowerParts.some(part => ignores.has(part))) return false;
    if (!settings.includeTests && lowerParts.some(part => TEST_SEGMENTS.has(part))) return false;
    if (lowerParts.some(part => part.startsWith('.env') || part.includes('secret') || part.endsWith('.pem') || part.endsWith('.key'))) return false;
    return isManifest(normalized) || SOURCE_EXTENSIONS.has(extension(normalized));
  }

  function safeJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  function firstMatch(text, pattern) {
    const match = pattern.exec(text);
    return match ? String(match[1] || '').trim() : '';
  }

  function cleanName(value) {
    const text = String(value || '').trim().replace(/^@[^/]+\//, '');
    return text.replace(/[^A-Za-z0-9_. -]+/g, '-').replace(/[-_. ]+/g, ' ').trim() || 'Application';
  }

  function projectInfo(file, fallback) {
    const name = basename(file.path).toLowerCase();
    const text = file.content || '';
    let packageName = '';
    let displayName = '';
    let url = '';
    if (name === 'package.json') {
      const data = safeJson(text);
      packageName = typeof data.name === 'string' ? data.name : '';
      displayName = packageName;
      url = typeof data.homepage === 'string' ? data.homepage : '';
    } else if (name === 'pyproject.toml') {
      displayName = firstMatch(text, /^name\s*=\s*["']([^"']+)["']/m);
      packageName = displayName;
    } else if (name === 'pom.xml') {
      displayName = firstMatch(text, /<artifactId>\s*([^<]+)\s*<\/artifactId>/i);
      packageName = firstMatch(text, /<groupId>\s*([^<]+)\s*<\/groupId>/i);
      packageName = packageName && displayName ? packageName + ':' + displayName : displayName;
    } else if (name.endsWith('.csproj') || name.endsWith('.fsproj')) {
      displayName = firstMatch(text, /<AssemblyName>\s*([^<]+)\s*<\/AssemblyName>/i) || basename(file.path).replace(/\.[^.]+$/, '');
      packageName = firstMatch(text, /<RootNamespace>\s*([^<]+)\s*<\/RootNamespace>/i) || displayName;
    } else if (name === 'go.mod') {
      packageName = firstMatch(text, /^module\s+(\S+)/m);
      displayName = packageName.split('/').pop();
    } else if (name === 'cargo.toml') {
      displayName = firstMatch(text, /^name\s*=\s*["']([^"']+)["']/m);
      packageName = displayName;
    } else if (name === 'makefile.pl' || name === 'build.pl') {
      displayName = firstMatch(text, /\b(?:NAME|module_name)\s*(?:=>|=)\s*["']([^"']+)["']/i);
      packageName = displayName;
    } else if (name === 'dist.ini') {
      displayName = firstMatch(text, /^name\s*=\s*([^\s;#]+)\s*$/mi);
      packageName = displayName;
    } else if (name.startsWith('build.gradle')) {
      displayName = firstMatch(text, /rootProject\.name\s*=\s*["']([^"']+)["']/);
    }
    return { name: cleanName(displayName || fallback), packageName: packageName || displayName || fallback, url };
  }

  function commonRoot(paths) {
    if (!paths.length) return '';
    let parts = normalizePath(paths[0]).split('/').slice(0, -1);
    for (const path of paths.slice(1)) {
      const current = normalizePath(path).split('/');
      let index = 0;
      while (index < parts.length && parts[index] === current[index]) index += 1;
      parts = parts.slice(0, index);
    }
    return parts.join('/');
  }

  function uniqueProjectNames(projects) {
    const used = new Map();
    for (const project of projects) {
      const key = project.name.toLowerCase();
      const count = (used.get(key) || 0) + 1;
      used.set(key, count);
      if (count > 1) project.name += ' (' + (project.root || count) + ')';
    }
  }

  function discoverProjects(files, options) {
    const manifests = files.filter(file => isManifest(file.path));
    const byRoot = new Map();
    for (const manifest of manifests) {
      const root = dirname(manifest.path);
      if (!byRoot.has(root)) byRoot.set(root, []);
      byRoot.get(root).push(manifest);
    }
    const projects = [];
    for (const [root, entries] of byRoot) {
      const preferred = entries.slice().sort((a, b) => {
        const rank = path => basename(path).toLowerCase() === 'package.json' ? 0 : 1;
        return rank(a.path) - rank(b.path) || a.path.localeCompare(b.path);
      })[0];
      const fallback = basename(root) || options.projectName || 'Application';
      projects.push({ root, ...projectInfo(preferred, fallback), files: [], dependencies: new Set(), importKeys: new Set(), routes: [], calls: [], tables: new Map() });
    }
    if (!projects.length) {
      const root = commonRoot(files.map(file => file.path));
      projects.push({ root, name: cleanName(options.projectName || basename(root) || 'Application'), packageName: options.projectName || basename(root) || 'application', url: '', files: [], dependencies: new Set(), importKeys: new Set(), routes: [], calls: [], tables: new Map() });
    }
    projects.sort((a, b) => a.root.localeCompare(b.root));
    uniqueProjectNames(projects);
    for (const file of files) {
      const candidates = projects.filter(project => !project.root || file.path === project.root || file.path.startsWith(project.root + '/'));
      const project = candidates.sort((a, b) => b.root.length - a.root.length)[0] || projects[0];
      project.files.push(file);
      file.project = project;
    }
    const active = projects.filter(project => project.files.some(file => !isManifest(file.path)) || projects.length === 1);
    for (const project of active) {
      project.importKeys.add(project.packageName);
      project.importKeys.add(String(project.packageName).replace(/-/g, '_'));
      for (const file of project.files) {
        const packageName = firstMatch(file.content, /^\s*(?:package|namespace)\s+([A-Za-z_][\w.]*)/m);
        if (packageName) project.importKeys.add(packageName);
      }
    }
    return active;
  }

  function resolveRelativeProject(file, specifier, projects) {
    if (!specifier.startsWith('.')) return null;
    const target = normalizePath(dirname(file.path) + '/' + specifier);
    return projects.filter(project => project.root && (target === project.root || target.startsWith(project.root + '/'))).sort((a, b) => b.root.length - a.root.length)[0] || file.project;
  }

  function findProjectBySpecifier(specifier, projects) {
    const clean = specifier.replace(/^@([^/]+)\/([^/]+).*$/, '@$1/$2').split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
    const matchingKeys = project => [...project.importKeys].filter(key => {
      const value = String(key || '');
      return value && (specifier === value || specifier.startsWith(value + '/') || specifier.startsWith(value + '.') || specifier.startsWith(value + '::') || cleanName(value).toLowerCase() === cleanName(clean).toLowerCase());
    });
    const matches = projects.filter(project => matchingKeys(project).length);
    return matches.sort((a, b) => Math.max(...matchingKeys(b).map(key => String(key).length)) - Math.max(...matchingKeys(a).map(key => String(key).length)))[0] || null;
  }

  function importsFor(file) {
    const text = file.content;
    const ext = extension(file.path);
    const values = [];
    const collect = pattern => {
      let match;
      while ((match = pattern.exec(text))) values.push(match[1]);
    };
    if (['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) {
      collect(/(?:\bfrom\s*|\brequire\s*\(|\bimport\s*\()\s*["']([^"']+)["']/g);
    } else if (ext === '.py') {
      collect(/^\s*(?:from|import)\s+([A-Za-z_][\w.]*)/gm);
    } else if (ext === '.java') {
      collect(/^\s*import\s+(?:static\s+)?([\w.]+)/gm);
    } else if (ext === '.cs') {
      collect(/^\s*using\s+([\w.]+)/gm);
    } else if (ext === '.go') {
      collect(/["']([^"']+)["']/g);
    } else if (ext === '.rs') {
      collect(/^\s*(?:use|extern\s+crate)\s+([A-Za-z_][\w:]*)/gm);
    } else if (['.pl', '.pm', '.psgi', '.t'].includes(ext)) {
      collect(/^\s*(?:use|require)\s+([A-Za-z_][\w:]*)/gm);
    }
    return values;
  }

  function detectDependencies(files, projects) {
    for (const file of files) {
      for (const specifier of importsFor(file)) {
        let target = resolveRelativeProject(file, specifier, projects);
        if (!target || target === file.project) target = findProjectBySpecifier(specifier, projects);
        if (target && target !== file.project) file.project.dependencies.add(target.name);
      }
    }
  }

  function normalizeRoute(value) {
    let route = String(value || '').trim();
    try {
      if (/^https?:\/\//i.test(route)) route = new URL(route).pathname;
    } catch {
      return '';
    }
    route = route.replace(/\$\{[^}]+\}/g, ':param').split(/[?#]/)[0];
    if (!route.startsWith('/')) return '';
    return route.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  function lineNumber(text, index) {
    return text.slice(0, index).split('\n').length;
  }

  function detectHttp(file) {
    const text = file.content;
    const ext = extension(file.path);
    const routes = [];
    const calls = [];
    const routePatterns = [
      { regex: /@(?:app|router|blueprint)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi, method: 1, path: 2 },
      { regex: /\b(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi, method: 1, path: 2 },
      { regex: /@(Get|Post|Put|Patch|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']*)["']/gi, method: 1, path: 2 },
      { regex: /\bMap(Get|Post|Put|Patch|Delete)\s*\(\s*["']([^"']+)["']/gi, method: 1, path: 2 },
      { regex: /\bHandleFunc\s*\(\s*["']([^"']+)["']/gi, method: 0, path: 1 }
    ];
    if (['.pl', '.pm', '.psgi', '.t'].includes(ext)) {
      routePatterns.push(
        { regex: /\b(get|post|put|patch|del|options|any)\s+["']([^"']+)["']\s*=>/gi, method: 1, path: 2 },
        { regex: /\$(?:r|routes)\s*->\s*(get|post|put|patch|delete|options|any)\s*\(\s*["']([^"']+)["']/gi, method: 1, path: 2 }
      );
    }
    for (const pattern of routePatterns) {
      let match;
      while ((match = pattern.regex.exec(text))) {
        const path = normalizeRoute(match[pattern.path]);
        const rawMethod = pattern.method ? match[pattern.method].toUpperCase().replace('MAPPING', '') : 'ANY';
        const method = rawMethod === 'DEL' ? 'DELETE' : rawMethod;
        if (path) routes.push({ method, path, file: file.path, line: lineNumber(text, match.index) });
      }
    }
    const callPatterns = [
      { regex: /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]/gi, method: 'ANY', path: 1 },
      { regex: /\baxios\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi, method: 1, path: 2 },
      { regex: /\brequests\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi, method: 1, path: 2 },
      { regex: /\bhttp\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi, method: 1, path: 2 },
      { regex: /\b(?:GetAsync|PostAsync|PutAsync|DeleteAsync)\s*\(\s*["']([^"']+)["']/gi, method: 'ANY', path: 1 }
    ];
    if (['.pl', '.pm', '.psgi', '.t'].includes(ext)) {
      callPatterns.push({ regex: /\$(?:ua|http|client)\s*->\s*(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi, method: 1, path: 2 });
    }
    for (const pattern of callPatterns) {
      let match;
      while ((match = pattern.regex.exec(text))) {
        const path = normalizeRoute(match[pattern.path]);
        if (path) calls.push({ method: typeof pattern.method === 'number' ? match[pattern.method].toUpperCase() : pattern.method, path, file: file.path, line: lineNumber(text, match.index) });
      }
    }
    return { routes, calls };
  }

  function splitSqlColumns(body) {
    const values = [];
    let current = '';
    let depth = 0;
    for (const char of body) {
      if (char === '(') depth += 1;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === ',' && depth === 0) {
        values.push(current);
        current = '';
      } else current += char;
    }
    if (current.trim()) values.push(current);
    return values;
  }

  function cleanIdentifier(value) {
    return String(value || '').replace(/^[`"\[]|[`"\]]$/g, '').trim();
  }

  function tableKey(value) {
    return cleanIdentifier(value).split('.').map(cleanIdentifier).join('.').toLowerCase();
  }

  function detectSql(file) {
    const text = file.content;
    const declarations = [];
    const accesses = [];
    let match;
    const create = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([`"\[\]\w.]+)\s*\(([\s\S]*?)\)\s*;/gi;
    while ((match = create.exec(text))) {
      const table = cleanIdentifier(match[1]);
      const columns = [];
      for (const definition of splitSqlColumns(match[2])) {
        const value = definition.trim();
        if (!value || /^(?:constraint|primary\s+key|foreign\s+key|unique|check|index|key)\b/i.test(value)) continue;
        const column = /^([`"\[]?[A-Za-z_][\w$]*[`"\]]?)\s+([A-Za-z_][\w]*(?:\s*\([^)]*\))?)/.exec(value);
        if (column) columns.push({ name: cleanIdentifier(column[1]), datatype: column[2].toLowerCase() });
      }
      declarations.push({ table, columns, file: file.path, line: lineNumber(text, match.index) });
    }
    const patterns = [
      { regex: /\b(?:from|join)\s+([`"\[\]\w.]+)/gi, mode: 'read' },
      { regex: /\binsert\s+into\s+([`"\[\]\w.]+)/gi, mode: 'write' },
      { regex: /\bupdate\s+([`"\[\]\w.]+)/gi, mode: 'write' },
      { regex: /\bdelete\s+from\s+([`"\[\]\w.]+)/gi, mode: 'write' }
    ];
    for (const pattern of patterns) {
      while ((match = pattern.regex.exec(text))) {
        accesses.push({ table: cleanIdentifier(match[1]), mode: pattern.mode, file: file.path, line: lineNumber(text, match.index) });
      }
    }
    return { declarations, accesses };
  }

  function routeMatches(endpoint, call) {
    if (endpoint.method !== 'ANY' && call.method !== 'ANY' && endpoint.method !== call.method) return false;
    const escaped = endpoint.path.split('/').map(segment => {
      if (segment.startsWith(':') || /^\{[^}]+\}$/.test(segment)) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    try {
      return new RegExp('^' + escaped + '$').test(call.path);
    } catch {
      return endpoint.path === call.path;
    }
  }

  function stableId(prefix, value) {
    let hash = 2166136261;
    const text = prefix + ':' + value;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return prefix + '_' + (hash >>> 0).toString(36);
  }

  function criticality(name) {
    const value = String(name).toLowerCase();
    if (/(password|passwd|secret|token|ssn|social.security|credit.card|iban)/.test(value)) return 'critical';
    if (/(email|phone|address|birth|customer|user_id|account)/.test(value)) return 'high';
    if (/(^|_)(id|key|code|status|amount|price)(_|$)/.test(value)) return 'medium';
    return 'low';
  }

  function addOutput(map, source, target) {
    if (!source || !target || source === target) return;
    if (!map.has(source)) map.set(source, new Set());
    map.get(source).add(target);
  }

  function buildCatalog(projects, files, warnings) {
    const outputs = new Map();
    const systems = [];
    const objects = [];
    const tableMap = new Map();
    for (const project of projects) {
      for (const dependency of project.dependencies) addOutput(outputs, project.name, dependency);
      systems.push({
        name: project.name,
        description: 'Source project at ' + (project.root || '.') + ' · ' + project.files.length + ' analyzed file(s)',
        url: project.url || '',
        type: 'application',
        outputs: []
      });
      for (const file of project.files) {
        const http = detectHttp(file);
        project.routes.push(...http.routes);
        project.calls.push(...http.calls);
        const sql = detectSql(file);
        for (const declaration of sql.declarations) {
          const key = tableKey(declaration.table);
          if (!tableMap.has(key)) tableMap.set(key, { name: declaration.table, columns: new Map(), readers: new Set(), writers: new Set(), declarations: [] });
          const table = tableMap.get(key);
          table.declarations.push(declaration);
          for (const column of declaration.columns) table.columns.set(column.name.toLowerCase(), column);
        }
        for (const access of sql.accesses) {
          const key = tableKey(access.table);
          if (!tableMap.has(key)) tableMap.set(key, { name: access.table, columns: new Map(), readers: new Set(), writers: new Set(), declarations: [] });
          const table = tableMap.get(key);
          if (access.mode === 'read') table.readers.add(project.name);
          else table.writers.add(project.name);
        }
      }
    }
    const endpoints = [];
    for (const project of projects) {
      if (!project.routes.length) continue;
      const apiName = project.name + ' API';
      systems.push({ name: apiName, description: 'HTTP API detected from ' + project.routes.length + ' route declaration(s) in ' + project.name, url: project.url || '', type: 'api', outputs: [] });
      addOutput(outputs, project.name, apiName);
      const unique = new Map();
      for (const route of project.routes) unique.set(route.method + ' ' + route.path, route);
      for (const [signature, route] of unique) endpoints.push({ project, apiName, signature, route });
    }
    for (const endpoint of endpoints) {
      const targets = [];
      for (const caller of projects) {
        if (caller === endpoint.project) continue;
        if (caller.calls.some(call => routeMatches(endpoint.route, call))) {
          targets.push({ system: caller.name, column: endpoint.signature });
          addOutput(outputs, caller.name, endpoint.apiName);
        }
      }
      objects.push({
        id: stableId('api', endpoint.apiName + ':' + endpoint.signature),
        field: endpoint.signature,
        datatype: 'HTTP endpoint',
        criticality: 'medium',
        source: { system: endpoint.apiName, table: 'HTTP', column: endpoint.signature },
        targets: targets.sort((a, b) => a.system.localeCompare(b.system))
      });
    }
    for (const [key, table] of [...tableMap].sort((a, b) => a[0].localeCompare(b[0]))) {
      const tableSystem = 'Table ' + table.name;
      systems.push({
        name: tableSystem,
        description: table.declarations.length ? 'SQL table declared in ' + table.declarations.map(item => item.file).sort().join(', ') : 'SQL table referenced by analyzed source',
        url: '',
        type: 'datastructure',
        outputs: []
      });
      for (const writer of table.writers) addOutput(outputs, writer, tableSystem);
      for (const reader of table.readers) addOutput(outputs, tableSystem, reader);
      const targets = [...new Set([...table.readers, ...table.writers])].sort().map(system => ({ system, column: table.name }));
      for (const column of [...table.columns.values()].sort((a, b) => a.name.localeCompare(b.name))) {
        objects.push({
          id: stableId('sql', key + ':' + column.name.toLowerCase()),
          field: table.name + '.' + column.name,
          datatype: column.datatype,
          criticality: criticality(column.name),
          source: { system: tableSystem, table: table.name, column: column.name },
          targets
        });
      }
    }
    if (!objects.length && projects.length) {
      const source = projects[0];
      const targets = projects.slice(1).filter(project => project.dependencies.has(source.name)).map(project => ({ system: project.name, column: 'source' }));
      objects.push({
        id: stableId('source', source.name),
        field: source.name + ' source inventory',
        datatype: 'source code',
        criticality: 'low',
        source: { system: source.name, table: source.root || '.', column: 'source' },
        targets
      });
      warnings.push('No SQL columns or HTTP routes were detected; a source inventory object was added because the catalog requires at least one object.');
    }
    const uniqueSystems = new Map();
    for (const system of systems) if (!uniqueSystems.has(system.name)) uniqueSystems.set(system.name, system);
    const names = new Set(uniqueSystems.keys());
    for (const system of uniqueSystems.values()) system.outputs = [...(outputs.get(system.name) || [])].filter(name => names.has(name)).sort();
    return {
      version: 6,
      systems: [...uniqueSystems.values()].sort((a, b) => a.name.localeCompare(b.name)),
      objects: objects.sort((a, b) => a.id.localeCompare(b.id)),
      layouts: { systems: {}, catalog: {}, systemView: { x: 0, y: 0, scale: 1 }, catalogView: { x: 0, y: 0, scale: 1 } }
    };
  }

  function analyze(inputFiles, options) {
    const settings = { projectName: 'Application', includeTests: false, ignore: '', maxFileSize: 1024 * 1024, ...(options || {}) };
    const skipped = [];
    const files = [];
    for (const input of inputFiles || []) {
      const path = normalizePath(input.path || input.webkitRelativePath || input.name);
      const size = Number(input.size == null ? String(input.content || '').length : input.size);
      if (!shouldAnalyzePath(path, settings)) {
        skipped.push({ path, reason: 'ignored or unsupported' });
        continue;
      }
      if (size > settings.maxFileSize) {
        skipped.push({ path, reason: 'larger than ' + settings.maxFileSize + ' bytes' });
        continue;
      }
      if (String(input.content || '').includes('\u0000')) {
        skipped.push({ path, reason: 'binary content' });
        continue;
      }
      files.push({ path, content: String(input.content || ''), size });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    if (!files.length) throw new Error('No supported source files were found.');
    const warnings = [];
    const projects = discoverProjects(files, settings);
    detectDependencies(files, projects);
    const catalog = buildCatalog(projects, files, warnings);
    return {
      catalog,
      report: {
        analyzedFiles: files.length,
        skippedFiles: skipped.length,
        projects: projects.map(project => ({ name: project.name, root: project.root || '.', files: project.files.length })),
        warnings,
        skipped
      }
    };
  }

  function serialize(catalog) {
    return JSON.stringify(catalog, null, 2) + '\n';
  }

  return { analyze, serialize, shouldAnalyzePath, normalizePath };
});
