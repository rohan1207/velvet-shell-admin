/**
 * Clear all earrings families, then import from docs/earrings-import.json
 * Usage (from admin/): node --env-file=.env.local scripts/reimport-earrings.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const jsonPath = join(root, 'docs', 'earrings-import.json');

function slugify(text = '') {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'item'
  );
}

function env(name) {
  return process.env[name] || '';
}

function restHeaders() {
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function baseUrl() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  return `${url.replace(/\/$/, '')}/rest/v1`;
}

async function api(path, { method = 'GET', body, prefer } = {}) {
  const headers = restHeaders();
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
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
    const msg = typeof data === 'object' ? data?.message || data?.error || JSON.stringify(data) : text;
    throw new Error(`${method} ${path}: ${res.status} ${msg}`);
  }
  return data;
}

async function deleteEarrings() {
  const families = await api(
    '/product_families?category=eq.earrings&select=id,slug,name',
  );
  const ids = (families || []).map((f) => f.id);
  console.log(`Found ${ids.length} earring families to delete`);
  if (!ids.length) return 0;

  // Delete variants first (safer if cascade missing), then families
  for (const id of ids) {
    await api(`/product_color_variants?family_id=eq.${id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  await api(`/product_families?category=eq.earrings`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
  return ids.length;
}

async function upsertProduct(product) {
  const familySlug = slugify(product.slug || `${product.name}-${product.familyKey}`);
  const hasColor = !!product.hasColorVariants;
  const hasFinish = !!product.hasFinishVariants;
  const variants = product.variants || [];
  if (!variants.length) throw new Error(`No variants for ${product.name}`);

  // Minimal columns that exist on the live DB (migrations may lag)
  const familyRow = {
    slug: familySlug,
    name: product.name,
    category: 'earrings',
    collection_slug: product.collection || 'the-shell-edit',
    has_color_variants: hasColor || hasFinish,
    shipping: {},
    recommended_family_ids: [],
    badge: product.badge || '',
    status: product.status === 'draft' ? 'draft' : 'active',
    active: true,
    updated_at: new Date().toISOString(),
  };

  const inserted = await api('/product_families', { method: 'POST', body: familyRow });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  for (let i = 0; i < variants.length; i += 1) {
    const v = variants[i];
    const finish = v.finishLabel || '925 Silver';
    const variantSlug = v.sku ? slugify(v.sku) : `${familySlug}-${i + 1}`;
    const features = Array.isArray(v.features) ? [...v.features] : [];
    if (finish && !features.includes(finish)) features.push(finish);
    // When finish_label column is missing, encode metal in color_label for dual-finish SKUs
    let colorLabel = v.colorLabel || 'Default';
    if (hasFinish && (!colorLabel || colorLabel === 'Default')) {
      colorLabel = finish === '18K Gold-Plated' ? 'Gold' : 'Silver';
    }

    const variantRow = {
      family_id: family.id,
      slug: variantSlug,
      color_label: colorLabel,
      color_swatch:
        colorLabel === 'Gold'
          ? '#D4AF64'
          : colorLabel === 'Silver'
            ? '#C5C5C5'
            : v.colorSwatch || '#C5C5C5',
      is_primary: !!v.isPrimary,
      price: Math.max(0, Number(v.price) || 0),
      description: v.description || '',
      features,
      material: finish,
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

    try {
      await api('/product_color_variants', { method: 'POST', body: variantRow });
    } catch (err) {
      throw new Error(`${product.name} / ${v.sku}: ${err.message}`);
    }
  }

  return family.slug;
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const products = payload.products || [];
  console.log(`Importing ${products.length} earring products`);

  const deleted = await deleteEarrings();
  console.log(`Deleted ${deleted} old earring families`);

  let ok = 0;
  const errors = [];
  for (const product of products) {
    try {
      const slug = await upsertProduct(product);
      ok += 1;
      console.log(`+ ${product.name} (${slug}) · ${product.variants.length} variants`);
    } catch (err) {
      errors.push({ name: product.name, error: err.message });
      console.error(`x ${product.name}: ${err.message}`);
    }
  }

  console.log(`\nDone. Imported ${ok}/${products.length}. Errors: ${errors.length}`);
  if (errors.length) console.log(JSON.stringify(errors, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
