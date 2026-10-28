// copies country flags (flag-icons, MIT licence) into www/flags so the app shows them offline
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'flag-icons', 'flags', '4x3');
const dst = path.join(__dirname, '..', 'www', 'flags');
fs.mkdirSync(dst, {recursive: true});
const files = fs.readdirSync(src).filter(f => /^[a-z]{2}\.svg$/.test(f));
files.forEach(f => fs.copyFileSync(path.join(src, f), path.join(dst, f)));
console.log('flags copied:', files.length);
