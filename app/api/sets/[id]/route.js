import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';
import { deleteSet, getSet, upsertSet } from '@/lib/sets';

export async function GET(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();
  try {
    const { id } = await params;
    const set = await getSet(id);
    if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ set });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const set = await upsertSet({ ...body, id });
    return NextResponse.json({ set });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();
  try {
    const { id } = await params;
    await deleteSet(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
