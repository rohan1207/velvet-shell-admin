'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/format';
import { LoadingBlock } from '@/components/LoadingSpinner';

const STATUS_LABEL = {
  pending_payment: 'Pending',
  paid: 'Accepted',
  processing: 'Packed',
  shipped: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_TONE = {
  pending_payment: 'bg-amber-50 text-amber-800',
  paid: 'bg-sky-50 text-sky-800',
  processing: 'bg-violet-50 text-violet-800',
  shipped: 'bg-indigo-50 text-indigo-800',
  delivered: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-rose-50 text-rose-800',
  refunded: 'bg-rose-50 text-rose-800',
};

function n(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatCount(value) {
  return n(value).toLocaleString('en-IN');
}

function KpiCard({ label, value, hint, href, accent = false }) {
  const body = (
    <div
      className={`group h-full rounded-xl border border-[#2d2b2b]/8 bg-white p-4 transition ${
        href ? 'hover:border-[#5e062a]/25 hover:shadow-[0_8px_24px_rgba(45,43,43,0.05)]' : ''
      } ${accent ? 'bg-gradient-to-br from-[#5e062a] to-[#3a0419] text-[#f5eee8]' : ''}`}
    >
      <p
        className={`text-[11px] font-medium tracking-[0.12em] uppercase ${
          accent ? 'text-[#d4af64]' : 'text-[#7a736c]'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-num mt-2 text-2xl font-semibold tracking-tight tabular-nums md:text-[1.65rem] ${
          accent ? 'text-white' : 'text-[#2d2b2b]'
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className={`mt-1.5 text-[12px] ${accent ? 'text-white/60' : 'text-[#7a736c]'}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Section({ title, action, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#2d2b2b]/8 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#2d2b2b]/8 px-5 py-3.5">
        <h2 className="text-[13px] font-semibold tracking-tight text-[#2d2b2b]">{title}</h2>
        {action || null}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }) {
  return <p className="px-5 py-10 text-center text-sm text-[#7a736c]">{children}</p>;
}

function QuickLink({ href, title, desc }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[#2d2b2b]/8 bg-white px-4 py-3.5 transition hover:border-[#5e062a]/25 hover:bg-[#faf7f2]"
    >
      <p className="text-sm font-semibold text-[#2d2b2b]">{title}</p>
      <p className="mt-1 text-[12px] text-[#7a736c]">{desc}</p>
    </Link>
  );
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
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  if (!stats) {
    return <LoadingBlock label="Loading dashboard…" />;
  }

  const c = stats.catalog || {};
  const m = stats.commerce || {};
  const status = m.orderStatus || {};
  const categories = stats.categoryBreakdown || [];
  const maxCat = Math.max(...categories.map((x) => x.count), 1);
  const statusFlow = [
    'pending_payment',
    'paid',
    'processing',
    'shipped',
    'delivered',
  ];
  const maxStatus = Math.max(...statusFlow.map((key) => n(status[key])), 1);
  const attention =
    n(c.lowStock) + n(c.outOfStock) + n(c.missingImages) + n(m.pendingOrders);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#d4af64] uppercase">
            House operations
          </p>
          <h1 className="font-display mt-1.5 text-3xl text-[#2d2b2b] md:text-4xl">Dashboard</h1>
          <p className="mt-1.5 max-w-xl text-sm text-[#7a736c]">
            Live figures from Supabase — catalogue, stock, and commerce.
          </p>
        </div>
        <div className="text-right">
          <p className="font-num text-[11px] text-[#7a736c]">
            Updated {new Date(stats.generatedAt).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-[#7a736c]">
            {attention > 0
              ? `${formatCount(attention)} items need attention`
              : 'Nothing urgent right now'}
          </p>
        </div>
      </div>

      {stats.warnings?.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Some sources returned warnings: {stats.warnings.join(' · ')}
        </div>
      ) : null}

      {/* Primary commerce strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          accent
          label="Revenue (all time)"
          value={money(m.revenueAll)}
          hint={`${formatCount(m.confirmedOrders)} confirmed orders`}
        />
        <KpiCard
          label="This month"
          value={money(m.revenueMonth)}
          hint={`Year to date ${money(m.revenueYear)}`}
        />
        <KpiCard
          label="Open orders"
          value={formatCount(m.pendingOrders)}
          hint="Pending · accepted · packed"
          href="/orders"
        />
        <KpiCard
          label="Customers"
          value={formatCount(m.customers)}
          hint={`AOV ${money(m.averageOrderValue)}`}
          href="/customers"
        />
      </div>

      {/* Catalogue health */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[#2d2b2b]">Catalogue health</h2>
          <Link href="/products" className="text-[12px] text-[#5e062a] hover:underline">
            Manage products
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Live"
            value={formatCount(c.liveProducts)}
            hint={`${formatCount(c.variants)} variants`}
            href="/products?status=active"
          />
          <KpiCard
            label="Draft"
            value={formatCount(c.draftProducts)}
            href="/products?status=draft"
          />
          <KpiCard
            label="Low stock"
            value={formatCount(c.lowStock)}
            hint="≤ 3 units"
            href="/products?stock=low"
          />
          <KpiCard
            label="Out of stock"
            value={formatCount(c.outOfStock)}
            href="/products?stock=out"
          />
          <KpiCard
            label="Missing images"
            value={formatCount(c.missingImages)}
            hint="No hero / gallery"
          />
          <KpiCard
            label="Inventory value"
            value={money(c.inventoryValue)}
            hint={`${formatCount(c.unitsInStock)} units`}
          />
        </div>
      </div>

      {/* Mid grid */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Section
            title="Live products by category"
            action={
              <Link href="/categories" className="text-[12px] text-[#5e062a] hover:underline">
                Categories
              </Link>
            }
          >
            {categories.length === 0 ? (
              <EmptyRow>0 live products in categories yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-[#2d2b2b]/6 px-5 py-2">
                {categories.map((row) => (
                  <li key={row.category} className="flex items-center gap-3 py-2.5">
                    <Link
                      href={`/products?category=${encodeURIComponent(row.category)}`}
                      className="w-28 shrink-0 truncate text-sm capitalize text-[#5e062a] hover:underline"
                    >
                      {row.category}
                    </Link>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2d2b2b]/8">
                      <div
                        className="h-full rounded-full bg-[#5e062a]"
                        style={{ width: `${(row.count / maxCat) * 100}%` }}
                      />
                    </div>
                    <span className="font-num w-8 text-right text-sm tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="xl:col-span-4">
          <Section
            title="Order pipeline"
            action={
              <Link href="/orders" className="text-[12px] text-[#5e062a] hover:underline">
                All orders
              </Link>
            }
          >
            <ul className="space-y-2.5 px-5 py-4">
              {statusFlow.map((key) => (
                <li key={key}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-[#7a736c]">{STATUS_LABEL[key]}</span>
                    <span className="font-num font-medium tabular-nums text-[#2d2b2b]">
                      {formatCount(status[key])}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#2d2b2b]/8">
                    <div
                      className="h-full rounded-full bg-[#5e062a]/75"
                      style={{ width: `${(n(status[key]) / maxStatus) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-[#2d2b2b]/8 pt-3 text-[12px]">
                <span className="text-[#7a736c]">Cancelled / refunded</span>
                <span className="font-num tabular-nums text-[#2d2b2b]">
                  {formatCount(n(status.cancelled) + n(status.refunded))}
                </span>
              </li>
            </ul>
          </Section>
        </div>

        <div className="xl:col-span-3">
          <Section title="At a glance">
            <dl className="divide-y divide-[#2d2b2b]/6 px-5">
              {[
                { label: 'Total orders', value: formatCount(m.orders), href: '/orders' },
                {
                  label: 'Delivered',
                  value: formatCount(m.deliveredOrders),
                  href: '/orders?status=delivered',
                },
                {
                  label: 'Active discounts',
                  value: formatCount(c.activeDiscounts),
                  href: '/discounts',
                },
                { label: 'Promo codes', value: formatCount(c.discountCodes) },
                { label: 'Bulk offers', value: formatCount(c.bulkOffers) },
                {
                  label: 'Categories',
                  value: formatCount(c.categories),
                  href: '/categories',
                },
                { label: 'Collections', value: formatCount(c.collections) },
                { label: 'Families', value: formatCount(c.families), href: '/products' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-[#7a736c]">{row.label}</dt>
                  <dd className="font-num font-medium tabular-nums">
                    {row.href ? (
                      <Link href={row.href} className="text-[#5e062a] hover:underline">
                        {row.value}
                      </Link>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Low stock"
          action={
            <Link href="/products?stock=low" className="text-[12px] text-[#5e062a] hover:underline">
              View all
            </Link>
          }
        >
          {(stats.lowStock || []).length === 0 ? (
            <EmptyRow>0 low-stock variants — stock looks healthy.</EmptyRow>
          ) : (
            <ul className="divide-y divide-[#2d2b2b]/6">
              {stats.lowStock.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${row.familySlug || row.slug}`}
                      className="block truncate text-sm font-medium text-[#2d2b2b] hover:text-[#5e062a]"
                    >
                      {row.name}
                      {row.color ? ` — ${row.color}` : ''}
                    </Link>
                    <p className="font-num truncate text-[11px] text-[#7a736c]">{row.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-num text-sm font-semibold text-[#5e062a]">
                      {row.stock} left
                    </p>
                    <p className="font-num text-[11px] text-[#7a736c]">{money(row.price)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Recent orders"
          action={
            <Link href="/orders" className="text-[12px] text-[#5e062a] hover:underline">
              View all
            </Link>
          }
        >
          {(stats.recentOrders || []).length === 0 ? (
            <EmptyRow>0 orders yet — new checkouts will appear here.</EmptyRow>
          ) : (
            <ul className="divide-y divide-[#2d2b2b]/6">
              {stats.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-num text-sm font-semibold text-[#5e062a] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="truncate text-[12px] text-[#7a736c]">
                      {o.customer || o.email || '—'}
                    </p>
                    <p className="font-num mt-0.5 text-[11px] text-[#7a736c]">
                      {new Date(o.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-num text-sm font-medium">{money(o.total)}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_TONE[o.status] || 'bg-[#faf7f2] text-[#7a736c]'
                      }`}
                    >
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-[13px] font-semibold text-[#2d2b2b]">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/products/new" title="Add product" desc="New family, photos, price" />
          <QuickLink href="/orders" title="Fulfil orders" desc="Accept → pack → dispatch" />
          <QuickLink href="/discounts/new" title="New promo code" desc="Percentage or flat offer" />
          <QuickLink
            href="/homepage/best-sellers"
            title="Curate homepage"
            desc="Best sellers & festive edit"
          />
        </div>
      </div>

      <p className="text-center text-[11px] text-[#7a736c]">
        All figures are live from the database. Empty metrics show as 0 — no sample data.
      </p>
    </div>
  );
}
