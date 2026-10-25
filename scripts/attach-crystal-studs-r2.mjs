/**
 * Attach Crystal stud Earrings (LFJA0036*) from final_products_combined → R2 → Supabase.
 */
import { existsSync, readdirSync, readFileSync, copyFileSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(root, 'public', 'final_products_combined', 'earrings', 'Crystal stud Earrings');
const LOCAL = join(root, 'public', 'products', 'lotusfun', 'earrings');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

const SKUS = ['LFJA0036B2', 'LFJA0036C'];

function env(n) {
  return process.env[n] || '';
}
function required(n) {
  const v = env(n);
  if (!v) throw new Error(`Missing ${n}`);
  return v;
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
function mimeFor(ext) {
  const e = ext.toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  if (e === '.avif') return 'image/avif';
  return 'application/octet-stream';
}
function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((n) => join(dir, n));
}
function r2() {
  const accountId = required('CLOUDFLARE_ACCOUNT_ID');
  return new S3Client({
    region: 'auto',
    endpoint:
      env('CLOUDFLARE_R2_ENDPOINT') ||
      `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('CLOUDFLARE_R2_ACCESS_KEY_ID'),
      secretAccessKey: required('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
    },
  });
}

async function findVariant(sku) {
  const fams = await api('/product_families?category=eq.earrings&select=id');
  const ids = (fams || []).map((f) => f.id);
  const vars = await api(
    `/product_color_variants?family_id=in.(${ids.join(',')})&select=id,slug,features,color_label`,
  );
  return (vars || []).find((v) =>
    JSON.stringify(v.features || []).includes(sku),
  );
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  if (!existsSync(SRC)) throw new Error(`Missing ${SRC}`);

  const bucket = required('CLOUDFLARE_R2_BUCKET');
  const publicBase = required('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  const client = r2();

  for (const sku of SKUS) {
    const srcDir = join(SRC, sku);
    const files = listImages(srcDir);
    if (!files.length) {
      console.warn('! no images', sku);
      continue;
    }

    // Keep a local copy under public/products for offline/dev
    const destDir = join(LOCAL, sku);
    mkdirSync(destDir, { recursive: true });

    const urls = [];
    for (let i = 0; i < files.length; i += 1) {
      const src = files[i];
      const ext = extname(src).toLowerCase() || '.jpg';
      const name = `${String(i + 1).padStart(2, '0')}${ext}`;
      copyFileSync(src, join(destDir, name));
      const key = `products/earrings/${sku}/${name}`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: readFileSync(src),
          ContentType: mimeFor(ext),
        }),
      );
      urls.push(`${publicBase}/${key}`);
    }

    const row = await findVariant(sku);
    if (!row) {
      console.warn('! no DB row', sku);
      continue;
    }
    await api(`/product_color_variants?id=eq.${row.id}`, {
      method: 'PATCH',
      body: {
        hero_url: urls[0],
        gallery: urls.map((url, i) => ({ url, kind: 'image', sort: i })),
        active: true,
        updated_at: new Date().toISOString(),
      },
    });
    console.log(`OK ${sku} (${row.color_label}) · ${urls.length} → R2`);
    console.log(' ', urls[0]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
