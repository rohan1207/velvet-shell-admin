'use client';

import { useRef, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Direct file upload to /api/upload (R2). No URL paste required.
 */
export default function ImageUploadField({
  label = 'Image',
  value = '',
  onChange,
  folder = 'media',
  accept = 'image/*',
  className = '',
  previewClassName = 'h-36 w-full rounded-xl object-cover',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function onFile(file) {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', folder);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange?.(data.url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#7a736c]">{label}</p>
        {uploading ? <LoadingSpinner size="sm" label="Uploading…" /> : null}
      </div>

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-[#2d2b2b]/8 bg-[#ebe3da]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className={previewClassName} />
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
              <LoadingSpinner label="Uploading…" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[#2d2b2b]/15 bg-[#faf7f2] text-sm text-[#7a736c]">
          {uploading ? <LoadingSpinner label="Uploading…" /> : 'No image yet'}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label
          className={`btn-ghost cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {value ? 'Replace image' : 'Upload image'}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {value ? (
          <button
            type="button"
            className="btn-ghost text-[#5e062a]"
            disabled={uploading}
            onClick={() => onChange?.('')}
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-[#5e062a]">{error}</p> : null}
    </div>
  );
}
