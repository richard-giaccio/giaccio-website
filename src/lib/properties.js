import properties from '../../data/properties.json';
import manifest from '../../data/photo-manifest.json';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function asset(path) {
  if (!path) return null;
  return `${BASE}/${path.replace(/^\//, '')}`;
}

function mapImg(i) {
  return { webp: asset(i.webp), jpg: asset(i.full), thumb: asset(i.thumb), width: i.width, height: i.height };
}

// join listings to their photo set via the exact source_folder key
// house number lives in the source folder as "(#19)"; mls_ref mirrors it
function houseNumber(p) {
  const m = (p.source_folder || '').match(/\(#\s*([^)]+?)\s*\)/);
  if (m) return m[1].trim();
  if (p.mls_ref != null && /^[0-9]/.test(String(p.mls_ref))) return String(p.mls_ref);
  return null;
}

function enrich(p) {
  const entry = manifest[p.source_folder] || {};
  const images = (entry.images || []).map(mapImg);
  // hand-picked overrides (main.jpg / thumb1-3) win; otherwise fall back to numbered photos
  const main = entry.main ? mapImg(entry.main) : images[0] || null;
  const thumbs = (entry.thumbs && entry.thumbs.length ? entry.thumbs.map(mapImg) : images.slice(1)).slice(0, 3);
  const num = houseNumber(p);
  // e.g. "19 Ashwood Road"; falls back to the plain street when there is no number
  const displayAddress = num ? `${num} ${p.address}` : p.address;
  return {
    ...p,
    images,
    main,
    thumbs,
    featured: main,
    hasPhotos: images.length > 0 || !!entry.main,
    displayAddress,
    location: [p.town, p.state].filter(Boolean).join(', '),
  };
}

export function getProperties() {
  return properties.map(enrich);
}

export function getProperty(slug) {
  const p = properties.find((x) => x.slug === slug);
  return p ? enrich(p) : null;
}

export function formatPrice(price) {
  if (price == null || price === '') return null;
  if (typeof price === 'string' && isNaN(Number(price.replace(/[,$]/g, '')))) {
    // words like "rented"
    return price.charAt(0).toUpperCase() + price.slice(1);
  }
  const n = Number(String(price).replace(/[,$]/g, ''));
  return '$' + n.toLocaleString('en-US');
}

export function statusLabel(status) {
  const map = { sold: 'Sold', rented: 'Rented', active: 'For Sale', 'for-rent': 'For Rent' };
  return map[status] || (status ? status : '');
}

// unique towns for the filter, sorted
export function getTowns() {
  const set = new Set(properties.map((p) => p.town).filter(Boolean));
  return [...set].sort();
}
