'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveBlog } from '@/lib/repository';
import { slugify } from '@/lib/format';

export default function NewBlogPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    eyebrow: '',
    excerpt: '',
    body: '',
    image: '',
    status: 'draft',
    publishedAt: '',
    read: '3 min',
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/blogs" className="font-label text-[10px] text-[#7a736c]">
          ← Blogs
        </Link>
        <h1 className="font-display mt-2 text-4xl">Add blog</h1>
      </div>
      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const next = { ...form, slug: slugify(form.title) };
          saveBlog(next);
          router.replace(`/blogs/${next.slug}`);
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
          <input className="input mt-1 bg-[#faf7f2]" readOnly value={slugify(form.title)} />
        </label>
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
          <span className="text-xs text-[#7a736c]">Cover image URL</span>
          <input
            className="input mt-1"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Excerpt</span>
          <textarea
            className="input mt-1 min-h-20 rounded-2xl"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[#7a736c]">Body</span>
          <textarea
            className="input mt-1 min-h-48 rounded-2xl"
            value={form.body}
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
