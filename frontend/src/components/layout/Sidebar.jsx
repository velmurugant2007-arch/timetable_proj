'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Search, Command, Menu } from 'lucide-react';
import { NAV } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

/** Sidebar — prototype lines 450-520, adapted for Next.js routing */
export default function Sidebar({ onOpenPalette }) {
  const pathname = usePathname();
  const { staleCount } = useApp();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm lg:hidden print:hidden"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`fixed z-50 flex h-full w-64 flex-col border-r border-[#A89A8D] bg-[#BCAEA3] transition-transform lg:static lg:translate-x-0 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-white/20 shadow-sm p-1">
            <img src="/images/psnalog.png" alt="PSNA Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-display text-[15px] font-bold leading-tight text-white">PSNA CET</p>
            <p className="font-display text-[13px] font-bold leading-tight text-white/90">CSE DEPARTMENT</p>
            <p className="font-display text-[11px] font-bold leading-tight text-white/80 uppercase">TIME TABLE GENERATOR</p>
          </div>
        </div>

        {/* Quick jump */}
        <div className="px-3 pt-4">
          <button
            onClick={onOpenPalette}
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Quick jump…</span>
            <kbd className="flex items-center gap-0.5 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">
              <Command size={10} />K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.key}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} className={active ? 'text-white' : 'text-white/60 group-hover:text-white'} />
                {n.label}
                {n.key === 'timetables' && staleCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] font-bold text-[#BCAEA3]">
                    {staleCount}
                  </span>
                )}
              </Link>
            );
          })}
          {/* Abstract link */}
          <Link
            href="/abstract"
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <CalendarDays size={17} />
            Abstract
          </Link>
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/10 px-3.5 py-3">
            <p className="text-xs font-semibold text-white/60">Signed in as</p>
            <p className="text-sm font-semibold text-white">{user?.name || 'Admin'}, {user?.college || 'PSNA CET'}</p>
            <button onClick={logout} className="mt-2 text-xs font-medium text-white/80 hover:text-white transition">
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
