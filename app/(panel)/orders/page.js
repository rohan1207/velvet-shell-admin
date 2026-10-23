'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { money } from '@/lib/format';

const STATUSES = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'packed', label: 'Packed' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-800',
  accepted: 'bg-sky-50 text-sky-800',
  packed: 'bg-violet-50 text-violet-800',
  dispatched: 'bg-indigo-50 text-indigo-800',
  delivered: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-rose-50 text-rose-800',
};

function OrdersInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        const res = await fetch(`/api/orders?${params}`, { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load orders');
        if (!cancelled) setRows(data.orders || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load orders');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const t = setTimeout(load, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, status]);

  const summary = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.filter((s) => s.id).map((s) => [s.id, 0]));
    let revenue = 0;
    for (const o of rows) {
      if (counts[o.status] != null) counts[o.status] += 1;
      if (o.status !== 'cancelled') revenue += Number(o.total) || 0;
    }
    return { counts, revenue, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Fulfilment</p>
          <h1 className="font-display mt-2 text-3xl md:text-4xl">Orders</h1>
          <p className="mt-1 text-sm text-[#7a736c]">
            {loading ? 'Loading…' : `${summary.total} shown · ${money(summary.revenue)} excl. cancelled`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = status === s.id;
          const count = s.id ? summary.counts[s.id] : summary.total;
          return (
            <button
              key={s.id || 'all'}
              type="button"
              onClick={() => setStatus(s.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] transition ${
                active
                  ? 'bg-[#5e062a] text-white'
                  : 'border border-[#2d2b2b]/10 bg-white text-[#2d2b2b] hover:border-[#5e062a]/25'
              }`}
            >
              {s.label}
              {!loading && <span className="font-num opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <label className="block min-w-[220px] flex-1">
          <span className="text-xs text-[#7a736c]">Search</span>
          <input
            className="input mt-1"
            placeholder="Order #, email, or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-[#5e062a]">{error}</p>}

      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.12em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Pieces</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2b2b]/6">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#7a736c]">
                  Loading orders…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#7a736c]">
                  No orders match this view.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="transition hover:bg-[#faf7f2]/80">
                <td className="px-4 py-3.5">
                  <Link href={`/orders/${o.id}`} className="font-medium text-[#5e062a] hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="mt-0.5 text-xs text-[#7a736c]">
                    {new Date(o.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <p>
                    {o.customer?.firstName} {o.customer?.lastName}
                  </p>
                  <p className="text-xs text-[#7a736c]">{o.email}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-num">{o.itemCount || o.items?.length || 0}</p>
                  {o.hasCustomization ? (
                    <p className="mt-0.5 text-[11px] text-[#d4af64]">Custom notes</p>
                  ) : null}
                </td>
                <td className="font-num px-4 py-3.5">{money(o.total)}</td>
                <td className="px-4 py-3.5">
                  <span className={`status-pill ${STATUS_STYLE[o.status] || 'bg-[#faf7f2] text-[#7a736c]'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/orders/${o.id}`} className="text-[12px] text-[#5e062a] hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#7a736c]">Loading…</p>}>
      <OrdersInner />
    </Suspense>
  );
}
