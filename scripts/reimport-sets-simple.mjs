/**
 * Clear old sets (+ any families that own SKUs in this dump), then import
 * docs/sets-simple.json. Images ONLY from public/products/ywje/<SKU>/ —
 * one SKU folder per product, never mix LotusFun / other SKUs.
 *
 * From repo root:
 *   node --env-file=.env.local admin/scripts/reimport-sets-simple.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const jsonPath = join(root, 'docs', 'sets-simple.json');
const YWJE_ROOT = join(root, 'public', 'products', 'ywje');

const SWATCH = {
  Silver: '#C5C5C5',
  Gold: '#D4AF64',
  'Silver with Pink Crystal': '#E8B4C4',
  'Silver with Green Leaf Details': '#A8C5A0',
  Default: '#C5C5C5',
};

const CATEGORY_MAP = {
  bracelets: 'bracelets',
  bracelet: 'bracelets',
  sets: 'sets',
  set: 'sets',
  necklaces: 'necklaces',
  necklace: 'necklaces',
  rings: 'rings',
  ring: 'rings',
  earrings: 'earrings',
  earring: 'earrings',
};

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

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
    throw new Error(
      `${method} ${path}: ${res.status} ${typeof data === 'object' ? JSON.stringify(data) : text}`,
    );
  }
  return data;
}

function natSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function normalizeCategory(raw, needsReview) {
  const key = String(raw || '')
    .toLowerCase()
    .trim();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  // Review rows without a category stay under sets so they show in admin
  if (needsReview || !raw) return 'sets';
  return 'sets';
}

function displayName(product, sku) {
  const name = String(product.name || '').trim();
  if (name) return name;
  return `Jewellery Piece ${sku}`;
}

function buildFeatures(product, variant) {
  const feats = [];
  if (variant.sku) feats.push(`SKU ${variant.sku}`);
  if (product.type) feats.push(product.type);
  if (product.design) feats.push(`Design: ${product.design}`);
  if (product.stone) feats.push(`Stone: ${product.stone}`);
  if (product.material) feats.push(product.material);
  if (product.finish) feats.push(`Finish: ${product.finish}`);
  if (product.style) feats.push(`Style: ${product.style}`);
  if (Array.isArray(product.setIncludes) && product.setIncludes.length) {
    feats.push(`Includes: ${product.setIncludes.join(', ')}`);
  }
  if (variant.colour) feats.push(`Colour: ${variant.colour}`);
  if (product.needsReview) feats.push('Needs review');
  return feats;
}

function materialFor(product) {
  return product.material || product.finish || '925 Sterling Silver';
}

/**
 * Images ONLY from public/products/ywje/<SKU>/ — never mix folders.
 */
