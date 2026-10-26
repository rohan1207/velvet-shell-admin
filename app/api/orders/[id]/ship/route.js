import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/session';
import { createAdminSupabase } from '@/lib/supabase';
import { allowInsecureTlsIfConfigured } from '@/lib/tls';
import { createShipment } from '@/lib/delivery/delhivery';
import { sendShipmentEmails } from '@/lib/mail';

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
    razorpayOrderId: row.razorpay_order_id,
    courier: row.courier || '',
    awb: row.awb || '',
    trackingUrl: row.tracking_url || '',
    shipmentStatus: row.shipment_status || '',
    shippedAt: row.shipped_at || null,
    deliveredAt: row.delivered_at || null,
  };
}

async function sendBookingEmails(orderRow) {
  const ship = orderRow.shipping || {};
  const customerName =
    ship.fullName ||
    [ship.firstName, ship.lastName].filter(Boolean).join(' ') ||
    '';
  try {
    const result = await sendShipmentEmails({
      order: orderRow,
      items: orderRow.order_items || [],
      event: 'shipped',
      customerName,
    });
    if (!result?.ok) {
      console.warn('[ship] shipment emails not fully sent', result);
    }
    return result;
  } catch (err) {
    console.error('[ship] shipment email error', err.message || err);
    return { ok: false, error: err.message };
  }
}

export async function POST(request, { params }) {
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  allowInsecureTlsIfConfigured();

  try {
    const { id } = await params;
    const db = createAdminSupabase();

    let { data: row, error } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      const byNum = await db
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', id)
        .maybeSingle();
      row = byNum.data;
    }
    if (!row) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (row.status === 'cancelled' || row.status === 'refunded') {
      return NextResponse.json({ error: 'Cannot ship a cancelled order' }, { status: 400 });
    }
    if (row.status === 'delivered') {
      return NextResponse.json({ error: 'Order already delivered' }, { status: 400 });
    }
    if (row.awb) {
      return NextResponse.json(
        { error: `Already booked with AWB ${row.awb}`, order: mapOrder(row) },
        { status: 409 },
      );
    }
    if (!['paid', 'processing'].includes(row.status)) {
      return NextResponse.json(
        {
          error:
            'Order must be accepted or packed before booking. Current: ' +
            (DB_TO_ADMIN[row.status] || row.status),
        },
        { status: 400 },
      );
    }

    const booked = await createShipment(row, row.order_items || []);
    const now = new Date().toISOString();

    const { data: updated, error: upErr } = await db
      .from('orders')
      .update({
        status: 'shipped',
        courier: 'delhivery',
        awb: booked.awb,
        tracking_url: booked.trackingUrl,
        shipment_id: booked.awb,
        shipment_status: 'Manifested',
        shipped_at: now,
        updated_at: now,
      })
      .eq('id', row.id)
      .select('*, order_items(*)')
      .single();

    if (upErr) throw upErr;

    const mail = await sendBookingEmails(updated);

    return NextResponse.json({
      ok: true,
      awb: booked.awb,
      trackingUrl: booked.trackingUrl,
      order: mapOrder(updated),
      emailSent: Boolean(mail?.ok),
    });
  } catch (err) {
    console.error('[ship]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to book shipment' },
      { status: 500 },
    );
  }
}
