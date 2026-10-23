'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getMeta } from '@/lib/repository';
import { labelCategory, labelCollection, money } from '@/lib/format';

function toRow(family) {
  const primary =
    family.variants?.find((v) => v.isPrimary) || family.variants?.[0] || {};
  return {
    id: family.id,
    slug: family.slug,
    name: family.name,
    category: family.category,
    collection: family.collection,
    status: family.status,
    price: primary.price || 0,
    stock: primary.stock || 0,
    outOfStock: !!primary.outOfStock,
    image: primary.heroUrl || '',
    colors: family.hasColorVariants ? family.variants?.length || 0 : 0,
  };
}

function ProductsInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [collection, setCollection] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [stock, setStock] = useState(searchParams.get('stock') || '');
  const [meta, setMeta] = useState({ categories: [], collections: [] });
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMeta(getMeta());
    fetch('/api/catalog/products')
      .then((r) => r.json())
      .then((d) => {
        setRows((d.products || []).map(toRow));
        setSource(d.source || '');
        if (d.error) setError(d.error);
      })
      .catch((err) => setError(err.message));
    fetch('/api/catalog/categories')
      .then((r) => r.json())
      .then((d) => {
        if (d.categories?.length) {
          setMeta((m) => ({
            ...m,
            categories: d.categories.map((c) => ({ slug: c.slug, name: c.name })),
          }));
        }
      })
      .catch(() => {});
    fetch('/api/catalog/collections')
      .then((r) => r.json())
      .then((d) => {
        if (d.collections?.length) {
          setMeta((m) => ({ ...m, collections: d.collections }));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((p) =>
        [p.name, p.slug, p.category, p.collection].join(' ').toLowerCase().includes(query)
      );
    }
    if (category) list = list.filter((p) => p.category === category);
    if (collection) list = list.filter((p) => p.collection === collection);
    if (status) list = list.filter((p) => p.status === status);
    if (stock === 'low') {
      list = list.filter((p) => !p.outOfStock && p.stock > 0 && p.stock <= 3);
    } else if (stock === 'out') {
      list = list.filter((p) => p.outOfStock || p.stock <= 0);
    } else if (stock === 'in') {
      list = list.filter((p) => !p.outOfStock && p.stock > 3);
    }
    return list;
  }, [rows, q, category, collection, status, stock]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Catalogue</p>
          <h1 className="font-display mt-2 text-4xl">Products</h1>
          <p className="font-num mt-1 text-sm text-[#7a736c]">
            {filtered.length} families
            {source ? ` · ${source}` : ''}
          </p>
          {error && (
            <p className="mt-2 max-w-xl text-sm text-[#5e062a]">
              {error.includes('schema') || error.includes('relation') || error.includes('does not exist')
                ? 'Run supabase/migrations/003_catalog_families.sql (or npm run db:migrate after adding DB password).'
                : error}
            </p>
          )}
        </div>
        <Link href="/products/new" className="btn-primary">
          Add product
        </Link>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4 md:p-5">
        <label className="block min-w-[180px] flex-1">
          <span className="text-xs text-[#7a736c]">Search</span>
          <input
            className="input mt-1"
            placeholder="Name or slug"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Category</span>
          <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {meta.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Collection</span>
          <select
            className="input mt-1"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            <option value="">All</option>
            {meta.collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Status</span>
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Stock</span>
          <select className="input mt-1" value={stock} onChange={(e) => setStock(e.target.value)}>
            <option value="">All</option>
            <option value="low">Low (≤ 3)</option>
            <option value="out">Out of stock</option>
            <option value="in">In stock</option>
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Collection</th>
              <th className="px-4 py-3 font-semibold">Colors</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2b2b]/6">
            {filtered.map((p) => (
              <tr key={p.slug} className="hover:bg-[#faf7f2]/80">
                <td className="px-4 py-3">
                  <Link href={`/products/${p.slug}`} className="flex items-center gap-3">
                    <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-[#ebe3da]">
                      {p.image ? (
                        <Image src={p.image} alt="" fill className="object-cover" sizes="40px" unoptimized />
                      ) : null}
                    </span>
                    <span>
                      <span className="block font-medium text-[#2d2b2b]">{p.name}</span>
                      <span className="block text-xs text-[#7a736c]">{p.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="font-num px-4 py-3">{money(p.price)}</td>
                <td className="px-4 py-3">{labelCategory(p.category, meta.categories)}</td>
                <td className="px-4 py-3">{labelCollection(p.collection, meta.collections)}</td>
                <td className="font-num px-4 py-3">{p.colors || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      p.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="font-num px-4 py-3">
                  {p.outOfStock || p.stock <= 0 ? (
                    <span className="text-[#5e062a]">Out</span>
                  ) : p.stock <= 3 ? (
                    <span className="text-amber-700">{p.stock} low</span>
                  ) : (
                    p.stock
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#7a736c]">
                  No products yet.{' '}
                  <Link href="/products/new" className="text-[#5e062a]">
                    Add the first piece
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#7a736c]">Loading…</p>}>
      <ProductsInner />
    </Suspense>
  );
}
