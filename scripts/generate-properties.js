#!/usr/bin/env node
// One-time builder for data/properties.json + data/properties.csv from the
// photo source folders. Slug function byte-matches the photo agent (verified
// against data/run.log). Ongoing edits go through the CSV + csv-to-json.js.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = '/Users/pavan/Downloads/Website Photos rich';
const DATA = path.join(ROOT, 'data');

// --- slug rule (must match photo agent) ---
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// --- non-listing folders to exclude (SCHEMA.md) ---
function isExcluded(name) {
  const n = name.toLowerCase();
  if (n.startsWith('homes on website')) return true;
  if (n.includes('entrance') || n.includes('clubhouse')) return true;
  if (n.includes('front entrance')) return true;
  if (/cedar woods\s*-\s*outside/.test(n)) return true;
  if (/castle hill\s*-\s*listing pics/.test(n)) return true;
  if (/castle hill\s*-\s*outside/.test(n)) return true;
  return false;
}

const WESTCHESTER = new Set([
  'bedford','bedford hills','pound ridge','south salem','armonk','katonah',
  'mt kisco','mount kisco','cross river','goldens bridge','briarcliff manor',
  'waccabuc','rye','harrison','somers','north salem','ridgefield' /* CT, flagged separately */
]);

// --- parse one folder name into fields ---
function parse(name) {
  let type = 'house';
  if (/co-?op/i.test(name)) type = 'co-op';
  else if (/condo/i.test(name)) type = 'condo';
  else if (/townhouse/i.test(name)) type = 'townhouse';

  let status = 'sold';
  if (/for[\s-]?rent|rental/i.test(name)) status = 'for-rent';

  // mls/sequence ref: (#7) or (7)
  let mls_ref = null;
  const m = name.match(/\(#?\s*(\d+)\s*\)/);
  if (m) mls_ref = m[1];

  let address = null, town = null, state = 'NY', county = 'Westchester';
  const flags = [];

  const lower = name.toLowerCase();

  if (/^cedar woods/i.test(name)) {
    // "Cedar Woods - unit 114 (co-op in Goldens Bridge)"
    const unit = name.match(/unit\s+([0-9a-z-]+)/i);
    address = 'Cedar Woods' + (unit ? ' unit ' + unit[1] : '');
    const inTown = name.match(/in\s+([^)]+)\)/i);
    town = inTown ? inTown[1].trim() : null;
  } else if (/^castle hill/i.test(name)) {
    // "Castle Hill - unit 2D - Bedford Hills condo"
    const unit = name.match(/unit\s+([0-9a-z-]+)/i);
    address = 'Castle Hill' + (unit ? ' unit ' + unit[1] : '');
    const tp = name.split(' - ');
    let last = tp[tp.length - 1].replace(/\b(condo|co-?op|townhouse|house)\b/ig, '').trim();
    town = last || null;
  } else if (/^meadows\b/i.test(name)) {
    // "Meadows - 131 Woodcock Knoll" -> complex, municipality unknown
    address = name.replace(/^meadows\s*-\s*/i, 'Meadows ').trim();
    town = null; // The Meadows complex municipality not in name; leave for Rich
    flags.push('town-unknown:the-meadows-complex');
  } else if (/^heritage hills/i.test(name)) {
    // "Heritage Hills - unit 425-D"
    address = name.replace(/\s+-\s+/g, ' ').trim();
    town = null;
    flags.push('town-unknown:heritage-hills-complex');
  } else if (/^oakridge/i.test(name)) {
    // "Oakridge condos - 3 Oakridge Drive"
    const am = name.match(/-\s*(.+)$/);
    address = am ? am[1].trim() : name;
    town = null; // filled from WP merge (South Salem)
  } else {
    // Standard "<Address> (#n) - <Town>[ - <year>]"
    let s = name.replace(/\(#?\s*\d+\s*\)/, '').replace(/\s{2,}/g, ' ').trim();
    const parts = s.split(' - ').map(p => p.trim()).filter(Boolean);
    address = parts[0] ? parts[0].replace(/_/g, "'") : null;
    if (parts.length >= 2) {
      let t = parts[1];
      // drop a trailing standalone year segment
      if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) { /* year, ignore */ }
      // handle "Ridgefield, CT"
      const cm = t.match(/^(.+),\s*([A-Z]{2})$/);
      if (cm) { town = cm[1].trim(); state = cm[2]; }
      else town = t;
    }
  }

  // county / out-of-westchester flag
  if (state !== 'NY') { county = null; flags.push('out-of-state:' + state); }
  else if (town && !WESTCHESTER.has(town.toLowerCase())) {
    flags.push('verify-county:' + town);
  }

  return { address, town, state, county, property_type: type, status, mls_ref, flags };
}

// --- load photo agent ground truth ---
const runlog = fs.readFileSync(path.join(DATA, 'run.log'), 'utf8');
const folderSlug = {}; // source_folder -> slug (authoritative)
runlog.split('\n').forEach(line => {
  const mm = line.match(/^DONE\s+(.+?)\s+\(([a-z0-9-]+)\)\s+->/);
  if (mm) folderSlug[mm[1]] = mm[2];
});

const tsv = fs.existsSync(path.join(DATA, 'records.tsv'))
  ? fs.readFileSync(path.join(DATA, 'records.tsv'), 'utf8') : '';
const featured = {}; // slug -> first image (jpg)
tsv.split('\n').forEach(line => {
  const c = line.split('\t');
  if (c.length >= 4 && !featured[c[1]]) featured[c[1]] = c[3];
});

// --- WP merge: only the confident single-folder match ---
const wp = JSON.parse(fs.readFileSync(path.join(DATA, 'wp-export.json'), 'utf8'));
const wpBySlug = {
  'oakridge-condos-3-oakridge-drive': {
    price: null, status: 'sold', bedrooms: 2, bathrooms: 2, size_sqft: 1312,
    year_built: 1983, heating: 'Heat Pump Air', parking: 'Assigned',
    town: 'South Salem', zip: '10590', property_type: 'condo', needs_data: false,
    wp_id: 40
  }
};

// --- build entries ---
const folders = fs.readdirSync(SRC, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name)
  .filter(n => !isExcluded(n))
  .sort((a, b) => slugify(a).localeCompare(slugify(b)));

const slugAsserts = [];
const rows = folders.map(folder => {
  const slug = slugify(folder);
  if (folderSlug[folder] && folderSlug[folder] !== slug) {
    slugAsserts.push(`MISMATCH ${folder}: fn=${slug} runlog=${folderSlug[folder]}`);
  }
  const p = parse(folder);
  const entry = {
    slug,
    source_folder: folder,
    address: p.address,
    town: p.town,
    state: p.state,
    county: p.county,
    zip: null,
    price: null,
    status: p.status,
    property_type: p.property_type,
    bedrooms: null,
    bathrooms: null,
    size_sqft: null,
    lot_size: null,
    year_built: null,
    heating: null,
    parking: null,
    description: null,
    featured_image: featured[slug] || null,
    mls_ref: p.mls_ref,
    flags: p.flags.length ? p.flags : null,
    needs_data: true,
    source: null
  };
  const w = wpBySlug[slug];
  if (w) {
    for (const k of ['price','bedrooms','bathrooms','size_sqft','year_built','heating','parking','zip','property_type']) {
      if (w[k] != null) entry[k] = w[k];
    }
    if (w.town && !entry.town) entry.town = w.town;
    entry.status = w.status;
    entry.needs_data = false;
    entry.source = 'wp:' + w.wp_id;
  }
  return entry;
});

if (slugAsserts.length) {
  console.error('SLUG MISMATCHES:\n' + slugAsserts.join('\n'));
  process.exit(1);
}

// --- write JSON ---
fs.writeFileSync(path.join(DATA, 'properties.json'), JSON.stringify(rows, null, 2) + '\n');

// --- write CSV (lead columns per spec, then remaining for lossless round-trip) ---
const COLS = ['slug','address','town','price','status','bedrooms','bathrooms',
  'size_sqft','year_built','property_type','needs_data',
  'source_folder','state','county','zip','lot_size','heating','parking',
  'description','featured_image','mls_ref','flags','source'];
function csvCell(v) {
  if (v == null) return '';
  if (Array.isArray(v)) v = v.join('|');
  v = String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
const csv = [COLS.join(',')]
  .concat(rows.map(r => COLS.map(c => csvCell(r[c])).join(',')))
  .join('\n') + '\n';
fs.writeFileSync(path.join(DATA, 'properties.csv'), csv);

const full = rows.filter(r => !r.needs_data).length;
console.log(`listings: ${rows.length}`);
console.log(`full specs: ${full}`);
console.log(`needs_data: ${rows.length - full}`);
console.log(`with images: ${rows.filter(r => r.featured_image).length}`);
console.log(`flagged: ${rows.filter(r => r.flags).length}`);
