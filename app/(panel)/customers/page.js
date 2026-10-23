'use client';

import { useEffect, useState } from 'react';
import { money } from '@/lib/format';

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/customers', { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setRows(data.customers || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openCustomer(c) {
    setSelected(c);
    setHistory([]);
    try {
      const params = new URLSearchParams({ q: c.email || '' });
      const res = await fetch(`/api/orders?${params}`, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      setHistory(data.orders || []);
    } catch {
      setHistory([]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-label text-[10px] text-[#d4af64]">Audience</p>
        <h1 className="font-display mt-2 text-4xl">Customers</h1>
        <p className="mt-1 text-sm text-[#7a736c]">
          Live from accounts & orders — email and phone ready for campaigns.
        </p>
      </div>

      {loading && <p className="text-sm text-[#7a736c]">Loading customers…</p>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2b2b]/6">
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#7a736c]">
                    No customers yet.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr
                  key={c.id || c.email}
                  className="cursor-pointer hover:bg-[#faf7f2]/80"
                  onClick={() => openCustomer(c)}
                >
                  <td className="px-4 py-3 font-medium">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="font-num px-4 py-3">{c.orderCount}</td>
                  <td className="font-num px-4 py-3">{money(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          {!selected ? (
            <p className="text-sm text-[#7a736c]">Select a customer to see order history.</p>
          ) : (
            <>
              <p className="font-label text-[10px] text-[#7a736c]">Customer</p>
              <h2 className="font-display mt-2 text-2xl">
                {selected.firstName} {selected.lastName}
              </h2>
              <p className="mt-2 text-sm">{selected.email}</p>
              <p className="text-sm text-[#7a736c]">{selected.phone}</p>
              <p className="font-num mt-4 text-sm">
                {selected.orderCount} orders · {money(selected.totalSpent)} spent
              </p>
              <ul className="mt-6 space-y-3 border-t border-[#2d2b2b]/8 pt-4">
                {history.length === 0 && (
                  <li className="text-sm text-[#7a736c]">No orders for this customer.</li>
                )}
                {history.map((o) => (
                  <li key={o.id} className="flex justify-between text-sm">
                    <span>
                      <span className="font-num">{o.orderNumber}</span>
                      <span className="mt-0.5 block text-xs text-[#7a736c]">{o.status}</span>
                    </span>
                    <span className="font-num">{money(o.total)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
