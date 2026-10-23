import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { createAdminSupabase } from '@/lib/supabase';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

const ADMIN_TO_DB = {
  pending: 'pending_payment',
  accepted: 'paid',
  packed: 'processing',
  dispatched: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const DB_TO_ADMIN = {
  pending_payment: 'pending',
  paid: 'accepted',
  processing: 'packed',
  shipped: 'dispatched',
  delivered: 'delivered',
  cancelled: 'cancelled',
  refunded: 'cancelled',
};

function mapOrder(row) {
  const ship = row.shipping || {};
  const items = row.order_items || [];
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: DB_TO_ADMIN[row.status] || row.status,
    dbStatus: row.status,
    email: row.email,
    total: row.total,
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    customer: {
      firstName: ship.firstName || ship.fullName?.split(' ')[0] || '',
      lastName: ship.lastName || ship.fullName?.split(' ').slice(1).join(' ') || '',
      phone: ship.phone || '',
      email: row.email,
    },
    shipping: {
      ...ship,
      address: ship.line1 || ship.address || '',
    },
    items: items.map((it) => ({
      slug: it.product_slug,
      name: it.product_name,
      image: it.image_url,
      qty: it.qty,
      price: it.unit_price,
      lineTotal: it.line_total ?? (it.unit_price || 0) * (it.qty || 1),
      size: it.size,
      metal: it.metal,
      customization: Array.isArray(it.customization) ? it.customization : [],
    })),
    currency: row.currency || 'INR',
    notes: row.notes || '',
    paymentMethod: 'Razorpay',
    paymentId: null,
    razorpayOrderId: row.razorpay_order_id,
  };
}

export async function GET(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();

  try {
    const { id } = await params;
    const db = createAdminSupabase();
    let query = db.from('orders').select('*, order_items(*)');

    const byId = await query.eq('id', id).maybeSingle();
    let row = byId.data;
    if (!row) {
      const byNum = await db
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', id)
        .maybeSingle();
      row = byNum.data;
    }
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ order: mapOrder(row) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status;
    const dbStatus = ADMIN_TO_DB[status] || status;
    if (!dbStatus) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = createAdminSupabase();
    const { data, error } = await db
      .from('orders')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, order_items(*)')
      .single();

    if (error) throw error;
    return NextResponse.json({ order: mapOrder(data) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
