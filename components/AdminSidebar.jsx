'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pendingOrderCount } from '@/lib/repository';

const links = [
  { href: '/', label: 'Dashboard', icon: 'grid' },
  { href: '/products', label: 'Products', icon: 'box' },
  { href: '/sets', label: 'Sets', icon: 'layers' },
  { href: '/categories', label: 'Categories', icon: 'tag' },
  { href: '/homepage/festive-edit', label: 'Festive Edit', icon: 'spark' },
  { href: '/homepage/best-sellers', label: 'Best sellers', icon: 'star' },
  { href: '/discounts', label: 'Discounts', icon: 'percent' },
  { href: '/orders', label: 'Orders', icon: 'bag', badge: true },
  { href: '/customers', label: 'Customers', icon: 'users' },
  { href: '/looks', label: 'Shop by look', icon: 'look' },
  { href: '/blogs', label: 'Blogs', icon: 'doc' },
  { href: '/testimonials', label: 'Testimonials', icon: 'quote' },
];

function NavIcon({ name, className = 'h-[18px] w-[18px]' }) {
  const props = { className, fill: 'none', viewBox: '0 0 24 24', 'aria-hidden': true };
  switch (name) {
    case 'grid':
      return (
        <svg {...props}>
          <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'box':
      return (
        <svg {...props}>
          <path d="M12 3 4.5 7v10L12 21l7.5-4V7L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 12 4.5 7M12 12l7.5-5M12 12v9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...props}>
          <path d="M3 12V4h8l10 10-8 8L3 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...props}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <path d="m12 3 2.4 5.4 5.8.6-4.4 3.9 1.3 5.7L12 15.8 6.9 18.6l1.3-5.7L3.8 9l5.8-.6L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'percent':
      return (
        <svg {...props}>
          <path d="m6 18 12-12M8.5 8.5h.01M15.5 15.5h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="15.5" cy="15.5" r="2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'bag':
      return (
        <svg {...props}>
          <path d="M6 8h12l-.8 12H6.8L6 8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 14.5c2 .3 3.5 1.5 4 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'look':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...props}>
          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 3v4h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'quote':
      return (
        <svg {...props}>
          <path d="M8 17c-2 0-3.5-1.5-3.5-3.5S6.5 10 8 10V7C5 7 2.5 9.5 2.5 13.5 2.5 16.5 5 19 8 19v-2Zm10 0c-2 0-3.5-1.5-3.5-3.5S16.5 10 18 10V7c-3 0-5.5 2.5-5.5 6.5C12.5 16.5 15 19 18 19v-2Z" fill="currentColor" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...props}>
          <path
            d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5M21 17l-9 5-9-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

function IconHamburger({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconClose({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminSidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    function refresh() {
      setPending(pendingOrderCount());
    }
    refresh();
    window.addEventListener('vs-admin-store', refresh);
    return () => window.removeEventListener('vs-admin-store', refresh);
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const desktopCollapsed = collapsed;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Fixed sidebar — does not scroll with page content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-white/8 bg-[#141217] text-[#f5eee8] transition-[width,transform] duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${desktopCollapsed ? 'lg:w-[72px]' : 'lg:w-[248px]'}`}
      >
        {/* Expanded / mobile: brand + close/collapse (X) top-right */}
        <div
          className={`shrink-0 items-center gap-3 border-b border-white/8 px-4 py-4 ${
            desktopCollapsed ? 'flex lg:hidden' : 'flex'
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5e062a] text-[11px] font-semibold tracking-wide text-white">
            VS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">Velvet Shell</p>
            <p className="truncate text-[11px] text-white/45">Admin</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
                onClose?.();
                return;
              }
              onToggleCollapse?.();
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white"
            aria-label="Close or collapse sidebar"
            title="Collapse"
          >
            <IconClose />
          </button>
        </div>

        {/* Collapsed desktop: hamburger to reopen */}
        <div
          className={`shrink-0 flex-col items-center gap-2 border-b border-white/8 py-3 ${
            desktopCollapsed ? 'hidden lg:flex' : 'hidden'
          }`}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white"
            aria-label="Expand sidebar"
            title="Expand"
          >
            <IconHamburger />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#5e062a] text-[10px] font-semibold text-white">
            VS
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {links.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                } ${desktopCollapsed ? 'lg:justify-center' : ''}`}
              >
                <span className={`shrink-0 ${active ? 'text-[#d4af64]' : 'text-white/45 group-hover:text-white/70'}`}>
                  <NavIcon name={link.icon} />
                </span>
                <span className={`min-w-0 flex-1 truncate ${desktopCollapsed ? 'lg:hidden' : ''}`}>
                  {link.label}
                </span>
                {link.badge && pending > 0 ? (
                  <span
                    className={`font-num flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d4af64] px-1.5 text-[10px] font-semibold text-[#141217] ${
                      desktopCollapsed ? 'lg:hidden' : ''
                    }`}
                  >
                    {pending}
                  </span>
                ) : null}
                {desktopCollapsed && link.badge && pending > 0 ? (
                  <span className="absolute right-2 top-1.5 hidden h-1.5 w-1.5 rounded-full bg-[#d4af64] lg:block" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/8 p-2">
          <button
            type="button"
            onClick={logout}
            title="Log out"
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] text-white/55 transition hover:bg-white/5 hover:text-white ${
              desktopCollapsed ? 'lg:justify-center' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" aria-hidden>
              <path
                d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2M15 12H3m0 0 3-3m-3 3 3 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={desktopCollapsed ? 'lg:hidden' : ''}>Log out</span>
          </button>
        </div>
      </aside>

      {/* Desktop spacer so main content doesn't sit under fixed sidebar */}
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out lg:block ${
          desktopCollapsed ? 'w-[72px]' : 'w-[248px]'
        }`}
        aria-hidden
      />
    </>
  );
}
