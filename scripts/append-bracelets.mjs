/**
 * APPEND bracelets from docs/bracelets-add.json — does NOT wipe existing.
 * Skips SKUs already in DB. Images: public/final_products_combined/Braceletes/.../<sku>/
 *
 *   node --env-file=.env.local --env-file=admin/.env.local admin/scripts/append-bracelets.mjs
 */
import {
  readFileSync,
  readdirSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, relative } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const jsonPath = join(root, 'docs', 'bracelets-add.json');
const SRC_ROOT = join(root, 'public', 'final_products_combined', 'Braceletes');
const DEST_ROOT = join(root, 'public', 'products', 'bracelets');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

const SWATCH = {
  Silver: '#C5C5C5',
  Gold: '#D4AF64',
  Default: '#C5C5C5',
};

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

function slugify(text = '') {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'item'
  );
}

function natSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function buildFolderIndex(srcRoot) {
  const map = new Map();
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;
      if (!map.has(name)) map.set(name, full);
      walk(full);
    }
  }
  walk(srcRoot);
  return map;
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  function walk(d, depth) {
    for (const name of readdirSync(d)) {
      if (name.startsWith('.')) continue;
      const full = join(d, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isFile() && IMAGE_EXT.test(name)) files.push(full);
      else if (st.isDirectory() && depth < 2) walk(full, depth + 1);
    }
  }
  walk(dir, 0);
  return files.sort((a, b) => natSort(a, b));
}

function attachImages(sku, folderIndex) {
  const srcDir = folderIndex.get(sku);
  if (!srcDir) {
    return { heroUrl: '', gallery: [], missing: true, srcRel: '' };
  }
  const files = listImages(srcDir);
  if (!files.length) {
    return {
      heroUrl: '',
      gallery: [],
      missing: true,
      srcRel: relative(SRC_ROOT, srcDir),
    };
  }
  const destDir = join(DEST_ROOT, sku);
  mkdirSync(destDir, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    copyFileSync(src, join(destDir, name));
    urls.push(`/products/bracelets/${sku}/${name}`);
  });
  return {
    heroUrl: urls[0],
    gallery: urls.map((u, i) => ({ url: u, kind: 'image', sort: i })),
    missing: false,
    srcRel: relative(SRC_ROOT, srcDir),
  };
}

function resolveColour(variant) {
  return String(variant.color || 'Default').trim() || 'Default';
}

function finishLabel(variant, product) {
  const colour = resolveColour(variant).toLowerCase();
  if (colour === 'gold') return '18K Gold Plated';
  if (colour === 'silver' || colour.startsWith('silver')) return 'Sterling Silver';
  return product.material || '925 Sterling Silver';
}

function buildFeatures(product, variant) {
  const feats = [];
  if (variant.sku) feats.push(`SKU ${variant.sku}`);
  if (product.product_id) feats.push(`Code ${product.product_id}`);
  if (product.type) feats.push(product.type);
  if (product.design) feats.push(`Design: ${product.design}`);
  if (product.stone) feats.push(`Stone: ${product.stone}`);
  if (product.material) feats.push(product.material);
  const finish = finishLabel(variant, product);
  if (finish) feats.push(`Finish: ${finish}`);
  const colour = resolveColour(variant);
  if (colour && colour !== 'Default') feats.push(`Colour: ${colour}`);
  return feats;
}

async function existingSkuSet() {
  const fams = await api('/product_families?category=eq.bracelets&select=id');
  const ids = (fams || []).map((f) => f.id);
  if (!ids.length) return new Set();
  const variants = await api(
    `/product_color_variants?family_id=in.(${ids.join(',')})&select=features`,
  );
  const set = new Set();
  for (const v of variants || []) {
    const hit = (v.features || []).find((f) => /^SKU\s+/i.test(String(f)));
    if (hit) set.add(String(hit).replace(/^SKU\s+/i, '').trim().toUpperCase());
  }
  return set;
}

