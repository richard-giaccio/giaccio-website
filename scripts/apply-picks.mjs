#!/usr/bin/env node
// Applies hand-picked "main" and "thumb1/2/3" images per property.
// Pavan renames chosen originals to main.jpg / thumb1.jpg / thumb2.jpg / thumb3.jpg
// inside each folder under SOURCE_BASE. This optimizes them into the site's asset
// folder and records them in photo-manifest.json (main + thumbs). Re-runnable.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SOURCE_BASE = path.join(os.homedir(), 'Downloads', 'Website Photos rich');
const ASSET_BASE = path.join(ROOT, 'public', 'assets', 'properties');
const MANIFEST = path.join(ROOT, 'data', 'photo-manifest.json');
const ROLE_RE = /^(main|thumb1|thumb2|thumb3)\.(jpe?g|png|webp|heic)$/i;

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const q = (s) => `"${s.replace(/"/g, '\\"')}"`;

function gen(src, outDir, base) {
  const jpg = path.join(outDir, `${base}.jpg`);
  const webp = path.join(outDir, `${base}.webp`);
  const thumb = path.join(outDir, `${base}-thumb.webp`);
  execSync(`magick ${q(src)} -auto-orient -resize "1600x1600>" -strip -interlace JPEG -quality 82 ${q(jpg)}`);
  execSync(`magick ${q(src)} -auto-orient -resize "1600x1600>" -strip -quality 80 ${q(webp)}`);
  execSync(`magick ${q(src)} -auto-orient -resize "640x640>" -strip -quality 78 ${q(thumb)}`);
  const [w, h] = execSync(`magick identify -format "%w %h" ${q(jpg)}`).toString().trim().split(' ').map(Number);
  const rel = (f) => path.relative(path.join(ROOT, 'public'), f); // web-root relative: assets/...
  return { full: rel(jpg), webp: rel(webp), thumb: rel(thumb), width: w, height: h };
}

let mains = 0, thumbs = 0, folders = 0;
for (const [folder, entry] of Object.entries(manifest)) {
  const srcDir = path.join(SOURCE_BASE, folder);
  if (!fs.existsSync(srcDir)) continue;
  const picks = {};
  for (const f of fs.readdirSync(srcDir)) {
    const m = f.match(ROLE_RE);
    if (m) picks[m[1].toLowerCase()] = path.join(srcDir, f);
  }
  if (!Object.keys(picks).length) continue;
  const outDir = path.join(ASSET_BASE, entry.slug);
  fs.mkdirSync(outDir, { recursive: true });
  folders++;

  if (picks.main) { entry.main = gen(picks.main, outDir, 'main'); mains++; }
  const t = [];
  for (const key of ['thumb1', 'thumb2', 'thumb3']) {
    if (picks[key]) { t.push(gen(picks[key], outDir, key)); thumbs++; }
  }
  if (t.length) entry.thumbs = t;
  console.log(`${entry.slug}: main=${!!picks.main} thumbs=${t.length}`);
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nDone. ${folders} folders updated, ${mains} main images, ${thumbs} thumbs. Run "npm run build".`);
