/**
 * Wipe ALL anklet families, then import docs/anklets-final.json only.
 * Images: public/final_products_combined/Anklets/<Product Name>/
 * Color-named files (white.png / silver.png / gold.png) become the card hero.
 * SKU may be null — images keyed by product folder / slug.
 *
 *   node --env-file=.env.local --env-file=admin/.env.local admin/scripts/reimport-anklets-final.mjs
 */
import {
  readFileSync,
  readdirSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  statSync,
  rmSync,
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, relative, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const jsonPath = join(root, 'docs', 'anklets-final.json');
const SRC_ROOT = join(root, 'public', 'final_products_combined', 'Anklets');
const DEST_ROOT = join(root, 'public', 'products', 'anklets');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const COLOR_HERO = /^(gold|silver|white)(\.[^.]+)?$/i;

const SWATCH = {
  Gold: '#D4AF64',
  Silver: '#C5C5C5',
  White: '#F5F5F5',
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
  if (!existsSync(srcRoot)) return map;
  for (const name of readdirSync(srcRoot)) {
    if (name.startsWith('.')) continue;
    const full = join(srcRoot, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) map.set(name.toLowerCase(), full);
  }
  return map;
}

function isColorHeroFile(filePath) {
  return COLOR_HERO.test(basename(filePath).toLowerCase());
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isFile() && IMAGE_EXT.test(name)) files.push(full);
  }
  const heroes = files.filter(isColorHeroFile).sort((a, b) => natSort(a, b));
  const rest = files.filter((f) => !isColorHeroFile(f)).sort((a, b) => natSort(a, b));
  return [...heroes, ...rest];
}

function attachImages(folderKey, folderIndex, destSlug) {
  const srcDir =
    folderIndex.get(String(folderKey || '').toLowerCase()) ||
    folderIndex.get(String(destSlug || '').toLowerCase());
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
  const destDir = join(DEST_ROOT, destSlug);
  mkdirSync(destDir, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    copyFileSync(src, join(destDir, name));
    urls.push(`/products/anklets/${destSlug}/${name}`);
  });
  return {
    heroUrl: urls[0],
    gallery: urls.map((u, i) => ({ url: u, kind: 'image', sort: i })),
    missing: false,
    srcRel: relative(SRC_ROOT, srcDir),
    heroFile: basename(files[0]),
  };
}

function resolveColour(variant) {
  return String(variant.color || 'Silver').trim() || 'Silver';
}

function finishLabel(variant, product) {
  const colour = resolveColour(variant).toLowerCase();
  if (/\bgold\b/.test(colour) && !/\bsilver\b/.test(colour)) return '18K Gold Plated';
  if (/\bsilver\b/.test(colour)) return 'Sterling Silver';
  const v = String(product.finish || '').trim();
  if (/18k|gold\s*plated/i.test(v)) return '18K Gold Plated';
  return product.material || '925 Sterling Silver';
}

function buildFeatures(product, variant) {
  const feats = [];
  const sku = String(variant.sku || '').trim();
  if (sku) feats.push(`SKU ${sku}`);
  if (product.product_id) feats.push(`Code ${product.product_id}`);
  if (product.type) feats.push(product.type);
  if (product.design) feats.push(`Design: ${product.design}`);
  if (product.material) feats.push(product.material);
  const finish = finishLabel(variant, product);
  if (finish) feats.push(`Finish: ${finish}`);
  const colour = resolveColour(variant);
  if (colour && colour !== 'Default') feats.push(`Colour: ${colour}`);
  return feats;
}

async function deleteAllAnklets() {
  const families = await api(
    '/product_families?category=eq.anklets&select=id,slug',
  );
  const ids = (families || []).map((f) => f.id);
  console.log(`Deleting ${ids.length} anklet families…`);
  for (const id of ids) {
    await api(`/product_color_variants?family_id=eq.${id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  if (ids.length) {
    await api('/product_families?category=eq.anklets', {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  return ids.length;
}

async function importFamily(product, folderIndex, index) {
  const variantsIn = (product.variants || []).filter(
    (v) => Number(v.price_inr) > 0,
  );
  if (!variantsIn.length) throw new Error('No priced variants');

  const name = product.name;
  const familySlug = slugify(name) || slugify(`anklet-${product.product_id || index + 1}`);
  const folderKey = product.folder || name;

  const inserted = await api('/product_families', {
    method: 'POST',
    body: {
      slug: familySlug,
      name,
      category: 'anklets',
      collection_slug: 'the-shell-edit',
      has_color_variants: false,
      has_finish_variants: false,
      shipping: {},
      recommended_family_ids: [],
      badge: 'Anklet',
      status: 'active',
      active: true,
      updated_at: new Date().toISOString(),
    },
  });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  let imgOk = 0;
  let imgMiss = 0;

  for (let i = 0; i < variantsIn.length; i += 1) {
    const v = variantsIn[i];
    const colour = resolveColour(v);
    const sku = String(v.sku || '').trim();
    const variantSlug =
      variantsIn.length === 1
        ? familySlug
        : slugify(`${familySlug}-${colour}${sku ? `-${sku}` : ''}`);
    const finish = finishLabel(v, product);
    const media = attachImages(folderKey, folderIndex, familySlug);
    if (media.missing) {
      imgMiss += 1;
      console.warn(`    ! no images for ${folderKey}`);
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
        features: buildFeatures(product, { ...v, sku: sku || null }),
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

    console.log(
      `    ${colour} · sku ${sku || 'null'} · ₹${price} · stock ${stock} · ${media.gallery.length} imgs · hero ${media.heroFile || '—'}${
        media.srcRel ? ` ← ${media.srcRel}` : ''
      }`,
    );
  }

  return { imgOk, imgMiss, familySlug };
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

  console.log(`Products: ${products.length}`);
  console.log(`Indexed ${folderIndex.size} folders under Anklets/\n`);

  if (existsSync(DEST_ROOT)) {
    rmSync(DEST_ROOT, { recursive: true, force: true });
    console.log(`Cleared local ${DEST_ROOT}\n`);
  }
  mkdirSync(DEST_ROOT, { recursive: true });

  const deleted = await deleteAllAnklets();
  console.log(`Cleared ${deleted} old anklet families.\n`);

  let ok = 0;
  let imgOk = 0;
  let imgMiss = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    try {
      console.log(
        `+ ${p.name} (${p.product_id}) · folder "${p.folder || p.name}"`,
      );
      const res = await importFamily(p, folderIndex, i);
      ok += 1;
      imgOk += res.imgOk;
      imgMiss += res.imgMiss;
    } catch (err) {
      console.error(`x ${p.name}: ${err.message}`);
    }
  }

  console.log(`\nDone ${ok}/${products.length} products.`);
  console.log(`Variants with images: ${imgOk} · missing: ${imgMiss}`);
  console.log('Next: upload-anklets-to-r2.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
