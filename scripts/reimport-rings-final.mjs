/**
 * Wipe ALL rings, then import docs/rings-final.json.
 * Images ONLY from public/final_products_combined/Rings/.../<image_folder>/
 * One SKU folder → one colour variant. Never mix colours.
 *
 *   node --env-file=.env.local admin/scripts/reimport-rings-final.mjs
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
const jsonPath = join(root, 'docs', 'rings-final.json');
const SRC_ROOT = join(root, 'public', 'final_products_combined', 'Rings');
const DEST_ROOT = join(root, 'public', 'products', 'rings');

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

const SWATCH = {
  Silver: '#C5C5C5',
  Gold: '#D4AF64',
  Pink: '#E8A0BF',
  Green: '#7A9E7E',
  'Purple Pearl': '#9B7BB8',
  'Orange Pearl': '#E09A5E',
  'White Pearl': '#F5F0E8',
  'Silver with Gold-Toned Accent': '#C9B896',
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

/** Index: folderName → [{ path, parentName }] (supports duplicate SKU folder names). */
function buildFolderIndex(srcRoot) {
  const map = new Map();
  function walk(dir, parentName = '') {
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
      if (!map.has(name)) map.set(name, []);
      map.get(name).push({ path: full, parentName });
      walk(full, name);
    }
  }
  walk(srcRoot);
  return map;
}

