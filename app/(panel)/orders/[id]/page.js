'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { money } from '@/lib/format';
import { LoadingBlock } from '@/components/LoadingSpinner';

const STATUSES = ['pending', 'accepted', 'packed', 'dispatched', 'delivered', 'cancelled'];

const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-800',
  accepted: 'bg-sky-50 text-sky-800',
  packed: 'bg-violet-50 text-violet-800',
  dispatched: 'bg-indigo-50 text-indigo-800',
  delivered: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-rose-50 text-rose-800',
};

const FLOW = ['pending', 'accepted', 'packed', 'dispatched', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${id}`, { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Not found');
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Not found');
          setOrder(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onStatusChange(nextStatus) {
    setError('');
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setOrder(data.order);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err.message || 'Could not update status');
    }
  }

  const flowIndex = useMemo(() => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    return FLOW.indexOf(order.status);
  }, [order]);

  if (loading) {
    return <LoadingBlock label="Loading order…" />;
  }

  if (!order) {
    return (
      <div>
        <p>{error || 'Order not found.'}</p>
        <Link href="/orders" className="btn-ghost mt-4">
          Back
        </Link>
      </div>
    );
  }

  const ship = order.shipping || {};
  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') ||
    ship.fullName ||
    '—';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="text-[12px] text-[#7a736c] hover:text-[#5e062a]">
            ← All orders
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl md:text-4xl">{order.orderNumber}</h1>
            <span className={`status-pill ${STATUS_STYLE[order.status] || 'bg-[#faf7f2] text-[#7a736c]'}`}>
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#7a736c]">
            Placed {new Date(order.createdAt).toLocaleString('en-IN')}
            {order.updatedAt ? ` · Updated ${new Date(order.updatedAt).toLocaleString('en-IN')}` : ''}
          </p>
        </div>
        <div className="flex items-end gap-3">
          {saved && <span className="pb-2 text-sm text-emerald-700">Saved</span>}
          <label className="block">
            <span className="text-xs text-[#7a736c]">Fulfilment status</span>
            <select
              className="input mt-1 min-w-[180px]"
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-[#5e062a]">{error}</p>}

      {/* Timeline */}
      <div className="card p-5">
        <p className="font-label text-[10px] text-[#7a736c]">Progress</p>
        {order.status === 'cancelled' ? (
          <p className="mt-3 text-sm text-rose-700">This order was cancelled.</p>
        ) : (
          <ol className="mt-4 grid gap-2 sm:grid-cols-5">
            {FLOW.map((step, i) => {
              const done = flowIndex >= i;
              const current = flowIndex === i;
              return (
                <li
                  key={step}
                  className={`rounded-lg border px-3 py-3 text-center text-[12px] capitalize ${
                    current
                      ? 'border-[#5e062a]/35 bg-[#5e062a]/5 text-[#5e062a]'
                      : done
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                        : 'border-[#2d2b2b]/8 text-[#7a736c]'
                  }`}
                >
                  {step}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-1">
          <div>
            <p className="font-label text-[10px] text-[#7a736c]">Customer</p>
            <p className="mt-2 font-medium">{customerName}</p>
            <p className="mt-1 text-sm text-[#7a736c]">{order.email}</p>
            {order.customer?.phone || ship.phone ? (
              <p className="text-sm text-[#7a736c]">{order.customer?.phone || ship.phone}</p>
            ) : null}
          </div>
          <div className="border-t border-[#2d2b2b]/8 pt-4">
            <p className="font-label text-[10px] text-[#7a736c]">Ship to</p>
            <p className="mt-2 text-sm leading-relaxed text-[#2d2b2b]">
              {ship.address || ship.line1 || '—'}
              {ship.line2 ? (
                <>
                  <br />
                  {ship.line2}
                </>
              ) : null}
              <br />
              {[ship.city, ship.state, ship.postal].filter(Boolean).join(', ')}
              <br />
              {ship.country || 'India'}
            </p>
          </div>
          <div className="border-t border-[#2d2b2b]/8 pt-4">
            <p className="font-label text-[10px] text-[#7a736c]">Payment</p>
            <p className="mt-2 text-sm">{order.paymentMethod || 'Razorpay'}</p>
            {order.razorpayOrderId ? (
              <p className="mt-1 break-all font-num text-[11px] text-[#7a736c]">
                {order.razorpayOrderId}
              </p>
            ) : null}
            {order.notes ? <p className="mt-2 text-xs text-[#7a736c]">{order.notes}</p> : null}
          </div>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#2d2b2b]/8 px-5 py-4">
            <p className="font-label text-[10px] text-[#7a736c]">Line items</p>
            <p className="font-num text-xs text-[#7a736c]">{order.items?.length || 0} lines</p>
          </div>
          <ul className="divide-y divide-[#2d2b2b]/6">
            {(order.items || []).map((item, i) => (
              <li key={`${item.slug}-${i}`} className="flex gap-4 px-5 py-4">
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#ebe3da]">
                  {item.image ? (
                    <Image src={item.image} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name || item.slug}</p>
                  <p className="mt-1 text-xs text-[#7a736c]">
                    {item.metal} · {item.size} · Qty {item.qty}
                  </p>
                  <p className="mt-0.5 font-num text-[11px] text-[#7a736c]">{item.slug}</p>
                  {Array.isArray(item.customization) && item.customization.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-[#d4af64]/35 bg-[#faf7f2] px-3 py-2.5">
                      <p className="font-label text-[9px] text-[#d4af64]">Customization</p>
                      <dl className="mt-2 space-y-1.5">
                        {item.customization.map((entry, ci) => (
                          <div key={`${entry.id || entry.label}-${ci}`} className="text-sm">
                            <dt className="text-[11px] text-[#7a736c]">{entry.label}</dt>
                            <dd className="font-medium text-[#2d2b2b]">{entry.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-num text-sm">{money(item.lineTotal ?? item.price * item.qty)}</p>
                  <p className="mt-1 font-num text-[11px] text-[#7a736c]">
                    {money(item.price)} × {item.qty}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-[#2d2b2b]/8 bg-[#faf7f2]/60 px-5 py-4">
            <div className="flex justify-between text-sm text-[#7a736c]">
              <span>Subtotal</span>
              <span className="font-num text-[#2d2b2b]">{money(order.subtotal ?? order.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#7a736c]">
              <span>Shipping</span>
              <span className="font-num text-[#2d2b2b]">{money(order.shippingFee || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-[#2d2b2b]/8 pt-2">
              <span className="font-label text-[10px] text-[#7a736c]">Total</span>
              <span className="font-num text-xl">{money(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
