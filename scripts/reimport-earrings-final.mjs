/**
 * Wipe ALL earrings, then import docs/earrings-final.csv.
 * Images ONLY from public/final_products_combined/earrings/.../<image_folder>/
 * One variant_id folder → one colour variant. Never mix colours.
 *
 *   node --env-file=.env.local admin/scripts/reimport-earrings-final.mjs
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
const csvPath = join(root, 'docs', 'earrings-final.csv');
const SRC_ROOT = join(root, 'public', 'final_products_combined', 'earrings');
const DEST_ROOT = join(root, 'public', 'products', 'lotusfun', 'earrings');

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

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

/** Parse CSV with quoted fields (handles commas inside quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((c) => String(c).trim())) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((c) => String(c).trim())) rows.push(row);
  }
  if (!rows.length) return [];
  const keys = rows[0].map((k) => String(k).trim());
  return rows.slice(1).map((cols) => {
    const obj = {};
    keys.forEach((k, i) => {
      obj[k] = cols[i] != null ? String(cols[i]).trim() : '';
    });
    return obj;
  });
}

/** Index: variant_id → absolute folder path (exact name match only). */
function buildVariantFolderIndex(srcRoot) {
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
      // Prefer deepest / exact SKU folder names
      if (!map.has(name)) map.set(name, full);
      walk(full);
    }
  }
  walk(srcRoot);
  return map;
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort(natSort)
    .map((n) => join(dir, n));
}

function attachImages(variantId, folderIndex) {
  const srcDir = folderIndex.get(variantId);
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
  const destDir = join(DEST_ROOT, variantId);
  mkdirSync(destDir, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    copyFileSync(src, join(destDir, name));
    urls.push(`/products/lotusfun/earrings/${variantId}/${name}`);
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
  if (l === 'gold') return 0;
  if (l === 'silver') return 1;
  return 10;
}

function buildFeatures(row) {
  const feats = [];
  if (row.variant_id) feats.push(`SKU ${row.variant_id}`);
  if (row.product_code) feats.push(`Code ${row.product_code}`);
  if (row.product_type) feats.push(row.product_type);
  if (row.design) feats.push(`Design: ${row.design}`);
  if (row.stone) feats.push(`Stone: ${row.stone}`);
  if (row.material) feats.push(row.material);
  if (row.finish) feats.push(`Finish: ${row.finish}`);
  if (row.style) feats.push(`Style: ${row.style}`);
  if (row.detail) feats.push(`Detail: ${row.detail}`);
  if (row.color_name) feats.push(`Colour: ${row.color_name}`);
  if (row.color_status === 'VERIFY') feats.push('Needs colour review');
  if (row.review_note) feats.push(`Note: ${row.review_note}`);
  return feats;
}

function materialFor(row) {
  return row.material || row.finish || '925 Sterling Silver';
}

async function deleteAllEarrings() {
  const families = await api(
    '/product_families?category=eq.earrings&select=id,slug',
  );
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

async function importFamily(productCode, rows, folderIndex, index) {
  rows.sort(
    (a, b) =>
      colourPriority(a.color_name) - colourPriority(b.color_name) ||
      String(a.variant_id).localeCompare(String(b.variant_id)),
  );

  const primary = rows[0];
  const name = primary.product_name || productCode;
  const familySlug = slugify(`${name}-${index + 1}`);
  const hasColor = rows.length > 1;

  const familyRow = {
    slug: familySlug,
    name,
    category: 'earrings',
    collection_slug: 'the-shell-edit',
    has_color_variants: hasColor,
    shipping: {},
    recommended_family_ids: [],
    badge:
      primary.color_status === 'VERIFY'
        ? 'Needs review'
        : primary.stone || primary.product_type || '',
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

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const colour = row.color_name || 'Default';
    const hex = row.color_hex || '#C5C5C5';
    const variantId = row.variant_id || row.image_folder;
    const variantSlug =
      rows.length === 1
        ? familySlug
        : slugify(`${familySlug}-${colour}-${variantId}`);

    const media = attachImages(variantId, folderIndex);
    if (media.missing) {
      imgMiss += 1;
      console.warn(`    ! no images for ${variantId}`);
    } else {
      imgOk += 1;
    }

    const price = Math.max(0, Number(row.price) || 0);
    const stock = Math.max(0, Number(row.quantity) || 0);

    await api('/product_color_variants', {
      method: 'POST',
      body: {
        family_id: family.id,
        slug: variantSlug,
        color_label: colour,
        color_swatch: hex,
        is_primary: i === 0,
        price,
        description: row.description || '',
        story: '',
        care: '',
        features: buildFeatures(row),
        material: materialFor(row),
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
      `    ${colour} · ${variantId} · ₹${price} · ${media.gallery.length} imgs${
        media.srcRel ? ` ← ${media.srcRel}` : ''
      }`,
    );
  }

  return { imgOk, imgMiss, variants: rows.length };
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (!existsSync(csvPath)) throw new Error(`Missing ${csvPath}`);
  if (!existsSync(SRC_ROOT)) throw new Error(`Missing ${SRC_ROOT}`);

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  console.log(`CSV rows: ${rows.length}`);
  console.log(`Images root: ${SRC_ROOT}\n`);

  const folderIndex = buildVariantFolderIndex(SRC_ROOT);
  console.log(`Indexed ${folderIndex.size} variant folders under earrings/\n`);

  const byCode = new Map();
  for (const row of rows) {
    const code = row.product_code || row.variant_id;
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }

  const deleted = await deleteAllEarrings();
  console.log(`Cleared ${deleted} old earring families.\n`);

  let ok = 0;
  let imgOk = 0;
  let imgMiss = 0;
  let i = 0;
  for (const [code, group] of byCode) {
    const label = group[0]?.product_name || code;
    try {
      console.log(`+ ${label} (${code}) · ${group.length} colour(s)`);
      const res = await importFamily(code, group, folderIndex, i);
      ok += 1;
      imgOk += res.imgOk;
      imgMiss += res.imgMiss;
    } catch (err) {
      console.error(`x ${label}: ${err.message}`);
    }
    i += 1;
  }

  console.log(`\nDone ${ok}/${byCode.size} products.`);
  console.log(`Variants with images: ${imgOk} · missing: ${imgMiss}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
