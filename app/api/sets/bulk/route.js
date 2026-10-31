import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { bulkUpdateSets } from '@/lib/sets';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json();
    const result = await bulkUpdateSets({
      ids: body?.ids,
      action: body?.action,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[sets/bulk]', err);
    return NextResponse.json(
      { error: err.message || 'Bulk update failed' },
      { status: err.status || 500 },
    );
  }
}
