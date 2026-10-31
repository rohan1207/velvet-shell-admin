import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { bulkUpdateFamilies } from '@/lib/catalog';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json();
    const result = await bulkUpdateFamilies({
      ids: body?.ids,
      action: body?.action,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[catalog/products/bulk]', err);
    return NextResponse.json(
      { error: err.message || 'Bulk update failed' },
      { status: err.status || 500 },
    );
  }
}
