'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getBlog, saveBlog } from '@/lib/repository';
import { slugify } from '@/lib/format';

export default function BlogEditPage() {
  const { slug } = useParams();
  const router = useRouter();
  const isNew = slug === 'new';
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm({
        slug: '',
        title: '',
        eyebrow: '',
        excerpt: '',
        body: '',
        image: '',
        status: 'draft',
        publishedAt: '',
        read: '3 min',
      });
    } else {
      setForm(getBlog(slug) || { missing: true });
    }
  }, [slug, isNew]);

  if (!form) return <p className="text-sm text-[#7a736c]">Loading…</p>;
  if (form.missing) {
    return (
      <p className="text-sm text-[#7a736c]">
        Blog not found. <Link href="/blogs">Back to blogs</Link>
      </p>
    );
  }

  const lockedSlug = !isNew;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Link href="/blogs" className="font-label text-[10px] text-[#7a736c]">
            ← Blogs
          </Link>
          <h1 className="font-display mt-2 text-4xl">{isNew ? 'Add blog' : 'Edit blog'}</h1>
        </div>
        {saved && <p className="text-sm text-emerald-700">Saved</p>}
      </div>

      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const next = {
            ...form,
            slug: lockedSlug ? form.slug : slugify(form.title),
          };
          saveBlog(next);
          setSaved(true);
          if (isNew) router.replace(`/blogs/${next.slug}`);
          setTimeout(() => setSaved(false), 1500);
        }}
      >
        <label className="block">
          <span className="text-xs text-[#7a736c]">Title</span>
          <input
            className="input mt-1"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Slug</span>
          <input
            className="input mt-1 bg-[#faf7f2]"
            readOnly
            value={lockedSlug ? form.slug : slugify(form.title)}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-[#7a736c]">Status</span>
            <select
              className="input mt-1"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="live">Live</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#7a736c]">Published label</span>
            <input
              className="input mt-1"
              value={form.publishedAt || ''}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Eyebrow</span>
          <input
            className="input mt-1"
            value={form.eyebrow || ''}
            onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Cover image URL</span>
          <input
            className="input mt-1"
            value={form.image || ''}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Excerpt</span>
          <textarea
            className="input mt-1 min-h-20 rounded-2xl"
            value={form.excerpt || ''}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Body</span>
          <textarea
            className="input mt-1 min-h-48 rounded-2xl"
            value={form.body || ''}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <button type="submit" className="btn-primary">
          Save blog
        </button>
      </form>
    </div>
  );
}
