/* Copies the web app into www/ for the Android build */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const items = ['index.html', 'manifest.webmanifest', 'icon.svg', 'css', 'js', 'vendor', 'fonts', 'icons'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const copy = (s, d) => { const st = fs.statSync(s); if (st.isDirectory()) { fs.mkdirSync(d, { recursive: true }); for (const f of fs.readdirSync(s)) copy(path.join(s, f), path.join(d, f)); } else fs.copyFileSync(s, d); };
for (const it of items) { const s = path.join(root, it); if (fs.existsSync(s)) copy(s, path.join(out, it)); }
console.log('www/ ready');
