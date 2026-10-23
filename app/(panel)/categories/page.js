'use client';

import { useEffect, useState } from 'react';

export default function CategoriesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', line: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const res = await fetch('/api/catalog/categories');
    const data = await res.json();
    setRows(data.categories || []);
    if (!res.ok) setError(data.error || 'Could not load categories');
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-4xl">Categories</h1>
        <p className="mt-2 text-sm text-[#7a736c]">
          Used in the product form and storefront filters (necklaces, rings, …).
        </p>
      </div>

      {(error || notice) && (
        <p className={`text-sm ${error ? 'text-[#5e062a]' : 'text-[#7a736c]'}`}>{error || notice}</p>
      )}

      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setNotice('');
          const res = await fetch('/api/catalog/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Save failed');
            return;
          }
          setNotice('Category saved.');
          setForm({ name: '', slug: '', line: '' });
          load();
        }}
      >
        <p className="font-label text-[10px] text-[#7a736c]">Add / update category</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-[#7a736c]">Name</span>
            <input
              className="input mt-1"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Slug (optional)</span>
            <input
              className="input mt-1"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="auto from name"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-[#7a736c]">Line</span>
            <input
              className="input mt-1"
              value={form.line}
              onChange={(e) => setForm((f) => ({ ...f, line: e.target.value }))}
            />
          </label>
        </div>
        <button type="submit" className="btn-primary">
          Save category
        </button>
      </form>

      <ul className="divide-y divide-[#2d2b2b]/8 rounded-[1.5rem] border border-[#2d2b2b]/8 bg-white">
        {rows.map((c) => (
          <li key={c.slug} className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <p className="font-medium text-[#2d2b2b]">{c.name}</p>
              <p className="text-xs text-[#7a736c]">{c.slug}</p>
              {c.line && <p className="mt-1 text-sm font-light text-[#7a736c]">{c.line}</p>}
            </div>
          </li>
        ))}
        {!rows.length && (
          <li className="px-5 py-8 text-sm text-[#7a736c]">
            No categories yet — run migration 003 or add one above.
          </li>
        )}
      </ul>
    </div>
  );
}
