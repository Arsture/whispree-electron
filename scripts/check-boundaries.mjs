import fs from 'node:fs';
import path from 'node:path';

const root = process.env.BOUNDARY_ROOT ? path.resolve(process.env.BOUNDARY_ROOT) : process.cwd();
const sourceRoots = [
  {
    name: 'shared',
    dir: path.join(root, 'src/shared'),
    forbidden: [
      /^electron$/,
      /^node:/,
      /^(fs|path|os|child_process|worker_threads)$/,
      /(^|\/)src\/main(\/|$)/,
      /(^|\/)src\/renderer(\/|$)/,
      /(^|\/)src\/preload(\/|$)/,
      /(^|\/)src\/adapters?(\/|$)/,
    ],
  },
  {
    name: 'renderer',
    dir: path.join(root, 'src/renderer'),
    forbidden: [
      /^electron$/,
      /^node:/,
      /^(fs|path|os|child_process|worker_threads)$/,
      /(^|\/)src\/main(\/|$)/,
      /(^|\/)src\/preload(\/|$)/,
      /(^|\/)src\/adapters?(\/|$)/,
    ],
  },
  {
    name: 'preload',
    dir: path.join(root, 'src/preload'),
    forbidden: [
      /^node:/,
      /^(fs|path|os|child_process|worker_threads|shelljs)$/,
      /(^|\/)src\/main(\/|$)/,
      /(^|\/)src\/renderer(\/|$)/,
      /(^|\/)src\/adapters?(\/|$)/,
    ],
  },
];

const importPattern = /(?:import(?:\s+type)?(?:[\s\S]*?)from\s*['"]([^'"]+)['"]|export(?:\s+type)?(?:\s+\{[\s\S]*?\}|\s+\*)\s+from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && extensions.has(path.extname(entry.name))) return [fullPath];
    return [];
  });
}

function normalizeSpecifier(specifier, filePath) {
  if (specifier.startsWith('.')) {
    const resolved = path.normalize(path.resolve(path.dirname(filePath), specifier));
    return path.relative(root, resolved).replaceAll(path.sep, '/');
  }
  return specifier;
}

const violations = [];
for (const sourceRoot of sourceRoots) {
  for (const filePath of walk(sourceRoot.dir)) {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const rawSpecifier = match[1] ?? match[2] ?? match[3] ?? match[4];
      const normalized = normalizeSpecifier(rawSpecifier, filePath);
      if (sourceRoot.forbidden.some((rule) => rule.test(normalized))) {
        violations.push({
          area: sourceRoot.name,
          file: path.relative(root, filePath),
          import: rawSpecifier,
          normalized,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Boundary violations detected:');
  for (const violation of violations) {
    console.error(`- [${violation.area}] ${violation.file} imports ${violation.import} (${violation.normalized})`);
  }
  process.exit(1);
}

console.log('Boundary checks passed for src/shared, src/renderer, and src/preload.');
