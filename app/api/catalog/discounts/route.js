import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { listAllDiscounts, upsertBulkDiscount, upsertPromoCode } from '@/lib/discounts';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const data = await listAllDiscounts();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[discounts GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not load discounts', rows: [], active: [], past: [], totals: {} },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const body = await request.json();
    const kind = body.kind === 'bulk' ? 'bulk' : 'code';
    const discount =
      kind === 'bulk' ? await upsertBulkDiscount(body) : await upsertPromoCode(body);
    return NextResponse.json({ ok: true, discount }, { status: 201 });
  } catch (err) {
    console.error('[discounts POST]', err);
    return NextResponse.json(
      { error: err.message || 'Could not save discount' },
      { status: err.status || 500 }
    );
  }
}
