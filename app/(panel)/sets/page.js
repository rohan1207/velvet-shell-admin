'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/format';
import { LoadingBlock } from '@/components/LoadingSpinner';

export default function SetsListPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sets', { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (!cancelled) setSets(data.sets || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingBlock label="Loading sets…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Sets</h1>
          <p className="mt-1 text-sm text-[#7a736c]">
            Bundles of existing products with their own gallery and set price.
          </p>
        </div>
        <Link href="/sets/new" className="btn-primary">
          New set
        </Link>
      </div>

      {error ? <p className="text-sm text-[#5e062a]">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-[#2d2b2b]/8 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => (
              <tr key={s.id} className="border-b border-[#2d2b2b]/6 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#2d2b2b]">{s.name}</p>
                  <p className="text-[11px] text-[#7a736c]">
                    {s.setCode || '—'} · /{s.slug}
                  </p>
                </td>
                <td className="px-4 py-3 text-[#7a736c]">
                  {s.memberCount} piece{s.memberCount === 1 ? '' : 's'}
                  {s.outOfStock ? ' · OOS' : ''}
                </td>
                <td className="px-4 py-3 font-num">{money(s.price)}</td>
                <td className="px-4 py-3 capitalize">{s.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/sets/${s.id}`} className="text-[#5e062a] hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!sets.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#7a736c]">
                  No sets yet.{' '}
                  <Link href="/sets/new" className="text-[#5e062a]">
                    Create one
                  </Link>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
