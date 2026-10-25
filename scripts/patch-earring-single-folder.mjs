/**
 * Single-folder products: use the one product folder for the matching colour,
 * deactivate the other colour when photos don't exist for it.
 */
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(root, 'public', 'final_products_combined', 'earrings');
const DEST = join(root, 'public', 'products', 'lotusfun', 'earrings');
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
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return data;
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((n) => join(dir, n));
}

async function earringVariants() {
  const fams = await api('/product_families?category=eq.earrings&select=id');
  const ids = (fams || []).map((f) => f.id);
  if (!ids.length) return [];
  return api(
    `/product_color_variants?family_id=in.(${ids.join(',')})&select=id,slug,color_label,features,family_id,is_primary,active`,
  );
}

function skuOf(row) {
  const f = (row.features || []).find((x) => /^SKU\s+/i.test(String(x)));
  return f ? String(f).replace(/^SKU\s+/i, '').trim() : '';
}

async function attach(sku, srcDir, rows) {
  const files = listImages(srcDir);
  if (!files.length) throw new Error(`No images in ${srcDir}`);
  const dest = join(DEST, sku);
  mkdirSync(dest, { recursive: true });
  const urls = [];
  files.forEach((src, i) => {
    const ext = extname(src).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    copyFileSync(src, join(dest, name));
    urls.push(`/products/lotusfun/earrings/${sku}/${name}`);
  });
  const gallery = urls.map((u, i) => ({ url: u, kind: 'image', sort: i }));
  const row = rows.find((r) => skuOf(r) === sku);
  if (!row) throw new Error(`No DB row for ${sku}`);
  await api(`/product_color_variants?id=eq.${row.id}`, {
    method: 'PATCH',
    body: {
      hero_url: urls[0],
      gallery,
      active: true,
      is_primary: true,
      updated_at: new Date().toISOString(),
    },
  });
  console.log(`OK attach ${sku} ← ${srcDir} (${urls.length} imgs)`);
  return row;
}

async function deactivate(sku, rows) {
  const row = rows.find((r) => skuOf(r) === sku);
  if (!row) {
    console.log(`SKIP deactivate — no row ${sku}`);
    return;
  }
  await api(`/product_color_variants?id=eq.${row.id}`, {
    method: 'PATCH',
    body: {
      active: false,
      is_primary: false,
      updated_at: new Date().toISOString(),
    },
  });
  console.log(`OFF ${sku} (${row.color_label}) — no separate colour folder`);
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  const rows = await earringVariants();

  // Succulent: one product folder, photos are Gold → keep Gold, hide Silver
  const succulentDir = join(SRC, 'Succulent Flower Stud Earring');
  await attach('LFJA0171A', succulentDir, rows);
  await deactivate('LFJA0171B', rows);

  // Ensure family has_color_variants false if only one active colour
  const gold = rows.find((r) => skuOf(r) === 'LFJA0171A');
  if (gold?.family_id) {
    await api(`/product_families?id=eq.${gold.family_id}`, {
      method: 'PATCH',
      body: {
        has_color_variants: false,
        updated_at: new Date().toISOString(),
      },
    });
    console.log('family LFJA0171 → single colour (Gold)');
  }

  console.log(`
Still no folders anywhere under earrings/ for:
  LFJB0284A / LFJB0284E  (Large Drop Flower Earrings)
  LFJA0036C / LFJA0036B2 (Crystal Flower Stud Earrings)
Add a product folder (even one colour) and I can attach them.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
