'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listBlogs } from '@/lib/repository';

export default function BlogsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let blogs = listBlogs();
    if (status) blogs = blogs.filter((b) => b.status === status);
    setRows(blogs);
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-[10px] text-[#d4af64]">Content</p>
          <h1 className="font-display mt-2 text-4xl">Blogs</h1>
        </div>
        <Link href="/blogs/new" className="btn-primary">
          Add blog
        </Link>
      </div>

      <div className="card p-4">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="live">Live</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#2d2b2b]/8 bg-[#faf7f2] text-[10px] tracking-[0.14em] text-[#7a736c] uppercase">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d2b2b]/6">
            {rows.map((b) => (
              <tr key={b.slug} className="hover:bg-[#faf7f2]/80">
                <td className="px-4 py-3">
                  <Link href={`/blogs/${b.slug}`} className="font-medium text-[#5e062a] hover:underline">
                    {b.title}
                  </Link>
                  <p className="text-xs text-[#7a736c]">{b.slug}</p>
                </td>
                <td className="px-4 py-3 capitalize">{b.status}</td>
                <td className="px-4 py-3 text-[#7a736c]">{b.publishedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
