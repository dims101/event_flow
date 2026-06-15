'use client';

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FileText, Sliders } from 'lucide-react';

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
      <div className="border-b border-slate-900/40 flex items-center gap-1 w-full overflow-x-auto scrollbar-none">
        <button
          onClick={() => setTab('builder')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 shrink-0 cursor-pointer min-h-[40px] select-none ${
            currentTab === 'builder'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Susun Rundown</span>
        </button>
        <button
          onClick={() => setTab('control')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 shrink-0 cursor-pointer min-h-[40px] select-none ${
            currentTab === 'control'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Pusat Kendali Hari-H</span>
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
