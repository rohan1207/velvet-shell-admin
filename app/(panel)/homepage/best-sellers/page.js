'use client';

import CurationPicker from '@/components/CurationPicker';

export default function BestSellersPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-label text-[10px] text-[#d4af64]">Homepage</p>
        <h1 className="font-display mt-2 text-4xl">Best sellers</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#7a736c]">
          Choose products for the Best of Velvet Shell strip. Filter by category or collection,
          search, select with checkboxes, then save.
        </p>
      </div>
      <CurationPicker
        slug="best-sellers"
        eyebrow="Best sellers"
        title="Best of Velvet Shell"
        line="The pieces guests return for — a quiet house edit across form and metal."
      />
    </div>
  );
}
