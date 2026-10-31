/**
 * Upload Daisy Fine Chain Link piece + set images to Cloudflare R2 and patch DB URLs.
 *
 *   node --env-file=admin/.env.local --env-file=.env.local admin/scripts/upload-daisy-chain-set-to-r2.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'));
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const LOCAL_ROOT = join(root, 'public', 'products');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

const PIECE_SLUGS = [
  'daisy-necklace-with-fine-chain-links-ywje0076',
  'daisy-ring-with-fine-chain-links-ywje0077',
  'daisy-bracelet-with-fine-chain-links-ywje0075',
];
const SET_SLUG = 'daisy-necklace-ring-bracelet-set-with-fine-chain-links-s02';

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

function listLocalImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((n) => join(dir, n));
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

async function uploadFolder(client, bucket, publicBase, category, folder) {
  const files = listLocalImages(join(LOCAL_ROOT, category, folder));
  if (!files.length) throw new Error(`No local images in products/${category}/${folder}`);
  const urls = [];
  for (let i = 0; i < files.length; i += 1) {
    const filePath = files[i];
    const ext = extname(filePath).toLowerCase() || '.jpg';
    const name = `${String(i + 1).padStart(2, '0')}${ext}`;
    const key = `products/${category}/${folder}/${name}`;
    urls.push(await uploadFile(client, bucket, publicBase, key, filePath));
    process.stdout.write('.');
  }
  return urls;
}

async function main() {
  if (env('SUPABASE_INSECURE_TLS') === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const bucket = required('CLOUDFLARE_R2_BUCKET');
  const publicBase = required('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  const client = r2Client();

  console.log('Uploading Daisy Fine Chain pieces + set to R2…\n');

  for (const slug of PIECE_SLUGS) {
    const fams = await api(
      `/product_families?slug=eq.${encodeURIComponent(slug)}&select=id,slug,category`,
    );
    const fam = fams?.[0];
    if (!fam) {
      console.warn(`! missing family ${slug}`);
      continue;
    }
    const variants = await api(
      `/product_color_variants?family_id=eq.${fam.id}&select=id,slug`,
    );
    const v = variants?.[0];
    if (!v) {
      console.warn(`! missing variant for ${slug}`);
      continue;
    }
    const urls = await uploadFolder(client, bucket, publicBase, fam.category, slug);
    await api(`/product_color_variants?id=eq.${v.id}`, {
      method: 'PATCH',
      body: {
        hero_url: urls[0],
        gallery: urls.map((url, i) => ({ url, kind: 'image', sort: i })),
        updated_at: new Date().toISOString(),
      },
    });
    console.log(`\nOK ${fam.category}/${slug} · ${urls.length} → R2`);
  }

  const sets = await api(
    `/product_sets?slug=eq.${encodeURIComponent(SET_SLUG)}&select=id,slug`,
  );
  const set = sets?.[0];
  if (!set) {
    console.warn(`! missing set ${SET_SLUG}`);
  } else {
    const urls = await uploadFolder(client, bucket, publicBase, 'sets', SET_SLUG);
    await api(`/product_sets?id=eq.${set.id}`, {
      method: 'PATCH',
      body: {
        hero_url: urls[0],
        gallery: urls.map((url, i) => ({ url, kind: 'image', sort: i })),
        updated_at: new Date().toISOString(),
      },
    });
    console.log(`\nOK sets/${SET_SLUG} · ${urls.length} → R2`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
