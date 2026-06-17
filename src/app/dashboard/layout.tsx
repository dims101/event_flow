import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Dashboard',
};
import Link from 'next/link';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { EventFlowLogo } from '@/components/EventFlowLogo';
import { LogoutButton } from './_components/LogoutButton';

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
            <Link href="/dashboard" className="hidden sm:flex items-center hover:opacity-95 select-none" aria-label="EventFlow Dashboard">
              <EventFlowLogo className="h-6 md:h-7 w-auto" />
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-slate-800" />
            <span className="inline-block text-2xl sm:text-xl font-normal font-cursive text-slate-100">
              {companyName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LogoutButton />
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