function pickFolder(entries, folderHint, productName) {
  if (!entries?.length) return null;
  if (entries.length === 1) return entries[0];
  const hint = String(folderHint || productName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!hint) return entries[0];
  const tokens = hint.split(/\s+/).filter((t) => t.length > 2);
  let best = entries[0];
  let bestScore = -1;
  for (const e of entries) {
    const parent = String(e.parentName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ');
    const score = tokens.reduce((s, t) => s + (parent.includes(t) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort(natSort)
    .map((n) => join(dir, n));
}

function attachImages(destKey, imageFolder, folderIndex, folderHint, productName) {
  const entries = folderIndex.get(imageFolder) || [];
  const picked = pickFolder(entries, folderHint, productName);
  if (!picked) {
    return { heroUrl: '', gallery: [], missing: true, srcRel: '' };
  }
  const files = listImages(picked.path);
  if (!files.length) {
    return {
      heroUrl: '',
      gallery: [],
      missing: true,
      srcRel: relative(SRC_ROOT, picked.path),
    };
  }
  const destDir = join(DEST_ROOT, destKey);
  mkdirSync(destDir, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    copyFileSync(src, join(destDir, name));
    urls.push(`/products/rings/${destKey}/${name}`);
  });
  return {
    heroUrl: urls[0],
    gallery: urls.map((u, i) => ({ url: u, kind: 'image', sort: i })),
    missing: false,
    srcRel: relative(SRC_ROOT, picked.path),
  };
}

function colourPriority(label) {
  const l = String(label || '').toLowerCase();
  if (l === 'gold') return 0;
  if (l.startsWith('gold')) return 1;
  if (l === 'silver') return 2;
  if (l.startsWith('silver')) return 3;
  return 10;
}

function resolveColour(variant, product) {
  const raw = String(variant.color || '').trim();
  if (raw) return raw;
  const finish = String(variant.finish || product.finish || '').toLowerCase();
  if (/\bgold\b/.test(finish) && !/\bsilver\b/.test(finish)) return 'Gold';
  if (/\bsilver\b/.test(finish)) return 'Silver';
  return 'Default';
}

function finishLabel(variant, product) {
  const v = String(variant.finish || '').trim();
  if (v) {
    if (/^gold$/i.test(v)) return '18K Gold Plated';
    if (/gold\s*plated/i.test(v)) return '18K Gold Plated';
    if (/^silver$/i.test(v)) return 'Sterling Silver';
    return v;
  }
  const colour = resolveColour(variant, product).toLowerCase();
  if (colour === 'gold') return '18K Gold Plated';
  if (colour === 'silver') return 'Sterling Silver';
  return String(product.finish || product.material || '').trim() || '925 Sterling Silver';
}

function sizeTags(variant, product) {
  const raw = String(variant.ring_size || '').trim();
  if (!raw) return ['One size'];
  if (/resizable/i.test(raw)) return ['Resizable'];
  if (/one\s*size/i.test(raw) && /adjustable/i.test(raw)) return ['Adjustable'];
  if (/adjustable/i.test(raw)) return ['Adjustable'];
  if (/one\s*size/i.test(raw)) return ['One size'];
  return [raw];
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
  const colour = resolveColour(variant, product);
  if (colour && colour !== 'Default') feats.push(`Colour: ${colour}`);
  const size = String(variant.ring_size || '').trim();
  if (size) feats.push(`Size: ${size}`);
  return feats;
}

function materialFor(product, variant) {
  return (
    product.material ||
    finishLabel(variant, product) ||
    '925 Sterling Silver'
  );
}

async function deleteAllRings() {
  const families = await api('/product_families?category=eq.rings&select=id,slug');
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

async function importFamily(product, folderIndex, index) {
  const variantsIn = (product.variants || []).filter(
    (v) => Number(v.price_inr) > 0 && String(v.sku || '').trim(),
  );
  if (!variantsIn.length) throw new Error('No priced variants');

  variantsIn.sort(
    (a, b) =>
      colourPriority(resolveColour(a, product)) -
        colourPriority(resolveColour(b, product)) ||
      String(a.sku).localeCompare(String(b.sku)),
  );

  const colours = [...new Set(variantsIn.map((v) => resolveColour(v, product)))];
  const finishes = [
    ...new Set(variantsIn.map((v) => finishLabel(v, product))),
  ];
  const hasColor = colours.length > 1;
  const hasFinish = finishes.length > 1;

  const name = product.name || product.product_id;
  const familySlug = slugify(`${name}-${index + 1}`);
  // Keep on existing collection; product.collection is display-only metadata.
  const collection = 'the-shell-edit';

  const familyRow = {
    slug: familySlug,
    name,
    category: 'rings',
    collection_slug: collection,
    has_color_variants: hasColor,
    has_finish_variants: hasFinish,
    shipping: {},
    recommended_family_ids: [],
    badge: product.stone || product.type || '',
    status: 'active',
    active: true,
    updated_at: new Date().toISOString(),
  };

  const inserted = await api('/product_families', {
    method: 'POST',
    body: familyRow,
  });
  const family = Array.isArray(inserted) ? inserted[0] : inserted;

  let imgOk = 0;
  let imgMiss = 0;

  for (let i = 0; i < variantsIn.length; i += 1) {
    const v = variantsIn[i];
    const colour = resolveColour(v, product);
    const sku = String(v.sku).trim();
    const imageFolder = String(v.image_folder || sku).trim();
    const destKey = sku;
    const variantSlug =
      variantsIn.length === 1
        ? familySlug
        : slugify(`${familySlug}-${colour}-${sku}`);
    const tags = sizeTags(v, product);
    const finish = finishLabel(v, product);

    const media = attachImages(
      destKey,
      imageFolder,
      folderIndex,
      v.folder_hint,
      product.name,
    );
    if (media.missing) {
      imgMiss += 1;
      console.warn(`    ! no images for ${imageFolder} (${sku})`);
    } else {
      imgOk += 1;
    }

    const price = Math.max(0, Number(v.price_inr) || 0);
    const stock = Math.max(0, Number(v.qty) || 0);

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
        features: buildFeatures(product, v),
        material: materialFor(product, v),
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

  return { imgOk, imgMiss, variants: variantsIn.length };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (!existsSync(jsonPath)) throw new Error(`Missing ${jsonPath}`);
  if (!existsSync(SRC_ROOT)) throw new Error(`Missing ${SRC_ROOT}`);

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const products = (payload.products || []).filter((p) => p.name);
  console.log(`Products: ${products.length} (skipped unnamed)`);
  console.log(`Images root: ${SRC_ROOT}\n`);

  const folderIndex = buildFolderIndex(SRC_ROOT);
  console.log(`Indexed ${folderIndex.size} variant folder names under Rings/\n`);

  const deleted = await deleteAllRings();
  console.log(`Cleared ${deleted} old ring families.\n`);

  let ok = 0;
  let imgOk = 0;
  let imgMiss = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    try {
      console.log(`+ ${p.name} (${p.product_id}) · ${(p.variants || []).length} variant(s)`);
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
  console.log('Next: upload images to R2 with upload-rings-to-r2.mjs');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
