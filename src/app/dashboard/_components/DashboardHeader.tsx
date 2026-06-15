'use client';

import React, { useState } from 'react';
import CreateEventModal from './CreateEventModal';
import { Plus } from 'lucide-react';

export default function DashboardHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Event Saya</h1>
        <p className="text-slate-400 text-sm mt-1">
          Pilih atau buat ruangan event baru untuk mengendalikan rundown secara real-time.
        </p>
      </div>
      <div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition duration-150 shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Event Baru</span>
        </button>
      </div>

      <CreateEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
