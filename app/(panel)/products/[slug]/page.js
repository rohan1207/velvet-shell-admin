'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import { getMeta } from '@/lib/repository';
import { LoadingBlock } from '@/components/LoadingSpinner';

export default function EditProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [meta, setMeta] = useState({ categories: [], collections: [] });
  const [allProducts, setAllProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMeta(getMeta());
    Promise.all([
      fetch(`/api/catalog/products/${slug}`).then((r) => r.json()),
      fetch('/api/catalog/products').then((r) => r.json()),
      fetch('/api/catalog/categories').then((r) => r.json()).catch(() => ({})),
      fetch('/api/catalog/collections').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([one, list, cats, cols]) => {
        if (one.product) setProduct(one.product);
        else setError(one.error || 'Product not found');
        setAllProducts(list.products || []);
        setMeta((m) => ({
          ...m,
          ...(cats.categories?.length
            ? { categories: cats.categories.map((c) => ({ slug: c.slug, name: c.name })) }
            : {}),
          ...(cols.collections?.length ? { collections: cols.collections } : {}),
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <LoadingBlock label="Loading product…" />;
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Link href="/products" className="font-label text-[10px] text-[#7a736c]">
          ← Products
        </Link>
        <p className="text-[#5e062a]">{error || 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/products" className="font-label text-[10px] text-[#7a736c] hover:text-[#5e062a]">
            ← Products
          </Link>
          <h1 className="font-display mt-2 text-4xl">{product.name}</h1>
        </div>
        <button
          type="button"
          className="text-xs text-[#5e062a]"
          onClick={async () => {
            if (!confirm('Delete this product family and all color variants?')) return;
            const res = await fetch(`/api/catalog/products/${product.id}`, { method: 'DELETE' });
            if (res.ok) router.replace('/products');
          }}
        >
          Delete
        </button>
      </div>
      {error && <p className="text-sm text-[#5e062a]">{error}</p>}
      <ProductForm
        initial={product}
        lockSlug
        categories={meta.categories}
        collections={meta.collections}
        allProducts={allProducts}
        saving={saving}
        onSave={async (next) => {
          setSaving(true);
          setError('');
          try {
            const res = await fetch(`/api/catalog/products/${product.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(next),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            setProduct(data.product);
            setSaving(false);
          } catch (err) {
            setError(err.message);
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
