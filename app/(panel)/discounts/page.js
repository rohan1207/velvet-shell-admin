'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { moneyINR, statusTone } from '@/lib/discounts-client';

function Stat({ label, value, hint }) {
  return (
    <div className="card px-5 py-5">
      <p className="font-label text-[10px] text-[#7a736c]">{label}</p>
      <p className="font-num mt-2 text-3xl font-semibold tracking-tight text-[#2d2b2b]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[#7a736c]">{hint}</p>}
    </div>
  );
}

function scopeLabel(row) {
  if (row.scope === 'all') return 'Entire catalogue';
  if (row.scope === 'category') return `Category · ${(row.scopeValues || []).join(', ') || '—'}`;
  if (row.scope === 'collection') return `Collection · ${(row.scopeValues || []).join(', ') || '—'}`;
  return `Products · ${(row.scopeValues || []).length} selected`;
}

function offerLabel(row) {
  if (row.kind === 'bulk') {
    return (row.tiers || [])
      .map((t) => `Buy ${t.qty}: ${t.discountType === 'fixed' ? `₹${t.value}` : `${t.value}%`}`)
      .join(' · ');
  }
  return row.discountType === 'fixed' ? `₹${row.value} off` : `${row.value}% off`;
}

export default function DiscountsPage() {
  const [tab, setTab] = useState('active');
  const [data, setData] = useState({ rows: [], active: [], past: [], totals: {} });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/catalog/discounts')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.error) setError(d.error);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    if (tab === 'active') return data.active || [];
    if (tab === 'past') return data.past || [];
    return data.rows || [];
  }, [tab, data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Growth</p>
          <h1 className="font-display mt-2 text-4xl">Discounts</h1>
          <p className="mt-2 max-w-xl text-sm font-light text-[#7a736c]">
            Promo codes and bulk-buy tiers. Usage and revenue update as orders redeem them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/discounts/new?type=bulk" className="btn-ghost">
            Bulk offer
          </Link>
          <Link href="/discounts/new" className="btn-primary">
            New promo code
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#5e062a]">
          {/relation|does not exist|schema/i.test(error)
            ? 'Run supabase/migrations/004_discounts.sql in the SQL Editor (or npm run db:migrate).'
            : error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Times used"
          value={loading ? '—' : String(data.totals?.timesUsed || 0)}
          hint="Across all codes & bulk offers"
        />
        <Stat
          label="Sales revenue"
          value={loading ? '—' : moneyINR(data.totals?.revenue || 0)}
          hint="Order totals when a discount applied"
        />
        <Stat
          label="Discount given"
          value={loading ? '—' : moneyINR(data.totals?.discountGiven || 0)}
          hint="Total amount saved by customers"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'active', label: 'Active', count: data.active?.length || 0 },
          { id: 'past', label: 'Past', count: data.past?.length || 0 },
          { id: 'all', label: 'All', count: data.rows?.length || 0 },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-xs transition ${
              tab === t.id ? 'bg-[#5e062a] text-white' : 'bg-white text-[#2d2b2b] border border-[#2d2b2b]/10'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Offer</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Applies to</th>
              <th className="px-4 py-3 font-semibold">Used</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
              <th className="px-4 py-3 font-semibold">Saved</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2b2b]/6">
            {list.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="hover:bg-[#faf7f2]/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/discounts/${row.kind}/${row.id}`}
                    className="block font-medium text-[#2d2b2b] hover:text-[#5e062a]"
                  >
                    {row.kind === 'code' ? row.code : row.name}
                  </Link>
                  <p className="text-xs text-[#7a736c]">{offerLabel(row)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#faf7f2] px-2.5 py-1 text-[10px] uppercase tracking-wider">
                    {row.kind === 'code' ? 'Code' : 'Bulk'}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[#7a736c]">{scopeLabel(row)}</td>
                <td className="font-num px-4 py-3">{row.timesUsed}</td>
                <td className="font-num px-4 py-3">{moneyINR(row.revenue)}</td>
                <td className="font-num px-4 py-3">{moneyINR(row.discountGiven)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusTone(row.status)}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && !list.length && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#7a736c]">
                  No discounts here yet.{' '}
                  <Link href="/discounts/new" className="text-[#5e062a]">
                    Create a promo code
                  </Link>{' '}
                  or{' '}
                  <Link href="/discounts/new?type=bulk" className="text-[#5e062a]">
                    bulk offer
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
