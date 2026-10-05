#!/usr/bin/env node
// Builds data/photo-manifest.json image sets from data/records.tsv.
// records.tsv columns: folder, slug, NN, rel_jpg, rel_webp, rel_thumb, width, height
// Preserves existing hand-picked main/thumbs (see apply-picks.mjs). Re-runnable.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RECORDS = path.join(ROOT, 'data', 'records.tsv');
const MANIFEST = path.join(ROOT, 'data', 'photo-manifest.json');

const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const out = {};

for (const line of fs.readFileSync(RECORDS, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [folder, slug, , jpg, webp, thumb, w, h] = line.split('\t');
  if (!out[folder]) {
    out[folder] = { slug, image_count: 0, images: [] };
    // carry over hand-picked overrides from the previous manifest
    if (prev[folder]?.main) out[folder].main = prev[folder].main;
    if (prev[folder]?.thumbs) out[folder].thumbs = prev[folder].thumbs;
  }
  out[folder].images.push({ full: jpg, webp, thumb, width: Number(w), height: Number(h) });
}

for (const e of Object.values(out)) e.image_count = e.images.length;

fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 2) + '\n');
console.log(`Manifest: ${Object.keys(out).length} folders, ${Object.values(out).reduce((n, e) => n + e.images.length, 0)} images.`);
