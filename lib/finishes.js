/**
 * Metal finish axis (not gem/stone colour).
 * Keep in sync with storefront `lib/catalog/finishes.js`.
 */

export const FINISH_OPTIONS = [
  {
    id: '925-silver',
    label: '925 Silver',
    material: '925 Silver',
    swatch: '#C5C5C5',
  },
  {
    id: '18k-gold-plated',
    label: '18K Gold-Plated',
    material: '18K Gold-Plated',
    swatch: '#D4AF64',
  },
];

export const FINISH_LABELS = FINISH_OPTIONS.map((f) => f.label);

export const GEM_COLOR_PRESETS = [
  { label: 'Green', swatch: '#2F6B4F' },
  { label: 'Purple', swatch: '#6B3FA0' },
  { label: 'White', swatch: '#F5F5F5' },
  { label: 'Pink', swatch: '#E8B4C4' },
  { label: 'Clear', swatch: '#E8EEF2' },
  { label: 'Blue', swatch: '#4A7BA7' },
  { label: 'Red', swatch: '#A83B3B' },
  { label: 'Black', swatch: '#2D2B2B' },
];

const METAL_AS_COLOR =
  /^(silver|gold|sterling\s*silver|18k(\s*gold)?(\s*plated)?|925(\s*silver)?|s925)$/i;

export function isMetalColorLabel(label = '') {
  return METAL_AS_COLOR.test(String(label || '').trim());
}

export function normalizeFinishLabel(value = '', material = '', colorLabel = '') {
  const raw = String(value || '').trim();
  if (raw) {
    const hit = FINISH_OPTIONS.find(
      (f) => f.label.toLowerCase() === raw.toLowerCase() || f.id === raw.toLowerCase(),
    );
    if (hit) return hit.label;
    if (/\bgold\b/i.test(raw)) return '18K Gold-Plated';
    if (/silver|925|sterling/i.test(raw)) return '925 Silver';
    return raw;
  }

  const hay = `${material} ${colorLabel}`.toLowerCase();
  if (/\bgold\b/.test(hay) && !/\bsilver\b|925|sterling/.test(hay)) {
    return '18K Gold-Plated';
  }
  if (/silver|925|sterling/.test(hay)) return '925 Silver';
  return '925 Silver';
}

export function isRealGemColor(label = '') {
  const l = String(label || '').trim();
  if (!l || l.toLowerCase() === 'default') return false;
  return !isMetalColorLabel(l);
}
