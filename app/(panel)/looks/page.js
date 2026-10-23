'use client';

import { useEffect, useState } from 'react';
import LookEditor from '@/components/LookEditor';
import seed from '@/data/seed.json';
import { listLooks, saveLook } from '@/lib/repository';

export default function LooksPage() {
  const [looks, setLooks] = useState(() => seed.looks || []);

  useEffect(() => {
    setLooks(listLooks());
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-label text-[10px] text-[#d4af64]">Homepage</p>
        <h1 className="font-display mt-2 text-4xl">Shop by look</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#7a736c]">
          Two look images for the storefront. Upload each photo in full (no crop), turn on Mark, click
          to place a radiating dot, attach a product, then save.
        </p>
      </div>

      {looks.length === 0 && (
        <p className="text-sm text-[#7a736c]">No looks seeded yet. Run <code>npm run seed</code> in admin.</p>
      )}

      <div className="space-y-8">
        {looks.map((look) => (
          <LookEditor
            key={look.id}
            look={look}
            onSave={(next) => {
              const saved = saveLook(next);
              setLooks(listLooks());
              return saved;
            }}
          />
        ))}
      </div>
    </div>
  );
}
