'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DiscountForm from '@/components/DiscountForm';
import { getMeta } from '@/lib/repository';

function NewDiscountInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialMode = search.get('type') === 'bulk' ? 'bulk' : 'code';
  const [mode, setMode] = useState(initialMode);
  const [meta, setMeta] = useState({ categories: [], collections: [] });
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(search.get('type') === 'bulk' ? 'bulk' : 'code');
  }, [search]);

  useEffect(() => {
    setMeta(getMeta());
    Promise.all([
      fetch('/api/catalog/categories').then((r) => r.json()).catch(() => ({})),
      fetch('/api/catalog/products').then((r) => r.json()).catch(() => ({})),
    ]).then(([cats, prods]) => {
      if (cats.categories?.length) {
        setMeta((m) => ({
          ...m,
          categories: cats.categories.map((c) => ({ slug: c.slug, name: c.name })),
        }));
      }
      setProducts(
        (prods.products || []).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
        }))
      );
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/discounts" className="font-label text-[10px] text-[#7a736c] hover:text-[#5e062a]">
          ← Discounts
        </Link>
        <h1 className="font-display mt-2 text-4xl">Create discount</h1>
        <p className="mt-2 text-sm font-light text-[#7a736c]">
          Promo codes for checkout, or automatic bulk tiers when customers buy more.
        </p>
      </div>

      <div className="flex gap-2 rounded-full bg-white p-1 border border-[#2d2b2b]/8 w-fit">
        <button
          type="button"
          onClick={() => {
            setMode('code');
            router.replace('/discounts/new');
          }}
          className={`rounded-full px-5 py-2 text-xs ${
            mode === 'code' ? 'bg-[#5e062a] text-white' : 'text-[#2d2b2b]'
          }`}
        >
          Promo code
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('bulk');
            router.replace('/discounts/new?type=bulk');
          }}
          className={`rounded-full px-5 py-2 text-xs ${
            mode === 'bulk' ? 'bg-[#5e062a] text-white' : 'text-[#2d2b2b]'
          }`}
        >
          Bulk buy tiers
        </button>
      </div>

      {error && <p className="text-sm text-[#5e062a]">{error}</p>}

      <DiscountForm
        key={mode}
        mode={mode}
        categories={meta.categories}
        collections={meta.collections}
        products={products}
        saving={saving}
        onSave={async (payload) => {
          setSaving(true);
          setError('');
          try {
            const res = await fetch('/api/catalog/discounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            router.replace(`/discounts/${data.discount.kind}/${data.discount.id}`);
          } catch (err) {
            setError(err.message);
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

export default function NewDiscountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#7a736c]">Loading…</p>}>
      <NewDiscountInner />
    </Suspense>
  );
}
