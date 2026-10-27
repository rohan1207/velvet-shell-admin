'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { money } from '@/lib/format';

function toRow(family) {
  const primary = family.variants?.find((v) => v.isPrimary) || family.variants?.[0] || {};
  return {
    id: family.id,
    slug: family.slug,
    name: family.name,
    category: family.category || '',
    collection: family.collection || '',
    status: family.status,
    price: primary.price || 0,
    image: primary.heroUrl || '',
  };
}

export default function CurationPicker({
  slug,
  eyebrow: initialEyebrow,
  title: initialTitle,
  line: initialLine,
}) {
  const [eyebrow, setEyebrow] = useState(initialEyebrow || '');
  const [title, setTitle] = useState(initialTitle || '');
  const [line, setLine] = useState(initialLine || '');
  const [selected, setSelected] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [collection, setCollection] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/catalog/curations?slug=${encodeURIComponent(slug)}`).then((r) => r.json()),
      fetch('/api/catalog/products').then((r) => r.json()),
      fetch('/api/catalog/categories').then((r) => r.json()),
      fetch('/api/catalog/collections').then((r) => r.json()),
    ])
      .then(([cur, prod, cats, cols]) => {
        if (cancelled) return;
        if (cur.error) setError(cur.error);
        const c = cur.curation;
        if (c) {
          setEyebrow(c.eyebrow || '');
          setTitle(c.title || '');
          setLine(c.line || '');
          setSelected(Array.isArray(c.productSlugs) ? c.productSlugs : []);
        }
        setProducts((prod.products || []).map(toRow));
        setCategories(
          (cats.categories || []).map((x) => ({ slug: x.slug, name: x.name }))
        );
        setCollections(cols.collections || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const filtered = useMemo(() => {
    let list = products;
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((p) =>
        [p.name, p.slug, p.category, p.collection].join(' ').toLowerCase().includes(query)
      );
    }
    if (category === 'accessories') {
      list = list.filter((p) =>
        ['brooches', 'chains', 'chokers'].includes(p.category),
      );
    } else if (category) {
      list = list.filter((p) => p.category === category);
    }
    if (collection) list = list.filter((p) => p.collection === collection);
    return list;
  }, [products, q, category, collection]);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  const selectedRows = useMemo(
    () => selected.map((s) => bySlug.get(s)).filter(Boolean),
    [selected, bySlug]
  );

  function toggle(slugValue) {
    setSelected((prev) =>
      prev.includes(slugValue) ? prev.filter((s) => s !== slugValue) : [...prev, slugValue]
    );
    setNotice('');
  }

  function selectVisible() {
    const slugs = filtered.map((p) => p.slug);
    setSelected((prev) => [...new Set([...prev, ...slugs])]);
    setNotice('');
  }

  function clearVisible() {
    const drop = new Set(filtered.map((p) => p.slug));
    setSelected((prev) => prev.filter((s) => !drop.has(s)));
    setNotice('');
  }

  function move(slugValue, dir) {
    setSelected((prev) => {
      const i = prev.indexOf(slugValue);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/catalog/curations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          eyebrow,
          title,
          line,
          productSlugs: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSelected(data.curation?.productSlugs || selected);
      setNotice(`Saved ${data.curation?.productSlugs?.length || 0} products.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#7a736c]">Loading products…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-[#5e062a]">
          {/relation|does not exist|schema/i.test(error)
            ? 'Run npm run db:migrate (migration 006_homepage_curations.sql).'
            : error}
        </p>
      )}
      {notice && <p className="text-sm text-emerald-800">{notice}</p>}

      <div className="card grid gap-4 p-5 md:grid-cols-2">
        <label className="block">
          <span className="text-xs text-[#7a736c]">Eyebrow</span>
          <input className="input mt-1" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Title</span>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-[#7a736c]">Supporting line</span>
          <input className="input mt-1" value={line} onChange={(e) => setLine(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-num text-sm text-[#7a736c]">
          {selected.length} selected · showing {filtered.length} of {products.length}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={selectVisible}>
            Select visible
          </button>
          <button type="button" className="btn-ghost" onClick={clearVisible}>
            Clear visible
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-[#2d2b2b]/8 px-5 py-3">
            <p className="font-label text-[10px] text-[#7a736c]">Selected order (homepage)</p>
          </div>
          <ul className="divide-y divide-[#2d2b2b]/6">
            {selectedRows.map((p, i) => (
              <li key={p.slug} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="font-num w-6 text-[#7a736c]">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                <span className="font-num text-xs text-[#7a736c]">{p.slug}</span>
                <button type="button" className="text-xs text-[#5e062a]" onClick={() => move(p.slug, -1)}>
                  Up
                </button>
                <button type="button" className="text-xs text-[#5e062a]" onClick={() => move(p.slug, 1)}>
                  Down
                </button>
                <button type="button" className="text-xs text-[#7a736c]" onClick={() => toggle(p.slug)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            <option value="accessories">Accessories (brooches, chains, chokers)</option>
            {categories
              .filter((c) => !['brooches', 'chains', 'chokers'].includes(c.slug))
              .map((c) => (
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
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap max-h-[28rem] overflow-y-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3 w-10" />
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Collection</th>
              <th className="px-4 py-3 font-semibold">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2b2b]/6">
            {filtered.map((p) => {
              const checked = selected.includes(p.slug);
              return (
                <tr
                  key={p.slug}
                  className={`cursor-pointer hover:bg-[#faf7f2]/80 ${checked ? 'bg-[#5e062a]/5' : ''}`}
                  onClick={() => toggle(p.slug)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.slug)}
                      className="h-4 w-4 accent-[#5e062a]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md bg-[#ebe3da]">
                        {p.image ? (
                          <Image src={p.image} alt="" fill className="object-cover" sizes="32px" unoptimized />
                        ) : null}
                      </span>
                      <span>
                        <span className="block font-medium text-[#2d2b2b]">{p.name}</span>
                        <span className="font-num block text-xs text-[#7a736c]">{p.slug}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.category || '—'}</td>
                  <td className="px-4 py-3">{p.collection || '—'}</td>
                  <td className="font-num px-4 py-3">{money(p.price)}</td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#7a736c]">
                  No products match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
