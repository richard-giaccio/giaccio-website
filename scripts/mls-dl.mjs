// Usage: node mls-dl.mjs <urls-file> <target-folder>
// Dedupes GetMedia URLs to one 296px (Size=2) image per photo Number, downloads into folder.
import fs from 'node:fs';
const [urlFile, dir] = process.argv.slice(2);
let raw = fs.readFileSync(urlFile, 'utf8');
// split concatenated URLs
const urls = raw.split(/(?=https:\/\/)/).map(s=>s.trim()).filter(s=>/GetMedia\.ashx\?/i.test(s)).map(s=>s.replace(/&amp;/g,'&'));
const byNum = {};
for (const u of urls) {
  const p = new URL(u).searchParams;
  const num = p.get('Number'); const size = p.get('Size');
  if (num == null) continue;
  if (!byNum[num]) byNum[num] = {};
  byNum[num][size] = u;
}
const nums = Object.keys(byNum).sort((a,b)=>+a-+b);
fs.mkdirSync(dir, { recursive: true });
let n = 0, fail = 0;
for (const num of nums) {
  const u = byNum[num]['2'] || byNum[num]['3'] || byNum[num]['1'] || Object.values(byNum[num])[0];
  const out = `${dir}/mls-${String(+num+1).padStart(2,'0')}.jpg`;
  try {
    const r = await fetch(u);
    if (!r.ok) { fail++; continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 800) { fail++; continue; }
    fs.writeFileSync(out, buf); n++;
  } catch(e){ fail++; }
}
console.log(`${dir.split('/').pop()}: downloaded ${n} photos (${fail} failed) from ${nums.length} unique`);