async function importFamily(product, folderIndex, index, existingSkus) {
  const variantsIn = (product.variants || []).filter(
    (v) => Number(v.price_inr) > 0 && String(v.sku || '').trim(),
  );
  if (!variantsIn.length) throw new Error('No priced variants');

  const newVariants = variantsIn.filter(
    (v) => !existingSkus.has(String(v.sku).trim().toUpperCase()),
  );
  if (!newVariants.length) {
    return { skipped: true, reason: 'all SKUs already exist' };
  }

  const colours = [...new Set(newVariants.map((v) => resolveColour(v)))];
  const hasColor = colours.length > 1;
  const name = product.name;
  const familySlug = slugify(`${name}-${product.product_id || index + 1}`);

  const inserted = await api('/product_families', {
    method: 'POST',
    body: {
      slug: familySlug,
      name,
      category: 'bracelets',
      collection_slug: 'the-shell-edit',
      has_color_variants: hasColor,
      has_finish_variants: hasColor,
      shipping: {},
      recommended_family_ids: [],
      badge: product.stone || product.type || '',
      status: 'active',
      active: true,
      updated_at: new Date().toISOString(),
    },
  });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  let imgOk = 0;
  let imgMiss = 0;

  for (let i = 0; i < newVariants.length; i += 1) {
    const v = newVariants[i];
    const colour = resolveColour(v);
    const sku = String(v.sku).trim();
    const imageFolder = String(v.image_folder || sku).trim();
    const variantSlug =
      newVariants.length === 1
        ? familySlug
        : slugify(`${familySlug}-${colour}-${sku}`);
    const finish = finishLabel(v, product);
    const media = attachImages(imageFolder, folderIndex);
    if (media.missing) {
      imgMiss += 1;
      console.warn(`    ! no images for ${imageFolder}`);
    } else {
      imgOk += 1;
    }

    const price = Math.max(0, Number(v.price_inr) || 0);
    const stock = Math.max(0, Number(v.qty ?? 1) || 0);

    await api('/product_color_variants', {
      method: 'POST',
      body: {
        family_id: family.id,
        slug: variantSlug,
        color_label: colour,
        color_swatch: SWATCH[colour] || SWATCH.Default,
        finish_label: finish,
        is_primary: i === 0,
        price,
        description: product.description || '',
        story: '',
        care: '',
        features: buildFeatures(product, { ...v, sku }),
        material: product.material || '925 Sterling Silver',
        length_label: 'One size',
        size_tags: ['One size'],
        reviews: { rating: 0, count: 0, highlights: [] },
        hero_url: media.heroUrl,
        gallery: media.gallery,
        stock,
        out_of_stock: stock <= 0,
        active: true,
        sort_order: i,
        updated_at: new Date().toISOString(),
      },
    });

    existingSkus.add(sku.toUpperCase());
    console.log(
      `    ${colour} · ${sku} · ₹${price} · stock ${stock} · ${media.gallery.length} imgs${
        media.srcRel ? ` ← ${media.srcRel}` : ''
      }`,
    );
  }

  return { skipped: false, imgOk, imgMiss };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (!existsSync(jsonPath)) throw new Error(`Missing ${jsonPath}`);
  if (!existsSync(SRC_ROOT)) throw new Error(`Missing ${SRC_ROOT}`);

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const products = payload.products || [];
  const folderIndex = buildFolderIndex(SRC_ROOT);
  const existingSkus = await existingSkuSet();

  console.log(`Products in file: ${products.length}`);
  console.log(`Existing bracelet SKUs in DB: ${existingSkus.size}`);
  console.log(`Indexed ${folderIndex.size} folders under Braceletes/\n`);

  let ok = 0;
  let skipped = 0;
  let imgOk = 0;
  let imgMiss = 0;

  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    try {
      console.log(
        `+ ${p.name} (${p.product_id}) · ${(p.variants || []).length} variant(s)`,
      );
      const res = await importFamily(p, folderIndex, i, existingSkus);
      if (res.skipped) {
        skipped += 1;
        console.log(`    skip — ${res.reason}`);
      } else {
        ok += 1;
        imgOk += res.imgOk;
        imgMiss += res.imgMiss;
      }
    } catch (err) {
      console.error(`x ${p.name}: ${err.message}`);
    }
  }

  console.log(`\nAdded ${ok} · skipped ${skipped}`);
  console.log(`Variants with images: ${imgOk} · missing: ${imgMiss}`);
  console.log('Next: upload-bracelets-to-r2.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
