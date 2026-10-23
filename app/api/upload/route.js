import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';
import { r2Configured, uploadToR2 } from '@/lib/r2';

const MAX_BYTES = 40 * 1024 * 1024; // 40MB

/**
 * Media upload endpoint.
 * - JSON { url, kind }: register an existing public URL
 * - multipart/form-data { file }: upload to Cloudflare R2
 */
export async function POST(request) {
  allowInsecureTlsIfConfigured();
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  // JSON: { url, kind } — paste existing CDN URL
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    const url = String(body.url || '').trim();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    const kind = body.kind === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'image';
    return NextResponse.json({ ok: true, url, kind, source: 'url' });
  }

  if (!r2Configured()) {
    return NextResponse.json(
      {
        error:
          'Cloudflare R2 is not configured. Add CLOUDFLARE_R2_* keys to admin/.env.local (Access Key ID + Secret from R2 → Manage R2 API Tokens).',
        code: 'R2_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string' || !file.arrayBuffer) {
      return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 40MB).' }, { status: 400 });
    }
    const mime = file.type || '';
    if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
      return NextResponse.json({ error: 'Only image or video files are allowed.' }, { status: 400 });
    }

    const folder = String(form.get('folder') || 'products').replace(/[^a-z0-9/_-]/gi, '') || 'products';
    const uploaded = await uploadToR2(file, { folder });

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      key: uploaded.key,
      kind: uploaded.kind,
      source: 'r2',
    });
  } catch (err) {
    console.error('[upload/r2]', err);
    return NextResponse.json(
      { error: err.message || 'Upload to Cloudflare R2 failed.' },
      { status: 500 }
    );
  }
}
