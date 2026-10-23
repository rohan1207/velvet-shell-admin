import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { getCuration, listCurations, saveCuration } from '@/lib/curations';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    if (slug) {
      const curation = await getCuration(slug);
      return NextResponse.json({ curation });
    }
    const curations = await listCurations();
    return NextResponse.json({ curations });
  } catch (err) {
    console.error('[curations GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not load curations', curations: [] },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json();
    const slug = body.slug;
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }
    const curation = await saveCuration(slug, body);
    return NextResponse.json({ ok: true, curation });
  } catch (err) {
    console.error('[curations PUT]', err);
    return NextResponse.json(
      { error: err.message || 'Could not save curation' },
      { status: err.status || 500 }
    );
  }
}
