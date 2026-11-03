// Renderiza fórmulas LaTeX a HTML (KaTeX) durante la construcción; la app no necesita JavaScript extra.
const katex = require('katex');
const fs = require('fs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = {};
for (const tex of input) {
  try { out[tex] = katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: 'ignore', output: 'html' }); }
  catch (e) { out[tex] = null; process.stderr.write('No se pudo renderizar: ' + tex.slice(0, 80) + '\n'); }
}
process.stdout.write(JSON.stringify(out));
