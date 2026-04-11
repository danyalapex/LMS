const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const projectRoot = process.cwd();
const targets = [
  path.join(projectRoot, '.next', 'static', 'chunks'),
  path.join(projectRoot, '.next', 'static', 'media'),
  path.join(projectRoot, '.next', 'server', 'chunks'),
  path.join(projectRoot, '.next', 'server'),
];
let allFiles = [];
for (const t of targets) {
  allFiles = allFiles.concat(walk(t));
}

const assets = allFiles.filter((f) => /\.(js|mjs|css)$/.test(f));
if (assets.length === 0) {
  console.log('No build artifacts found. Run `next build` first.');
  process.exit(0);
}

const items = assets
  .map((f) => {
    const s = fs.statSync(f).size;
    return { path: path.relative(projectRoot, f), size: s };
  })
  .sort((a, b) => b.size - a.size);

console.log('Top 25 largest build artifacts:');
items.slice(0, 25).forEach((i) => {
  console.log(`${(i.size / 1024).toFixed(2)} KB\t${i.path}`);
});

const total = items.reduce((s, i) => s + i.size, 0);
console.log(`\nTotal size (listed files): ${(total / 1024).toFixed(2)} KB`);

console.log('\nSuggestions:');
console.log('- Lazy-load heavy admin workspaces (done for major ones).');
console.log('- Replace large icon/font bundles with inline SVGs or tree-shakable icon set.');
console.log('- Virtualize long lists and lazy-load images.');
console.log('- Consider moving large client-only libraries to dynamic imports.');
