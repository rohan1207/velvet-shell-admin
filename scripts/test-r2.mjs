import { PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const client = new S3Client({
  region: 'auto',
  endpoint:
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const key = 'products/_healthcheck.txt';

try {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
      Body: Buffer.from('velvet-shell-r2-ok'),
      ContentType: 'text/plain',
    })
  );
  const base = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL.replace(/\/$/, '');
  console.log('UPLOAD_OK', `${base}/${key}`);
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: key,
    })
  );
  console.log('DELETE_OK');
} catch (e) {
  console.error('FAIL', e.name, e.message);
  process.exit(1);
}
