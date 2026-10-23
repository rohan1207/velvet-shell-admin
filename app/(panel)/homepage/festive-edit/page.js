'use client';

import CurationPicker from '@/components/CurationPicker';

export default function FestiveEditPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-label text-[10px] text-[#d4af64]">Homepage</p>
        <h1 className="font-display mt-2 text-4xl">Festive Edit</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#7a736c]">
          Choose products for the Seasonal / Festive Edit strip on the storefront. Filter, search,
          tick products, then save.
        </p>
      </div>
      <CurationPicker
        slug="festive-edit"
        eyebrow="Seasonal"
        title="Festive Edit"
        line="A celebratory selection — blooms, metals and forms for the season’s quiet shine."
      />
    </div>
  );
}
