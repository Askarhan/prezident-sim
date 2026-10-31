// three.js for the 3D battlefield: the module build and the glTF loader go to www/lib/three
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'node_modules', 'three');
const dst = path.join(__dirname, '..', 'www', 'lib', 'three');
const files = [['build/three.module.min.js', 'three.module.min.js'], ['build/three.core.min.js', 'three.core.min.js'], ['examples/jsm/loaders/GLTFLoader.js', 'GLTFLoader.js'], ['examples/jsm/utils/BufferGeometryUtils.js', 'BufferGeometryUtils.js']];
fs.mkdirSync(dst, {recursive: true});
for (const [src, out] of files){
  const p = path.join(root, src); if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, 'utf8');
  if (out === 'GLTFLoader.js') s = s.replace("'../utils/BufferGeometryUtils.js'", "'./BufferGeometryUtils.js'");
  fs.writeFileSync(path.join(dst, out), s); console.log('three:', out, (s.length/1024).toFixed(0) + ' KB');
}
