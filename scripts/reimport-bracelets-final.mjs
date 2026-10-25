/**
 * Wipe ALL bracelets, then import docs/bracelets-final.json.
 * Images from public/final_products_combined/Braceletes/.../<sku>/
 *
 *   node --env-file=.env.local admin/scripts/reimport-bracelets-final.mjs
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
const jsonPath = join(root, 'docs', 'bracelets-final.json');
const SRC_ROOT = join(root, 'public', 'final_products_combined', 'Braceletes');
const DEST_ROOT = join(root, 'public', 'products', 'bracelets');

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

const SWATCH = {
  Silver: '#C5C5C5',
  Gold: '#D4AF64',
  'Rose Gold': '#B76E79',
  'White Stone': '#F5F0E8',
  'Purple Stone': '#9B7BB8',
  'Silver with White Pearl': '#F5F0E8',
  'Silver with Grey Pearl': '#A8A29E',
  'Silver with Pink Accent': '#E8A0BF',
  'Silver with Green Accent': '#7A9E7E',
  'Silver with White Accent': '#F5F0E8',
  'Silver with Pink Stone Accent': '#E8A0BF',
  'Silver with Green Stone Accent': '#7A9E7E',
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

/** Collect images in dir and one level of nested folders (SKU packs sometimes nest). */
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

function colourPriority(label) {
  const l = String(label || '').toLowerCase();
  if (l === 'gold' || l.startsWith('gold')) return 0;
  if (l.includes('rose gold')) return 1;
  if (l === 'silver' || l.startsWith('silver')) return 2;
  return 10;
}

function resolveColour(variant) {
  return String(variant.color || 'Default').trim() || 'Default';
}

function finishLabel(variant, product) {
  const v = String(variant.finish || product.finish || '').trim();
  if (/18k|gold\s*plated/i.test(v)) return '18K Gold Plated';
  if (/rhodium/i.test(v)) return 'Rhodium Plated';
  if (/^silver$/i.test(v)) return 'Sterling Silver';
  const colour = resolveColour(variant).toLowerCase();
  if (colour === 'gold' || colour.includes('rose gold')) return '18K Gold Plated';
  if (colour === 'silver' || colour.startsWith('silver')) return 'Sterling Silver';
  return v || product.material || '925 Sterling Silver';
}

function sizeTags(variant) {
  const raw = String(variant.length || '').trim();
  if (!raw) return ['One size'];
  return [raw];
}

function buildFeatures(product, variant) {
  const feats = [];
  if (variant.sku) feats.push(`SKU ${variant.sku}`);
  if (product.product_id) feats.push(`Code ${product.product_id}`);
  if (product.type) feats.push(product.type);
  if (product.design) feats.push(`Design: ${product.design}`);
  if (product.stone) feats.push(`Stone: ${product.stone}`);
  if (product.style) feats.push(`Style: ${product.style}`);
  if (product.material) feats.push(product.material);
  const finish = finishLabel(variant, product);
  if (finish) feats.push(`Finish: ${finish}`);
  const colour = resolveColour(variant);
  if (colour && colour !== 'Default') feats.push(`Colour: ${colour}`);
  if (variant.length) feats.push(`Length: ${variant.length}`);
  return feats;
}

async function deleteAllBracelets() {
  const families = await api(
    '/product_families?category=eq.bracelets&select=id,slug',
  );
  const ids = (families || []).map((f) => f.id);
  console.log(`Deleting ${ids.length} bracelet families…`);
  for (const id of ids) {
    await api(`/product_color_variants?family_id=eq.${id}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  if (ids.length) {
    await api('/product_families?category=eq.bracelets', {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }
  return ids.length;
}

async function importFamily(product, folderIndex, index) {
  const variantsIn = (product.variants || []).filter(
    (v) => Number(v.price_inr) > 0 && String(v.sku || '').trim(),
  );
  if (!variantsIn.length) throw new Error('No priced variants');

  variantsIn.sort(
    (a, b) =>
      colourPriority(resolveColour(a)) - colourPriority(resolveColour(b)) ||
      String(a.sku).localeCompare(String(b.sku)),
  );

  const colours = [...new Set(variantsIn.map((v) => resolveColour(v)))];
  const hasColor = colours.length > 1;
  const name = product.name;
  const familySlug = slugify(`${name}-${index + 1}`);

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

  for (let i = 0; i < variantsIn.length; i += 1) {
    const v = variantsIn[i];
    const colour = resolveColour(v);
    const sku = String(v.sku).trim();
    const imageFolder = String(v.image_folder || sku).trim();
    const variantSlug =
      variantsIn.length === 1
        ? familySlug
        : slugify(`${familySlug}-${colour}-${sku}`);
    const tags = sizeTags(v);
    const finish = finishLabel(v, product);
    const media = attachImages(imageFolder, folderIndex);
    if (media.missing) {
      imgMiss += 1;
      console.warn(`    ! no images for ${imageFolder}`);
    } else {
      imgOk += 1;
    }

    const price = Math.max(0, Number(v.price_inr) || 0);
    // Missing qty in source → default 1 so pieces stay sellable
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
        length_label: tags[0] || 'One size',
        size_tags: tags,
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
      `    ${colour} · ${sku} · ₹${price} · stock ${stock} · ${media.gallery.length} imgs${
        media.srcRel ? ` ← ${media.srcRel}` : ''
      }`,
    );
  }

  return { imgOk, imgMiss };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (!existsSync(jsonPath)) throw new Error(`Missing ${jsonPath}`);
  if (!existsSync(SRC_ROOT)) throw new Error(`Missing ${SRC_ROOT}`);

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const products = payload.products || [];
  console.log(`Products: ${products.length}`);
  console.log(`Images root: ${SRC_ROOT}\n`);

  const folderIndex = buildFolderIndex(SRC_ROOT);
  console.log(`Indexed ${folderIndex.size} folders under Braceletes/\n`);

  const deleted = await deleteAllBracelets();
  console.log(`Cleared ${deleted} old bracelet families.\n`);

  let ok = 0;
  let imgOk = 0;
  let imgMiss = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    try {
      console.log(
        `+ ${p.name} (${p.product_id}) · ${(p.variants || []).length} variant(s)`,
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
  console.log('Next: upload-bracelets-to-r2.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