function attachImagesForSku(sku) {
  const destDir = join(YWJE_ROOT, sku);
  if (!existsSync(destDir)) {
    console.warn(`  ! missing folder products/ywje/${sku}`);
    return { heroUrl: '', gallery: [] };
  }
  const files = readdirSync(destDir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort(natSort);
  if (!files.length) {
    console.warn(`  ! no images in products/ywje/${sku}`);
    return { heroUrl: '', gallery: [] };
  }
  const urls = files.map((name) => `/products/ywje/${sku}/${name}`);
  return {
    heroUrl: urls[0],
    gallery: urls.map((u, i) => ({ url: u, kind: 'image', sort: i })),
  };
}

async function deleteFamily(id) {
  await api(`/product_color_variants?family_id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
  await api(`/product_families?id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}

/** Remove every sets family + any family that owns a SKU from this dump. */
async function clearPrior(skus) {
  const setFamilies = await api(
    '/product_families?category=eq.sets&select=id,slug,name',
  );
  const setIds = new Set((setFamilies || []).map((f) => f.id));

  const variants = await api(
    '/product_color_variants?select=id,family_id,features&limit=5000',
  );
  const skuSet = new Set(skus);
  const familyIds = new Set(setIds);

  for (const v of variants || []) {
    const blob = JSON.stringify(v.features || []);
    for (const sku of skuSet) {
      if (blob.includes(sku)) {
        familyIds.add(v.family_id);
        break;
      }
    }
  }

  console.log(
    `Deleting ${familyIds.size} families (${setIds.size} sets + SKU matches)…`,
  );
  for (const id of familyIds) {
    await deleteFamily(id);
  }
  return familyIds.size;
}

async function importOne(product, index) {
  const variantsIn = (product.variants || []).filter(
    (v) => v.price != null && Number(v.price) > 0,
  );
  if (!variantsIn.length) throw new Error('No priced variants');

  const primarySku = String(variantsIn[0].sku || '').trim() || `ITEM${index + 1}`;
  const name = displayName(product, primarySku);
  const category = normalizeCategory(product.category, product.needsReview);
  const colours = [
    ...new Set(variantsIn.map((v) => v.colour || 'Silver')),
  ];
  const hasColor = colours.length > 1;

  const familySlug = slugify(`${name}-${index + 1}`);
  const familyRow = {
    slug: familySlug,
    name,
    category,
    collection_slug: 'the-shell-edit',
    has_color_variants: hasColor,
    shipping: {},
    recommended_family_ids: [],
    badge: product.needsReview
      ? 'Needs review'
      : product.stone
        ? String(product.stone)
        : product.type || '',
    status: 'active',
    active: true,
    updated_at: new Date().toISOString(),
  };

  const inserted = await api('/product_families', {
    method: 'POST',
    body: familyRow,
  });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  for (let i = 0; i < variantsIn.length; i += 1) {
    const v = variantsIn[i];
    const colour = v.colour || 'Silver';
    const sku = String(v.sku || '').trim();
    const variantSlug =
      variantsIn.length === 1 ? familySlug : slugify(`${familySlug}-${colour}`);

    const media = sku ? attachImagesForSku(sku) : { heroUrl: '', gallery: [] };

    const variantRow = {
      family_id: family.id,
      slug: variantSlug,
      color_label: colour,
      color_swatch: SWATCH[colour] || SWATCH.Default,
      is_primary: i === 0,
      price: Math.max(0, Number(v.price) || 0),
      description: product.description || '',
      story: '',
      care: '',
      features: buildFeatures(product, v),
      material: materialFor(product),
      length_label: 'One size',
      size_tags: ['One size'],
      reviews: { rating: 0, count: 0, highlights: [] },
      hero_url: media.heroUrl,
      gallery: media.gallery,
      stock: Math.max(0, Number(v.stock) || 0),
      out_of_stock: false,
      active: true,
      sort_order: i,
      updated_at: new Date().toISOString(),
    };

    await api('/product_color_variants', { method: 'POST', body: variantRow });
    console.log(
      `    [${category}] ${colour} · ${sku || 'no-sku'} · ₹${v.price} · ${media.gallery.length} imgs`,
    );
  }

  return { slug: familySlug, category, variants: variantsIn.length };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (!existsSync(YWJE_ROOT)) {
    throw new Error(`Missing image root: ${YWJE_ROOT}`);
  }

  const products = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const skus = products
    .flatMap((p) => (p.variants || []).map((v) => String(v.sku || '').trim()))
    .filter(Boolean);

  console.log(`Importing ${products.length} products from sets-simple.json`);
  console.log(`Images ONLY from: public/products/ywje/<SKU>/\n`);

  const deleted = await clearPrior(skus);
  console.log(`Cleared ${deleted} prior families.\n`);

  const byCat = {};
  let ok = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const sku = p.variants?.[0]?.sku || '?';
    const label = p.name || `Jewellery Piece ${sku}`;
    try {
      console.log(`+ ${label}`);
      const res = await importOne(p, i);
      byCat[res.category] = (byCat[res.category] || 0) + 1;
      ok += 1;
    } catch (err) {
      console.error(`x ${label}: ${err.message}`);
    }
  }

  console.log(`\nDone ${ok}/${products.length}.`);
  console.log('By category:', byCat);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
