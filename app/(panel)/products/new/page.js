'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import { getMeta } from '@/lib/repository';

export default function NewProductPage() {
  const router = useRouter();
  const [meta, setMeta] = useState({ categories: [], collections: [] });
  const [allProducts, setAllProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMeta(getMeta());
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
    fetch('/api/catalog/products')
      .then((r) => r.json())
      .then((d) => setAllProducts(d.products || []))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/products" className="font-label text-[10px] text-[#7a736c] hover:text-[#5e062a]">
          ← Products
        </Link>
        <h1 className="font-display mt-2 text-4xl">Add product</h1>
        <p className="mt-2 text-sm text-[#7a736c]">
          Saves to Supabase. Storefront shows these when live; otherwise keeps dummy catalog.
        </p>
      </div>
      {error && <p className="text-sm text-[#5e062a]">{error}</p>}
      <ProductForm
        initial={null}
        lockSlug={false}
        categories={meta.categories}
        collections={meta.collections}
        allProducts={allProducts}
        saving={saving}
        onSave={async (next) => {
          setSaving(true);
          setError('');
          try {
            const res = await fetch('/api/catalog/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(next),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            router.replace(`/products/${data.product.slug}`);
          } catch (err) {
            setError(err.message);
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
