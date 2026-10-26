'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SetForm from '@/components/SetForm';
import { LoadingBlock } from '@/components/LoadingSpinner';

export default function EditSetPage() {
  const { id } = useParams();
  const [set, setSet] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sets/${id}`, { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Not found');
        if (!cancelled) setSet(data.set);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <LoadingBlock label="Loading set…" />;
  if (error || !set) return <p className="text-[#5e062a]">{error || 'Not found'}</p>;
  return <SetForm initial={set} />;
}
