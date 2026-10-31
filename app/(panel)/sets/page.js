'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/format';
import { LoadingBlock } from '@/components/LoadingSpinner';

const BULK_ACTIONS = [
  { id: 'active', label: 'Set active' },
  { id: 'draft', label: 'Set draft' },
  { id: 'in_stock', label: 'In stock' },
  { id: 'out_of_stock', label: 'Out of stock' },
  { id: 'remove', label: 'Remove', danger: true },
];

export default function SetsListPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  async function loadSets() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sets', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setSets(data.sets || []);
    } catch (err) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

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

  const filtered = useMemo(() => {
    let list = sets;
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((s) =>
        [s.name, s.slug, s.setCode, s.setSku].join(' ').toLowerCase().includes(query),
      );
    }
    if (status) list = list.filter((s) => s.status === status);
    return list;
  }, [sets, q, status]);

  const filteredIds = useMemo(() => filtered.map((s) => s.id).filter(Boolean), [filtered]);
  const selectedCount = selected.size;
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected = filteredIds.some((id) => selected.has(id));

  function toggleOne(id) {
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkMsg('');
  }

  async function runBulk(action) {
    const ids = [...selected];
    if (!ids.length || bulkBusy) return;

    if (action === 'remove') {
      const ok = window.confirm(
        `Remove ${ids.length} set${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      );
      if (!ok) return;
    }

    if (action === 'out_of_stock' || action === 'in_stock') {
      const ok = window.confirm(
        action === 'out_of_stock'
          ? `Mark all member pieces in ${ids.length} set${ids.length === 1 ? '' : 's'} as out of stock?`
          : `Mark all member pieces in ${ids.length} set${ids.length === 1 ? '' : 's'} as in stock?`,
      );
      if (!ok) return;
    }

    setBulkBusy(true);
    setBulkMsg('');
    setError('');
    try {
      const res = await fetch('/api/sets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ids, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');

      const label = BULK_ACTIONS.find((a) => a.id === action)?.label || action;
      setBulkMsg(`${label} · ${data.count || ids.length} updated`);
      setSelected(new Set());
      await loadSets();
    } catch (err) {
      setError(err.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading && !sets.length) return <LoadingBlock label="Loading sets…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Sets</h1>
          <p className="mt-1 text-sm text-[#7a736c]">
            Bundles of existing products with their own gallery and set price.
            {!loading ? ` · ${filtered.length} sets` : ''}
          </p>
          {error ? <p className="mt-2 text-sm text-[#5e062a]">{error}</p> : null}
          {bulkMsg && !error ? (
            <p className="mt-2 text-sm text-emerald-800">{bulkMsg}</p>
          ) : null}
        </div>
        <Link href="/sets/new" className="btn-primary">
          New set
        </Link>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4 md:p-5">
        <label className="block min-w-[180px] flex-1">
          <span className="text-xs text-[#7a736c]">Search</span>
          <input
            className="input mt-1"
            placeholder="Name, code or slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Status</span>
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>

      {selectedCount > 0 ? (
        <div className="card sticky top-3 z-20 flex flex-wrap items-center gap-2 border border-[#5e062a]/15 bg-[#faf7f2] p-3 shadow-sm md:p-4">
          <p className="font-num mr-2 text-sm text-[#2d2b2b]">
            {selectedCount} selected
          </p>
          {BULK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulk(action.id)}
              className={
                action.danger
                  ? 'rounded-full border border-[#5e062a]/25 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#5e062a] uppercase transition hover:bg-[#5e062a] hover:text-white disabled:opacity-50'
                  : 'rounded-full border border-[#2d2b2b]/12 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2d2b2b] uppercase transition hover:border-[#5e062a]/30 hover:text-[#5e062a] disabled:opacity-50'
              }
            >
              {bulkBusy ? '…' : action.label}
            </button>
          ))}
          <button
            type="button"
            disabled={bulkBusy}
            onClick={clearSelection}
            className="btn-ghost ml-auto px-3 py-1.5 text-[11px] uppercase tracking-wide"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className={`overflow-hidden rounded-2xl border border-[#2d2b2b]/8 bg-white ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible sets"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                  }}
                  onChange={toggleAllFiltered}
                  disabled={!filteredIds.length}
                  className="h-4 w-4 accent-[#5e062a]"
                />
              </th>
              <th className="px-4 py-3 font-medium">Set</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const isChecked = selected.has(s.id);
              return (
                <tr
                  key={s.id}
                  className={`border-b border-[#2d2b2b]/6 last:border-0 ${
                    isChecked ? 'bg-[#5e062a]/[0.04]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.name}`}
                      checked={isChecked}
                      disabled={!s.id}
                      onChange={() => toggleOne(s.id)}
                      className="h-4 w-4 accent-[#5e062a]"
                    />
                  </td>
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
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        s.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/sets/${s.id}`} className="text-[#5e062a] hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#7a736c]">
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
