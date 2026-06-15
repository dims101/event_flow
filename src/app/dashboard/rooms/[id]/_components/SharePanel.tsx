'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Send, Share2 } from 'lucide-react';

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
      return 'Melihat rundown lengkap dan seluruh pembaruan aktivitas secara umum.';
    case 'MC':
      return 'Melihat rundown dengan fokus instruksi panggung khusus untuk MC.';
    case 'Catering':
      return 'Memantau kesiapan hidangan dan waktu pelayanan katering lapangan.';
    case 'MUA':
      return 'Memantau jadwal rias pengantin dan waktu ganti busana di lokasi.';
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
    <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-6 space-y-6">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          <Share2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100 font-sans">Bagikan Tautan Akses Kru</h3>
          <p className="text-sm text-slate-400 mt-1">
            Kru lapangan tidak perlu login. Cukup klik tautan unik ini untuk memantau waktu secara live.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tokens.map((token) => (
          <div
            key={token.role}
            className="flex flex-col justify-between border border-slate-800/80 bg-slate-950/40 rounded-xl p-5 space-y-4 hover:border-slate-850 transition duration-150"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 font-sans">{token.role} Role</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 font-bold tracking-wider uppercase">
                  Live View
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {getRoleDescription(token.role)}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-900/40">
              <button
                onClick={() => handleCopy(token.token, token.role)}
                className="flex-1 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                {copiedId === token.role ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleWhatsApp(token.token, token.role)}
                className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 text-xs flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                title="Kirim ke WhatsApp"
                aria-label={`Bagikan tautan peran ${token.role} via WhatsApp`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
