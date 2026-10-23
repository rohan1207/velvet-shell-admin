import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { listFamilies, upsertFamily } from '@/lib/catalog';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const products = await listFamilies();
    return NextResponse.json({ products, source: 'supabase' });
  } catch (err) {
    console.error('[catalog/products GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not load products', products: [], source: 'error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json();
    const product = await upsertFamily(body);
    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (err) {
    console.error('[catalog/products POST]', err);
    return NextResponse.json(
      { error: err.message || 'Could not save product' },
      { status: err.status || 500 }
    );
  }
}
