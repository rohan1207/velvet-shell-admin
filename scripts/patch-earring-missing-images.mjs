/**
 * Attach images for a few SKUs whose folders are misnamed / flat.
 * Does NOT invent colour mixes — only explicit aliases.
 */
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(root, 'public', 'final_products_combined', 'earrings');
const DEST = join(root, 'public', 'products', 'lotusfun', 'earrings');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

const ALIAS = {
  // Silver folder was saved without the E suffix
  LFJB0324E: join(SRC, 'forget me not pearl dangle earrings', 'LFJB0324'),
  // Single-SKU product: images sit on the product folder (not a colour mix)
  LFJB0288E: join(SRC, 'Flower Dangle Drop Earrings'),
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

async function findVariantId(sku) {
  const fams = await api('/product_families?category=eq.earrings&select=id');
  const ids = (fams || []).map((f) => f.id);
  if (!ids.length) return null;
  const vars = await api(
    `/product_color_variants?family_id=in.(${ids.join(',')})&select=id,slug,features`,
  );
  return (vars || []).find((v) => JSON.stringify(v.features || []).includes(sku)) || null;
}

async function patch(sku, srcDir) {
  const files = listImages(srcDir);
  if (!files.length) {
    console.log('SKIP empty', sku, srcDir);
    return;
  }
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
  const row = await findVariantId(sku);
  if (!row) {
    console.log('NO DB ROW', sku);
    return;
  }
  await api(`/product_color_variants?id=eq.${row.id}`, {
    method: 'PATCH',
    body: {
      hero_url: urls[0],
      gallery,
      updated_at: new Date().toISOString(),
    },
  });
  console.log('OK', sku, urls.length, 'imgs →', row.slug);
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  for (const [sku, dir] of Object.entries(ALIAS)) {
    await patch(sku, dir);
  }
  console.log(`
Still missing (no segregated SKU folders on disk — add them under earrings/):
  LFJA0171A, LFJA0171B  (Succulent — images only at product root, not split by colour)
  LFJB0284A, LFJB0284E  (Large Drop Flower — folder missing)
  LFJA0036C, LFJA0036B2 (Crystal Flower Stud — folder missing)
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
