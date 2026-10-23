'use client';

import { useRef, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Direct file upload to /api/upload (R2).
 * Pass `multiple` to select and upload several images at once.
 * - single: value is a URL string, onChange(url)
 * - multiple: value is a URL string[], onChange(urls)
 */
export default function ImageUploadField({
  label = 'Image',
  value = '',
  onChange,
  folder = 'media',
  accept = 'image/*',
  multiple = false,
  className = '',
  previewClassName = 'h-36 w-full rounded-xl object-cover',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const urls = multiple
    ? (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean)
    : [];
  const singleUrl = multiple ? '' : String(value || '');

  async function uploadOne(file) {
    const body = new FormData();
    body.append('file', file);
    body.append('folder', folder);
    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  }

  async function onFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setError('');
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    try {
      if (!multiple) {
        setProgress({ current: 1, total: 1 });
        const url = await uploadOne(files[0]);
        onChange?.(url);
        return;
      }

      const uploaded = [];
      for (let i = 0; i < files.length; i += 1) {
        setProgress({ current: i + 1, total: files.length });
        uploaded.push(await uploadOne(files[i]));
      }
      const next = [...urls];
      for (const url of uploaded) {
        if (!next.includes(url)) next.push(url);
      }
      onChange?.(next);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index) {
    if (!multiple) {
      onChange?.('');
      return;
    }
    onChange?.(urls.filter((_, i) => i !== index));
  }

  const progressLabel =
    progress?.total > 1
      ? `Uploading ${progress.current} of ${progress.total}…`
      : 'Uploading…';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#7a736c]">{label}</p>
        {uploading ? <LoadingSpinner size="sm" label={progressLabel} /> : null}
      </div>

      {multiple ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {urls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative overflow-hidden rounded-xl border border-[#2d2b2b]/8 bg-[#ebe3da]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-28 w-full object-cover" />
              <button
                type="button"
                className="mt-0 w-full bg-white/90 px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#5e062a]"
                disabled={uploading}
                onClick={() => removeAt(index)}
              >
                Remove
              </button>
            </div>
          ))}
          {!urls.length && !uploading ? (
            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[#2d2b2b]/15 bg-[#faf7f2] text-sm text-[#7a736c] sm:col-span-3">
              No images yet
            </div>
          ) : null}
          {uploading && !urls.length ? (
            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[#2d2b2b]/15 bg-[#faf7f2] sm:col-span-3">
              <LoadingSpinner label={progressLabel} />
            </div>
          ) : null}
        </div>
      ) : singleUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-[#2d2b2b]/8 bg-[#ebe3da]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={singleUrl} alt="" className={previewClassName} />
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
              <LoadingSpinner label={progressLabel} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[#2d2b2b]/15 bg-[#faf7f2] text-sm text-[#7a736c]">
          {uploading ? <LoadingSpinner label={progressLabel} /> : 'No image yet'}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label
          className={`btn-ghost cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {multiple
            ? urls.length
              ? 'Add more images'
              : 'Upload images'
            : singleUrl
              ? 'Replace image'
              : 'Upload image'}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            disabled={uploading}
            onChange={onFilesSelected}
          />
        </label>
        {!multiple && singleUrl ? (
          <button
            type="button"
            className="btn-ghost text-[#5e062a]"
            disabled={uploading}
            onClick={() => onChange?.('')}
          >
            Remove
          </button>
        ) : null}
        {multiple && urls.length > 0 ? (
          <button
            type="button"
            className="btn-ghost text-[#5e062a]"
            disabled={uploading}
            onClick={() => onChange?.([])}
          >
            Clear all
          </button>
        ) : null}
      </div>
      {multiple ? (
        <p className="text-[11px] text-[#7a736c]">Select multiple files in the picker at once.</p>
      ) : null}
      {error ? <p className="text-xs text-[#5e062a]">{error}</p> : null}
    </div>
  );
}
