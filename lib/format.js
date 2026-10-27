export function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const ACCESSORY_SLUGS = new Set(['brooches', 'chains', 'chokers']);

export function labelCategory(slug, categories = []) {
  const s = String(slug || '');
  if (ACCESSORY_SLUGS.has(s)) {
    const sub =
      s === 'brooches' ? 'Brooches' : s === 'chains' ? 'Chains' : 'Chokers';
    return `Accessories · ${sub}`;
  }
  if (s === 'accessories') return 'Accessories';
  return categories.find((c) => c.slug === slug)?.name || slug;
}

export function isAccessoryCategory(slug) {
  return ACCESSORY_SLUGS.has(String(slug || '')) || slug === 'accessories';
}

export function labelCollection(slug, collections = []) {
  return collections.find((c) => c.slug === slug)?.name || slug;
}
