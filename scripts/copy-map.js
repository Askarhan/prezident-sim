// the world map lives in the repo: www/world.js is built from Natural Earth 1:50m by scripts/build_world.py,
// so country outlines match the satellite border lines. Only if it is missing, fall back to the jsVectorMap one.
const fs = require('fs'), path = require('path');
const dst = path.join(__dirname, '..', 'www', 'world.js');
if (fs.existsSync(dst) && fs.statSync(dst).size > 300000) { console.log('www/world.js (Natural Earth) kept,', (fs.statSync(dst).size/1024).toFixed(0) + ' KB'); process.exit(0); }
const root = path.join(__dirname, '..', 'node_modules', 'jsvectormap');
const src = ['dist/maps/world.js', 'src/maps/world.js'].map(p => path.join(root, p)).find(p => fs.existsSync(p));
if (!src) { console.error('world map not found'); process.exit(1); }
fs.writeFileSync(dst, fs.readFileSync(src, 'utf8'));
console.log('fallback map copied from jsvectormap');
