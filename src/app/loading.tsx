import React from 'react';
import { EventFlowLogo } from '@/components/EventFlowLogo';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
      <div className="animate-pulse">
        <EventFlowLogo className="h-12 md:h-16 w-auto text-white" />
      </div>
    </div>
  );
}
