import React from 'react';
import Link from 'next/link';
import { getCurrentUser, logoutAction } from '@/app/actions/auth';
import { Activity, LogOut } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/api/auth/clear');
  }

  const companyName = user.companyName || 'Event Organizer';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight text-white flex items-center gap-2 hover:opacity-95">
              <Activity className="w-6 h-6 text-indigo-500" />
              <span>EventFlow</span>
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-slate-800" />
            <span className="hidden sm:inline-block text-sm font-medium text-slate-400">
              {companyName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-medium">
              EO Panel
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg transition duration-150 flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
