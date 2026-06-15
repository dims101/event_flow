'use client';

import React, { useState } from 'react';
import { FileText, Sliders, Share2 } from 'lucide-react';

interface RoomTabsProps {
  rundownBuilder: React.ReactNode;
  controlCenter: React.ReactNode;
  sharePanel: React.ReactNode;
  defaultTab?: 'builder' | 'control';
}

export default function RoomTabs({
  rundownBuilder,
  controlCenter,
  sharePanel,
  defaultTab = 'builder',
}: RoomTabsProps) {
  // Pure client-side state — no URL change, no server re-render on tab switch
  const [currentTab, setCurrentTab] = useState<'builder' | 'control'>(defaultTab);

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="border-b border-slate-900/40 flex items-center gap-1 w-full overflow-x-auto scrollbar-none">
        <button
          onClick={() => setCurrentTab('builder')}
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
          onClick={() => setCurrentTab('control')}
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

      {/* Tab Contents — rendered once, toggled with CSS visibility for instant switching */}
      <div className="mt-4">
        <div className={currentTab === 'builder' ? 'block animate-in fade-in duration-200' : 'hidden'}>
          <div className="space-y-6">{rundownBuilder}</div>
        </div>
        <div className={currentTab === 'control' ? 'block animate-in fade-in duration-200' : 'hidden'}>
          <div className="grid grid-cols-1 gap-8">
            <div>{controlCenter}</div>
            <div className="border-t border-slate-900 pt-8">{sharePanel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
