// copies the world map (jsVectorMap, MIT licence) into www/ so the app does not depend on a CDN
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'node_modules', 'jsvectormap');
const candidates = ['dist/maps/world.js', 'dist/maps/world-merc.js', 'src/maps/world.js'].map(p => path.join(root, p));
let src = candidates.find(p => fs.existsSync(p));
if (!src) {
  const walk = d => fs.readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  src = walk(root).find(p => /world[^/]*\.js$/.test(p));
}
if (!src) { console.error('world map not found in jsvectormap package'); process.exit(1); }
const txt = fs.readFileSync(src, 'utf8');
if (!/addMap\(/.test(txt)) { console.error('unexpected map format in', src); process.exit(1); }
fs.writeFileSync(path.join(__dirname, '..', 'www', 'world.js'), txt);
console.log('map copied from', path.relative(root, src), (txt.length/1024).toFixed(0) + ' KB');
