export default function LoadingSpinner({
  label = 'Loading…',
  className = '',
  size = 'md',
}) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5 border-2' : 'h-5 w-5 border-2';
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-[#7a736c] ${className}`}>
      <span
        className={`${dim} animate-spin rounded-full border-[#5e062a]/20 border-t-[#5e062a]`}
        aria-hidden
      />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-[#2d2b2b]/8 bg-white">
      <LoadingSpinner label={label} />
    </div>
  );
}
