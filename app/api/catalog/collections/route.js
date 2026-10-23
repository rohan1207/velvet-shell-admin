import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { listCollections } from '@/lib/catalog';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const collections = await listCollections();
    return NextResponse.json({ collections });
  } catch (err) {
    console.error('[collections GET]', err);
    return NextResponse.json({ error: err.message, collections: [] }, { status: 500 });
  }
}
