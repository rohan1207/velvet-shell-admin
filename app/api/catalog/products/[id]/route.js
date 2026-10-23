import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { deleteFamily, getFamily, upsertFamily } from '@/lib/catalog';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request, { params }) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const { id } = await params;
    const product = await getFamily(id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!readSessionFromRequest(request)) return unauthorized();
  allowInsecureTlsIfConfigured();
  try {
    const { id } = await params;
    const body = await request.json();
    const product = await upsertFamily({ ...body, id });
    return NextResponse.json({ ok: true, product });
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
    const { id } = await params;
    await deleteFamily(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
