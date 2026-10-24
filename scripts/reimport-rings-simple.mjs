/**
 * Clear ALL rings + import docs/rings-simple.json (exact names/prices/SKUs).
 * Attach images from public/Yiwu (rings) — explicit folder map, no mixing.
 *
 * From repo root:
 *   node --env-file=.env.local admin/scripts/reimport-rings-simple.mjs
 */
import { readFileSync, readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const jsonPath = join(root, 'docs', 'rings-simple.json');
const SRC_ROOT = join(root, 'public', 'Yiwu (rings)');
const DEST_ROOT = join(root, 'public', 'products', 'ywje');

const SWATCH = {
  Silver: '#C5C5C5',
  Gold: '#D4AF64',
  'Purple Pearl': '#9B7BB8',
  'Orange Pearl': '#E09A5E',
  'White Pearl': '#F5F0E8',
  Default: '#C5C5C5',
};

/** Exact SKU → source folder under public/Yiwu (rings) */
const SKU_FOLDER = {
  YWJE0025: 'Daisy Rings',
  YWJE0026: 'Leaves Silver Ring Opening Rings',
  YWJE0055: 'Irregular Liquid Streamline Pearl',
  // Mermaid pearl colourways share RS797 pack — same photos for all three colours
  YWJE0125: 'Natural Freshwater Double Pearl Ring',
  YWJE0126: 'Natural Freshwater Double Pearl Ring',
  YWJE0127: 'Natural Freshwater Double Pearl Ring',
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

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort(natSort)
    .map((n) => join(dir, n));
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
  if (product.ringSize) feats.push(`Size: ${product.ringSize}`);
  if (variant.colour) feats.push(`Colour: ${variant.colour}`);
  if (variant.supplierColourCode) feats.push(`Code: ${variant.supplierColourCode}`);
  return feats;
}

function materialFor(product) {
  return product.material || product.finish || '925 Sterling Silver';
}

function sizeTags(product) {
  const raw = String(product.ringSize || 'Adjustable').trim();
  if (!raw) return ['Adjustable'];
  // Keep a single clean pill for Measure row
  if (/resizable|adjustable|one\s*size/i.test(raw)) {
    if (/resizable/i.test(raw)) return ['Resizable'];
    if (/one\s*size/i.test(raw) && /adjustable/i.test(raw)) return ['Adjustable'];
    if (/adjustable/i.test(raw)) return ['Adjustable'];
    if (/one\s*size/i.test(raw)) return ['One size'];
  }
  return [raw];
}

/** Copy Yiwu folder images → /products/ywje/<SKU>/01.ext … return public URLs */
function attachImagesForSku(sku) {
  const folder = SKU_FOLDER[sku];
  if (!folder) return { heroUrl: '', gallery: [] };
  const srcDir = join(SRC_ROOT, folder);
  const files = listImages(srcDir);
  if (!files.length) {
    console.warn(`  ! no images in Yiwu (rings)/${folder} for ${sku}`);
    return { heroUrl: '', gallery: [] };
  }

  const destDir = join(DEST_ROOT, sku);
  mkdirSync(destDir, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    const dest = join(destDir, name);
    copyFileSync(src, dest);
    urls.push(`/products/ywje/${sku}/${name}`);
  });
  return {
    heroUrl: urls[0],
    gallery: urls.map((u, i) => ({ url: u, kind: 'image', sort: i })),
  };
}

async function deleteAllRings() {
  const families = await api('/product_families?category=eq.rings&select=id,slug,name');
  const ids = (families || []).map((f) => f.id);
  console.log(`Deleting ${ids.length} ring families…`);
  for (const id of ids) {
    await api(`/product_color_variants?family_id=eq.${id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  if (ids.length) {
    await api('/product_families?category=eq.rings', {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  return ids.length;
}

async function importOne(product, index) {
  const variantsIn = (product.variants || []).filter((v) => v.price != null && v.price > 0);
  if (!variantsIn.length) throw new Error('No priced variants');

  const colours = [...new Set(variantsIn.map((v) => v.colour || 'Default'))];
  const hasColor = colours.length > 1;

  const familySlug = slugify(`${product.name}-${index + 1}`);
  const familyRow = {
    slug: familySlug,
    name: product.name,
    category: 'rings',
    collection_slug: 'the-shell-edit',
    has_color_variants: hasColor,
    shipping: {},
    recommended_family_ids: [],
    badge: product.stone ? String(product.stone) : product.type || '',
    status: 'active',
    active: true,
    updated_at: new Date().toISOString(),
  };

  const inserted = await api('/product_families', { method: 'POST', body: familyRow });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;
  const tags = sizeTags(product);

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
      length_label: tags[0] || 'Adjustable',
      size_tags: tags,
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
      `    ${colour} · ${sku || 'no-sku'} · ₹${v.price} · ${media.gallery.length} imgs`,
    );
  }

  return { slug: familySlug, variants: variantsIn.length };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (!existsSync(SRC_ROOT)) {
    throw new Error(`Missing image folder: ${SRC_ROOT}`);
  }

  const products = JSON.parse(readFileSync(jsonPath, 'utf8'));
  console.log(`Importing ${products.length} rings from rings-simple.json`);
  console.log(`Images from: public/Yiwu (rings)\n`);

  const deleted = await deleteAllRings();
  console.log(`Cleared ${deleted} old ring families.\n`);

  let ok = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    try {
      console.log(`+ ${p.name}`);
      await importOne(p, i);
      ok += 1;
    } catch (err) {
      console.error(`x ${p.name}: ${err.message}`);
    }
  }

  console.log(`\nDone ${ok}/${products.length} rings.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
