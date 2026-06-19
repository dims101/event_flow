'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Copy, Check, Send, Share2, Tv, Loader2, Plus } from 'lucide-react';
import { generateMonitorTokenAction, generateOwnerTokenAction } from '@/app/actions/room';

interface RoleToken {
  role: string;
  token: string;
}

interface SharePanelProps {
  tokens: RoleToken[];
  roomName: string;
  roomId: string;
}

export default function SharePanel({ tokens, roomName, roomId }: SharePanelProps) {
  const [origin, setOrigin] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [monitorTokens, setMonitorTokens] = useState<RoleToken[]>(tokens);
  const [isGenerating, startGenerating] = useTransition();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (url: string, description: string) => {
    const text = `Halo, berikut tautan EventFlow untuk *${roomName}* (${description}):\n\n${url}\n\n(Tautan ini tidak memerlukan login.)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleGenerateMonitorToken = () => {
    startGenerating(async () => {
      const res = await generateMonitorTokenAction(roomId);
      if (res.success && res.token) {
        setMonitorTokens((prev) => [
          ...prev,
          { role: 'Monitor', token: res.token as string },
        ]);
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const [isGeneratingOwner, startGeneratingOwner] = useTransition();

  const handleGenerateOwnerToken = () => {
    startGeneratingOwner(async () => {
      const res = await generateOwnerTokenAction(roomId);
      if (res.success && res.token) {
        setMonitorTokens((prev) => [
          ...prev,
          { role: 'Owner', token: res.token as string },
        ]);
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const sharedToken = monitorTokens.find((t) => t.role === 'All');
  const monitorToken = monitorTokens.find((t) => t.role === 'Monitor');
  const ownerToken = monitorTokens.find((t) => t.role === 'Owner');

  const sharedUrl = sharedToken ? `${origin}/v/${sharedToken.token}` : null;
  const monitorUrl = monitorToken ? `${origin}/monitor/${monitorToken.token}` : null;
  const ownerUrl = ownerToken ? `${origin}/s/${ownerToken.token}` : null;

  return (
    <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-6 space-y-6">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          <Share2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100 font-sans">Distribusi Tautan Akses</h3>
          <p className="text-sm text-slate-400 mt-1">
            Kru lapangan tidak perlu login. Bagikan tautan sesuai kebutuhan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── Shared Vendor Link (All) ── */}
        {sharedToken && sharedUrl && (
          <div className="flex flex-col justify-between border border-slate-800/80 bg-slate-950/40 rounded-xl p-5 space-y-4 hover:border-slate-700 transition duration-150">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 font-sans">Monitor Bersama (Shared Link)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 font-bold tracking-wider uppercase">
                  Live View
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Tautan pantau rundown real-time terpadu untuk seluruh divisi vendor dan kru lapangan.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-900/40">
              <button
                onClick={() => handleCopy(sharedUrl, 'all')}
                className="flex-1 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                {copiedId === 'all' ? (
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
                onClick={() => handleWhatsApp(sharedUrl, 'Pantau Rundown Bersama')}
                className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 text-xs flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                title="Kirim ke WhatsApp"
                aria-label="Bagikan tautan vendor via WhatsApp"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Monitor / Stage Display Link ── */}
        {monitorToken && monitorUrl ? (
          <div className="flex flex-col justify-between border border-slate-800/80 bg-slate-950/40 rounded-xl p-5 space-y-4 hover:border-slate-700 transition duration-150">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-100 font-sans">Monitor Panggung</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 font-bold tracking-wider uppercase">
                  Stage Display
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Tampilkan di TV atau proyektor di panggung. Menampilkan nama sesi aktif dan timer besar secara real-time.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-900/40">
              <button
                onClick={() => handleCopy(monitorUrl, 'monitor')}
                className="flex-1 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                {copiedId === 'monitor' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link Monitor</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleWhatsApp(monitorUrl, 'Tampilan Monitor Panggung')}
                className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 text-xs flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                title="Kirim ke WhatsApp"
                aria-label="Bagikan tautan monitor panggung via WhatsApp"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ── Activate Monitor button for existing rooms ── */
          <div className="flex flex-col border border-dashed border-slate-800/60 bg-slate-950/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-400 font-sans">Monitor Panggung</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Aktifkan fitur monitor untuk menampilkan timer di TV atau proyektor panggung.
            </p>
            <button
              onClick={handleGenerateMonitorToken}
              disabled={isGenerating}
              className="w-full py-2 text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-50 border border-violet-600/30 text-violet-300 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengaktifkan…</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aktifkan Monitor Panggung</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Event Owner Link (Owner) ── */}
        {ownerToken && ownerUrl ? (
          <div className="flex flex-col justify-between border border-slate-800/80 bg-slate-950/40 rounded-xl p-5 space-y-4 hover:border-slate-700 transition duration-150">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-slate-100 font-sans">Tautan Event Owner</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 font-bold tracking-wider uppercase">
                  Client View
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Tautan rundown read-only interaktif untuk klien/pemilik acara. Dilengkapi fitur sinkronisasi real-time & opsi cetak ramah PDF.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-900/40">
              <button
                onClick={() => handleCopy(ownerUrl, 'owner')}
                className="flex-1 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                {copiedId === 'owner' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link Owner</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleWhatsApp(ownerUrl, 'Tautan Rundown Client')}
                className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 text-xs flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                title="Kirim ke WhatsApp"
                aria-label="Bagikan tautan event owner via WhatsApp"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col border border-dashed border-slate-800/60 bg-slate-950/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-400 font-sans">Tautan Event Owner</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Aktifkan fitur tautan khusus Event Owner untuk berbagi akses rundown versi klien secara instan.
            </p>
            <button
              onClick={handleGenerateOwnerToken}
              disabled={isGeneratingOwner}
              className="w-full py-2 text-xs font-semibold bg-indigo-650/20 hover:bg-indigo-650/30 disabled:opacity-50 border border-indigo-650/30 text-indigo-300 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
            >
              {isGeneratingOwner ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengaktifkan…</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aktifkan Tautan Owner</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
