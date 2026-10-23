'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { money } from '@/lib/format';

const STATUSES = ['pending', 'accepted', 'packed', 'dispatched', 'delivered', 'cancelled'];

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

  return (
    <div className="space-y-6">
      <div>
        <p className="font-label text-[10px] text-[#d4af64]">Fulfilment</p>
        <h1 className="font-display mt-2 text-4xl">Orders</h1>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <label className="block min-w-[200px] flex-1">
          <span className="text-xs text-[#7a736c]">Search</span>
          <input
            className="input mt-1"
            placeholder="Order # or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Status</span>
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-[#5e062a]">{error}</p>}
      {loading && <p className="text-sm text-[#7a736c]">Loading orders…</p>}

      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2b2b]/6">
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#7a736c]">
                  No orders yet.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-[#faf7f2]/80">
                <td className="px-4 py-3">
                  <Link href={`/orders/${o.id}`} className="font-medium text-[#5e062a] hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#7a736c]">
                  {new Date(o.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <div>
                    {o.customer?.firstName} {o.customer?.lastName}
                  </div>
                  <div className="text-xs text-[#7a736c]">{o.email}</div>
                </td>
                <td className="font-num px-4 py-3">{o.items?.length || 0}</td>
                <td className="font-num px-4 py-3">{money(o.total)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      o.status === 'pending'
                        ? 'bg-[#5e062a]/10 text-[#5e062a]'
                        : 'bg-[#faf7f2] text-[#2d2b2b]'
                    }`}
                  >
                    {o.status}
                  </span>
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
