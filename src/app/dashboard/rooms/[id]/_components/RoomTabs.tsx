'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface RoomTabsProps {
  rundownBuilder: React.ReactNode;
  controlCenter: React.ReactNode;
  sharePanel: React.ReactNode;
}

export default function RoomTabs({ rundownBuilder, controlCenter, sharePanel }: RoomTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const currentTab = searchParams.get('tab') || 'builder';

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="border-b border-slate-900 flex items-center gap-1">
        <button
          onClick={() => setTab('builder')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 ${
            currentTab === 'builder'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📝 Susun Rundown
        </button>
        <button
          onClick={() => setTab('control')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 ${
            currentTab === 'control'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🎛️ Pusat Kendali Hari-H
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4 animate-in fade-in duration-200">
        {currentTab === 'builder' ? (
          <div className="space-y-6">{rundownBuilder}</div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <div>{controlCenter}</div>
            <div className="border-t border-slate-900 pt-8">{sharePanel}</div>
          </div>
        )}
      </div>
    </div>
  );
}
