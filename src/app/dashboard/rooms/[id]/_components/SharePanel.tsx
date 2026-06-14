'use client';

import React, { useState, useEffect } from 'react';

interface RoleToken {
  role: string;
  token: string;
}

interface SharePanelProps {
  tokens: RoleToken[];
  roomName: string;
}

const getRoleDescription = (role: string) => {
  switch (role) {
    case 'All':
      return 'Melihat semua aktivitas dan rundown lengkap secara umum.';
    case 'MC':
      return 'Melihat rundown dengan fokus prompter dan instruksi MC.';
    case 'Catering':
      return 'Melihat waktu pelayanan hidangan dan pesan divisi katering.';
    case 'MUA':
      return 'Memantau kesiapan rias pengantin dan jadwal ganti baju.';
    default:
      return 'Tautan pantau tim lapangan.';
  }
};

export default function SharePanel({ tokens, roomName }: SharePanelProps) {
  const [origin, setOrigin] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCopy = (token: string, role: string) => {
    const url = `${origin}/v/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(role);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (token: string, role: string) => {
    const url = `${origin}/v/${token}`;
    const text = `Halo, berikut tautan pantau rundown real-time EventFlow untuk *${roomName}* (Divisi: *${role}*):\n\n${url}\n\n(Tautan ini tidak memerlukan login. Cukup klik untuk memantau waktu dan prompter)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white">Bagikan Tautan Akses Kru</h3>
        <p className="text-sm text-slate-400 mt-1">
          Kru lapangan tidak perlu login. Cukup klik tautan unik ini untuk memantau waktu secara live.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tokens.map((token) => (
          <div
            key={token.role}
            className="flex flex-col justify-between border border-slate-800 bg-slate-950/40 rounded-xl p-5 space-y-4 hover:border-slate-700 transition duration-150"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100">{token.role} Role</span>
                <span className="text-xs px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900 text-slate-400 font-mono">
                  Live View
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {getRoleDescription(token.role)}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={() => handleCopy(token.token, token.role)}
                className="flex-1 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition duration-150 flex items-center justify-center gap-1.5"
              >
                {copiedId === token.role ? '✅ Tersalin' : '📋 Salin Link'}
              </button>
              <button
                onClick={() => handleWhatsApp(token.token, token.role)}
                className="p-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/10 text-emerald-400 rounded-lg transition duration-150 text-xs flex items-center justify-center"
                title="Kirim ke WhatsApp"
              >
                💬
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
