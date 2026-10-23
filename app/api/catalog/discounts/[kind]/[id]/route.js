import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import {
  deleteDiscount,
  getDiscount,
  upsertBulkDiscount,
  upsertPromoCode,
} from '@/lib/discounts';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request, { params }) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const { kind, id } = await params;
    const discount = await getDiscount(kind === 'bulk' ? 'bulk' : 'code', id);
    if (!discount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ discount });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const { kind, id } = await params;
    const body = await request.json();
    const discount =
      kind === 'bulk'
        ? await upsertBulkDiscount({ ...body, id })
        : await upsertPromoCode({ ...body, id });
    return NextResponse.json({ ok: true, discount });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Could not update' },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const { kind, id } = await params;
    await deleteDiscount(kind === 'bulk' ? 'bulk' : 'code', id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
