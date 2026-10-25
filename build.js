#!/usr/bin/env node
/**
 * Optional build script to bundle js/*.js modules into a single dist/app.bundle.js
 * Run with: node build.js
 */

const fs = require('fs');
const path = require('path');

const moduleOrder = [
  'state.js',
  'utils.js',
  'parser.js',
  'dates.js',
  'categories.js',
  'table.js',
  'filters.js',
  'charts.js',
  'export.js',
  'settings.js',
  'app.js'
];

let bundle = '/**\n * Ledgerly - Bundled Application\n * Generated automatically from js/*.js modules\n */\n\n(function() {\n  "use strict";\n\n';

for (const mod of moduleOrder) {
  const filePath = path.join(__dirname, 'js', mod);
  let content = fs.readFileSync(filePath, 'utf8');

  // Strip ES module imports
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\r?\n?/gm, '');

  // Strip "export default" and "export "
  content = content.replace(/^export\s+default\s+/gm, '');
  content = content.replace(/^export\s+(async\s+function|function|const|let|var)\s+/gm, '$1 ');

  bundle += `  // ── Module: js/${mod} ──\n`;
  bundle += content.split('\n').map(line => '  ' + line).join('\n') + '\n\n';
}

bundle += '})();\n';

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
const outPath = path.join(distDir, 'app.bundle.js');
fs.writeFileSync(outPath, bundle, 'utf8');
console.log(`✓ Successfully bundled js/*.js modules into ${outPath}`);
