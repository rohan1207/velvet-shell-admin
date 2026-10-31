/**
 * Upload pendant images to Cloudflare R2 and patch Supabase hero/gallery URLs.
 *
 *   node --env-file=admin/.env.local --env-file=.env.local admin/scripts/upload-pendants-to-r2.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'));
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const LOCAL_ROOT = join(root, 'public', 'products', 'pendants');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

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
  if (!res.ok) {
    throw new Error(
      `${method} ${path}: ${res.status} ${typeof data === 'object' ? JSON.stringify(data) : text}`,
    );
  }
  return data;
}

function mimeFor(ext) {
  const e = ext.toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  if (e === '.avif') return 'image/avif';
  if (e === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

function r2Client() {
  const accountId = required('CLOUDFLARE_ACCOUNT_ID');
  const endpoint =
    env('CLOUDFLARE_R2_ENDPOINT') ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: required('CLOUDFLARE_R2_ACCESS_KEY_ID'),
      secretAccessKey: required('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
    },
  });
}

function listLocalImages(skuDir) {
  if (!existsSync(skuDir)) return [];
  return readdirSync(skuDir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((n) => join(skuDir, n));
}

function skuFromFeatures(features) {
  const hit = (features || []).find((f) => /^SKU\s+/i.test(String(f)));
  return hit ? String(hit).replace(/^SKU\s+/i, '').trim() : '';
}

async function uploadFile(client, bucket, publicBase, key, filePath) {
  const ext = extname(filePath);
  const body = readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeFor(ext),
    }),
  );
  return `${publicBase}/${key}`;
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const bucket = required('CLOUDFLARE_R2_BUCKET');
  const publicBase = required('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  const client = r2Client();

  const fams = await api(
    '/product_families?category=eq.pendants&select=id,slug,name',
  );
  const ids = (fams || []).map((f) => f.id);
  if (!ids.length) {
    console.log('No pendant families');
    return;
  }
  const variants = await api(
    `/product_color_variants?family_id=in.(${ids.join(',')})&select=id,slug,hero_url,gallery,features,color_label`,
  );

  console.log(`pendant variants: ${variants.length}`);
  console.log(`Local images: ${LOCAL_ROOT}\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of variants || []) {
    const sku = skuFromFeatures(v.features);
    if (!sku) {
      skipped += 1;
      continue;
    }
    const files = listLocalImages(join(LOCAL_ROOT, sku));
    if (!files.length) {
      console.warn(`! no local folder for ${sku}`);
      skipped += 1;
      continue;
    }
    try {
      const urls = [];
      for (let i = 0; i < files.length; i += 1) {
        const filePath = files[i];
        const ext = extname(filePath).toLowerCase() || '.jpg';
        const name = `${String(i + 1).padStart(2, '0')}${ext}`;
        const key = `products/pendants/${sku}/${name}`;
        urls.push(await uploadFile(client, bucket, publicBase, key, filePath));
        process.stdout.write('.');
      }
      await api(`/product_color_variants?id=eq.${v.id}`, {
        method: 'PATCH',
        body: {
          hero_url: urls[0],
          gallery: urls.map((url, i) => ({ url, kind: 'image', sort: i })),
          updated_at: new Date().toISOString(),
        },
      });
      ok += 1;
      console.log(`\nOK ${sku} (${v.color_label}) · ${urls.length} → R2`);
    } catch (err) {
      failed += 1;
      console.error(`\nx ${sku}: ${err.message}`);
    }
  }

  console.log(`\nDone. uploaded=${ok} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
