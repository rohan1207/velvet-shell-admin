'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/format';

function Kpi({ label, value, hint, href }) {
  const inner = (
    <div className="card p-5 transition hover:border-[#5e062a]/20">
      <p className="font-label text-[10px] text-[#7a736c]">{label}</p>
      <p className="font-num mt-3 text-3xl font-semibold tracking-tight text-[#2d2b2b]">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-[#7a736c]">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function EmptyNote({ children }) {
  return <p className="px-6 py-8 text-sm text-[#7a736c]">{children}</p>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to load');
        if (!cancelled) setStats(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-[#5e062a]">{error}</p>;
  }

  if (!stats) {
    return <p className="text-sm text-[#7a736c]">Loading dashboard…</p>;
  }

  const c = stats.catalog || {};
  const m = stats.commerce || {};
  const maxCat = Math.max(...(stats.categoryBreakdown || []).map((x) => x.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Overview</p>
          <h1 className="font-display mt-2 text-4xl text-[#2d2b2b]">Dashboard</h1>
          <p className="mt-2 max-w-xl text-sm text-[#7a736c]">
            Live catalogue and commerce from Supabase — products, stock, and orders.
          </p>
        </div>
        <p className="font-num text-[11px] text-[#7a736c]">
          Updated {new Date(stats.generatedAt).toLocaleString('en-IN')}
        </p>
      </div>

      {stats.warnings?.length > 0 && (
        <p className="text-xs text-[#7a736c]">
          Some sources returned warnings: {stats.warnings.join(' · ')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Live products" value={c.liveProducts} href="/products?status=active" />
        <Kpi label="Draft products" value={c.draftProducts} href="/products?status=draft" />
        <Kpi
          label="Variants"
          value={c.variants}
          hint={`${c.families || 0} families`}
          href="/products"
        />
        <Kpi
          label="Low stock"
          value={c.lowStock}
          hint="≤ 3 units"
          href="/products?stock=low"
        />
        <Kpi label="Out of stock" value={c.outOfStock} href="/products?stock=out" />
        <Kpi
          label="Missing images"
          value={c.missingImages}
          hint="No hero or gallery"
        />
        <Kpi
          label="Units in stock"
          value={(c.unitsInStock || 0).toLocaleString('en-IN')}
        />
        <Kpi
          label="Inventory value"
          value={money(c.inventoryValue)}
          hint="Price × stock"
        />
        <Kpi label="Customers" value={m.customers} href="/customers" />
        <Kpi label="Orders" value={m.orders} href="/orders" />
        <Kpi
          label="Open orders"
          value={m.pendingOrders}
          hint="Pending / paid / processing"
          href="/orders"
        />
        <Kpi
          label="Active discounts"
          value={c.activeDiscounts}
          href="/discounts"
        />
        <Kpi label="Revenue this month" value={money(m.revenueMonth)} />
        <Kpi label="Revenue this year" value={money(m.revenueYear)} />
        <Kpi label="Categories" value={c.categories} href="/categories" />
        <Kpi label="Collections" value={c.collections} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <p className="font-label text-[10px] text-[#7a736c]">Total revenue</p>
          <p className="font-num mt-3 text-4xl font-semibold tracking-tight text-[#2d2b2b]">
            {money(m.revenueAll)}
          </p>
          <p className="mt-3 text-xs text-[#7a736c]">
            Confirmed orders in Supabase
            {m.orders === 0 ? ' — no paid orders yet.' : '.'}
          </p>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-[#2d2b2b]/8 px-6 py-4">
            <p className="font-label text-[10px] text-[#7a736c]">Live products by category</p>
          </div>
          {(stats.categoryBreakdown || []).length === 0 ? (
            <EmptyNote>No active products yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#2d2b2b]/6">
              {stats.categoryBreakdown.map((row) => (
                <li key={row.category} className="flex items-center gap-4 px-6 py-3">
                  <Link
                    href={`/products?category=${encodeURIComponent(row.category)}`}
                    className="w-28 shrink-0 text-sm capitalize text-[#5e062a] hover:underline"
                  >
                    {row.category}
                  </Link>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2d2b2b]/6">
                    <div
                      className="h-full rounded-full bg-[#5e062a]/80"
                      style={{ width: `${(row.count / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="font-num w-8 text-right text-sm tabular-nums text-[#2d2b2b]">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2d2b2b]/8 px-6 py-4">
            <p className="font-label text-[10px] text-[#7a736c]">Low stock</p>
            <Link href="/products?stock=low" className="text-[11px] text-[#5e062a] hover:underline">
              View all
            </Link>
          </div>
          {(stats.lowStock || []).length === 0 ? (
            <EmptyNote>Nothing is critically low.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[#2d2b2b]/6">
              {stats.lowStock.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${row.familySlug || row.slug}`}
                      className="block truncate font-medium text-[#2d2b2b] hover:text-[#5e062a]"
                    >
                      {row.name}
                      {row.color ? ` — ${row.color}` : ''}
                    </Link>
                    <p className="font-num truncate text-[11px] text-[#7a736c]">{row.sku}</p>
                  </div>
                  <span className="font-num shrink-0 text-[#5e062a]">
                    {row.stock} left · {money(row.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2d2b2b]/8 px-6 py-4">
            <p className="font-label text-[10px] text-[#7a736c]">Recent orders</p>
            <Link href="/orders" className="text-[11px] text-[#5e062a] hover:underline">
              View all
            </Link>
          </div>
          {(stats.recentOrders || []).length === 0 ? (
            <EmptyNote>
              No orders in Supabase yet. When checkout writes orders, they will show here.
            </EmptyNote>
          ) : (
            <ul className="divide-y divide-[#2d2b2b]/6">
              {stats.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-num font-medium text-[#5e062a] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="truncate text-[11px] text-[#7a736c]">{o.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-num">{money(o.total)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[#7a736c]">{o.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
