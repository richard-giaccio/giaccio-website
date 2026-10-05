#!/usr/bin/env node
// Rebuild data/properties.json from data/properties.csv.
// Rich bulk-edits the CSV in Excel/Sheets, then runs: node scripts/csv-to-json.js
// Dependency-free. The CSV holds every field, so this is lossless round-trip.
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = path.resolve(__dirname, '..', 'data');
const CSV = path.join(DATA, 'properties.csv');
const OUT = path.join(DATA, 'properties.json');

// column -> JSON type
const NUMERIC = new Set(['price','bedrooms','bathrooms','size_sqft','year_built']);
const BOOL = new Set(['needs_data']);
const LIST = new Set(['flags']);

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r.some(x => x !== ''));
}

function coerce(col, raw) {
  const v = raw == null ? '' : raw.trim();
  if (v === '') return null;
  if (NUMERIC.has(col)) { const n = Number(v); return Number.isNaN(n) ? v : n; }
  if (BOOL.has(col)) return /^(true|1|yes|y)$/i.test(v);
  if (LIST.has(col)) return v.split('|').map(s => s.trim()).filter(Boolean);
  return v;
}

const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
const header = rows.shift().map(h => h.trim());

const out = rows.map(cells => {
  const o = {};
  header.forEach((col, i) => { o[col] = coerce(col, cells[i]); });
  return o;
});

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${out.length} listings to ${path.relative(process.cwd(), OUT)}`);
