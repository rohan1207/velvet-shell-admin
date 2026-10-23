import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { createAdminSupabase } from '@/lib/supabase';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';

function mapStatus(status) {
  const map = {
    pending_payment: 'pending',
    paid: 'accepted',
    processing: 'packed',
    shipped: 'dispatched',
    delivered: 'delivered',
    cancelled: 'cancelled',
    refunded: 'cancelled',
  };
  return map[status] || status || 'pending';
}

function mapOrder(row) {
  const ship = row.shipping || {};
  const items = row.order_items || [];
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: mapStatus(row.status),
    dbStatus: row.status,
    email: row.email,
    total: row.total,
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    customer: {
      firstName: ship.firstName || ship.fullName?.split(' ')[0] || '',
      lastName:
        ship.lastName || ship.fullName?.split(' ').slice(1).join(' ') || '',
      phone: ship.phone || '',
      email: row.email,
    },
    shipping: ship,
    items: items.map((it) => ({
      slug: it.product_slug,
      name: it.product_name,
      qty: it.qty,
      price: it.unit_price,
      size: it.size,
      metal: it.metal,
    })),
    itemCount: items.reduce((s, it) => s + (it.qty || 0), 0),
    razorpayOrderId: row.razorpay_order_id,
  };
}

export async function GET(request) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const status = searchParams.get('status') || '';

    const db = createAdminSupabase();
    let query = db
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let rows = (data || []).map(mapOrder);

    if (q) {
      rows = rows.filter((o) =>
        [o.orderNumber, o.email, o.customer?.firstName, o.customer?.lastName]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    if (status) {
      rows = rows.filter((o) => o.status === status || o.dbStatus === status);
    }

    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error('[admin orders GET]', err);
    return NextResponse.json(
      { error: err.message || 'Could not load orders', orders: [] },
      { status: 500 },
    );
  }
}
