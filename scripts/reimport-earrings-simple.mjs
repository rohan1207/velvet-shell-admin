/**
 * Clear earrings + import docs/earrings-simple.json
 * Gold/Silver/Green/Blue = colour variants only (no finish matrix).
 * node --env-file=.env.local scripts/reimport-earrings-simple.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, '..', '..', 'docs', 'earrings-simple.json');

const SWATCH = {
  Gold: '#D4AF64',
  Silver: '#C5C5C5',
  Green: '#2F6B4F',
  Blue: '#4A7BA7',
  Pink: '#E8B4C4',
  White: '#F5F5F5',
  Clear: '#E8EEF2',
  Purple: '#6B3FA0',
  Red: '#A83B3B',
  Default: '#C5C5C5',
};

function slugify(text = '') {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'item'
  );
}

function env(n) {
  return process.env[n] || '';
}

function headers(prefer = 'return=representation') {
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

function base() {
  return `${env('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/rest/v1`;
}

async function api(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: headers(prefer),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${res.status} ${typeof data === 'object' ? JSON.stringify(data) : text}`);
  }
  return data;
}

function materialForColour(product, colour) {
  if (colour === 'Gold') return product.finish || '18K Gold Plated';
  if (colour === 'Silver') return '925 Sterling Silver';
  return product.material || '925 Sterling Silver';
}

function buildFeatures(product, colour) {
  const feats = [];
  if (product.type) feats.push(product.type);
  if (product.design) feats.push(`Design: ${product.design}`);
  if (product.stone) feats.push(`Stone: ${product.stone}`);
  if (product.material) feats.push(product.material);
  if (product.finish) feats.push(`Finish: ${product.finish}`);
  if (product.style) feats.push(`Style: ${product.style}`);
  if (colour) feats.push(`Colour: ${colour}`);
  return feats;
}

async function deleteEarrings() {
  const families = await api('/product_families?category=eq.earrings&select=id');
  const ids = (families || []).map((f) => f.id);
  console.log(`Deleting ${ids.length} earring families…`);
  for (const id of ids) {
    await api(`/product_color_variants?family_id=eq.${id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  if (ids.length) {
    await api('/product_families?category=eq.earrings', {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  return ids.length;
}

async function importOne(product, index) {
  const status =
    product.status === 'draft' ||
    (product.variants || []).some((v) => v.priceEstimated || v.price == null)
      ? 'draft'
      : 'active';

  const variantsIn = (product.variants || []).filter((v) => v.price != null && v.price > 0);
  if (!variantsIn.length) {
    throw new Error('No priced variants');
  }

  const colours = [
    ...new Set(
      variantsIn.map((v) => v.colour || 'Default').filter(Boolean),
    ),
  ];
  const hasColor = colours.length > 1 || (colours[0] && colours[0] !== 'Default');

  const familySlug = slugify(`${product.name}-${index + 1}`);
  const familyRow = {
    slug: familySlug,
    name: product.name,
    category: 'earrings',
    collection_slug: 'the-shell-edit',
    has_color_variants: hasColor,
    shipping: {},
    recommended_family_ids: [],
    badge: product.stone ? String(product.stone) : product.type || '',
    status,
    active: true,
    updated_at: new Date().toISOString(),
  };

  const inserted = await api('/product_families', { method: 'POST', body: familyRow });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  for (let i = 0; i < variantsIn.length; i += 1) {
    const v = variantsIn[i];
    const colour = v.colour || 'Default';
    const variantSlug =
      variantsIn.length === 1
        ? familySlug
        : slugify(`${familySlug}-${colour}`);

    const variantRow = {
      family_id: family.id,
      slug: variantSlug,
      color_label: colour,
      color_swatch: SWATCH[colour] || SWATCH.Default,
      is_primary: i === 0,
      price: Math.max(0, Number(v.price) || 0),
      description: product.description || '',
      features: buildFeatures(product, colour),
      material: materialForColour(product, colour),
      length_label: 'One size',
      reviews: { rating: 0, count: 0, highlights: [] },
      hero_url: '',
      gallery: [],
      stock: Math.max(0, Number(v.stock) || 0),
      out_of_stock: false,
      active: true,
      sort_order: i,
      updated_at: new Date().toISOString(),
    };

    await api('/product_color_variants', { method: 'POST', body: variantRow });
  }

  return { slug: familySlug, status, variants: variantsIn.length };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const products = JSON.parse(readFileSync(jsonPath, 'utf8'));
  console.log(`Importing ${products.length} products from earrings-simple.json`);

  await deleteEarrings();

  let ok = 0;
  const drafts = [];
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    try {
      const res = await importOne(p, i);
      ok += 1;
      if (res.status === 'draft') drafts.push(p.name);
      console.log(`+ [${res.status}] ${p.name} · ${res.variants} colours`);
    } catch (err) {
      console.error(`x ${p.name}: ${err.message}`);
    }
  }

  console.log(`\nDone ${ok}/${products.length}. Drafts (REF/estimated): ${drafts.length}`);
  drafts.forEach((n) => console.log('  draft:', n));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
