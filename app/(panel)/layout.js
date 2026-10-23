'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

const COLLAPSE_KEY = 'vs-admin-sidebar-collapsed';

export default function PanelLayout({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const crumb = pathname === '/' ? 'Dashboard' : pathname.replace(/^\//, '').replace(/\//g, ' / ');

  return (
    <div className="flex min-h-screen bg-[#f4f2ef] text-[#2d2b2b]">
      <AdminSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#2d2b2b]/8 bg-[#f4f2ef]/90 px-4 backdrop-blur-md md:px-6">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#2d2b2b]/10 bg-white text-[#2d2b2b] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] tracking-[0.14em] text-[#7a736c] uppercase">{crumb}</p>
          </div>
          <p className="hidden text-[11px] text-[#7a736c] sm:block">Catalogue · Commerce · Content</p>
        </header>
        <main className="flex-1 px-4 py-6 md:px-7 md:py-7">{children}</main>
      </div>
    </div>
  );
}
