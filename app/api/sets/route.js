import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';
import { listSets, listSelectableProducts, upsertSet } from '@/lib/sets';

export async function GET(request) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('picker') === '1') {
      const products = await listSelectableProducts();
      return NextResponse.json({ products });
    }
    const sets = await listSets();
    return NextResponse.json({ sets });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json().catch(() => ({}));
    const set = await upsertSet(body);
    return NextResponse.json({ set }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
