'use client';

import { useMemo, useState } from 'react';

const SCOPES = [
  {
    id: 'all',
    title: 'Entire catalogue',
    line: 'Applies to every product in the shop.',
  },
  {
    id: 'category',
    title: 'Category',
    line: 'Necklaces, rings, earrings…',
  },
  {
    id: 'collection',
    title: 'Collection',
    line: 'Shell Edit, Lumen Line, Atelier…',
  },
  {
    id: 'products',
    title: 'Selected products',
    line: 'Pick exact pieces with search.',
  },
];

export default function DiscountScopePicker({
  scope,
  scopeValues = [],
  onScopeChange,
  onValuesChange,
  categories = [],
  collections = [],
  products = [],
}) {
  const [q, setQ] = useState('');

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) =>
      [p.name, p.slug, p.category].join(' ').toLowerCase().includes(query)
    );
  }, [products, q]);

  function toggleValue(value) {
    const set = new Set(scopeValues);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    onValuesChange([...set]);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {SCOPES.map((item) => {
          const active = scope === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onScopeChange(item.id);
                if (item.id === 'all') onValuesChange([]);
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? 'border-[#5e062a] bg-[#5e062a] text-white shadow-lg'
                  : 'border-[#2d2b2b]/10 bg-white hover:border-[#5e062a]/35'
              }`}
            >
              <p className={`font-label text-[10px] ${active ? 'text-[#d4af64]' : 'text-[#7a736c]'}`}>
                Applies to
              </p>
              <p className="mt-2 font-medium">{item.title}</p>
              <p className={`mt-1 text-xs font-light ${active ? 'text-white/75' : 'text-[#7a736c]'}`}>
                {item.line}
              </p>
            </button>
          );
        })}
      </div>

      {scope === 'category' && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = scopeValues.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleValue(c.slug)}
                className={`rounded-full px-4 py-2 text-xs transition ${
                  on ? 'bg-[#5e062a] text-white' : 'bg-[#faf7f2] text-[#2d2b2b]'
                }`}
              >
                {c.name}
              </button>
            );
          })}
          {!categories.length && (
            <p className="text-sm text-[#7a736c]">No categories yet — add some under Categories.</p>
          )}
        </div>
      )}

      {scope === 'collection' && (
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => {
            const on = scopeValues.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleValue(c.slug)}
                className={`rounded-full px-4 py-2 text-xs transition ${
                  on ? 'bg-[#5e062a] text-white' : 'bg-[#faf7f2] text-[#2d2b2b]'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {scope === 'products' && (
        <div className="space-y-3 rounded-2xl border border-[#2d2b2b]/10 bg-[#faf7f2]/60 p-4">
          <input
            className="input"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <p className="text-xs text-[#7a736c]">
            {scopeValues.length} selected · {filteredProducts.length} shown
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const on = scopeValues.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    on ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleValue(p.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-xs text-[#7a736c]">
                      {p.category} · {p.slug}
                    </span>
                  </span>
                </label>
              );
            })}
            {!filteredProducts.length && (
              <p className="py-6 text-center text-sm text-[#7a736c]">No products match.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
