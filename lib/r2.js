import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function r2Configured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET &&
      process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL
  );
}

function client() {
  allowInsecureTlsIfConfigured();
  const accountId = required('CLOUDFLARE_ACCOUNT_ID');
  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT ||
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

function sanitizeFilename(name = 'file') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'file';
}

function extFrom(fileName, mime) {
  const fromName = fileName.includes('.') ? fileName.split('.').pop() : '';
  if (fromName && /^[a-z0-9]{2,5}$/i.test(fromName)) return fromName.toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/quicktime') return 'mov';
  return 'bin';
}

/**
 * Upload a File/Blob to R2 and return the public URL.
 */
export async function uploadToR2(file, { folder = 'products' } = {}) {
  const bucket = required('CLOUDFLARE_R2_BUCKET');
  const publicBase = required('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  const mime = file.type || 'application/octet-stream';
  const safeName = sanitizeFilename(file.name || 'upload');
  const ext = extFrom(safeName, mime);
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName.replace(/\.[^.]+$/, '')}.${ext}`;

  const body = Buffer.from(await file.arrayBuffer());

  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mime,
      // R2 public bucket URLs don't need ACL; omit for compatibility
    })
  );

  return {
    key,
    url: `${publicBase}/${key}`,
    kind: mime.startsWith('video/') ? 'video' : 'image',
  };
}
