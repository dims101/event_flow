'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getRundownItemsAction } from '@/app/actions/rundown';
import { 
  updateTimerStatusAction, 
  adjustRoomOffsetAction, 
  sendPrompterMessageAction,
  clearPrompterMessagesAction,
  sendTimeAlertNotificationAction
} from '@/app/actions/roomControl';
import { 
  Play, Pause, Square, SkipBack, SkipForward, Plus, Minus, Send, 
  Trash2, Clock, Activity, MessageSquare, Monitor, Check, Calendar, 
  ChevronRight, Sparkles, AlertCircle, Hourglass, HelpCircle 
} from 'lucide-react';
import { getRoleBadgeStyle } from '@/lib/picColors';

interface Room {
  id: string;
  name: string;
  eventDate: string;
  currentOffsetSeconds: number;
  currentRundownIndex: number;
  timerStatus: string;
  timerStartTime: number | null;
  timerElapsedSeconds: number;
}

interface RundownItem {
  id: string;
  title: string;
  durationSeconds: number;
  targetRole: string;
  orderIndex: number;
}

interface PrompterMessage {
  id: string;
  targetRole: string;
  message: string;
  createdAt: number;
}

interface ActivityLog {
  id: string;
  roomId: string;
  actionType: string;
  description: string;
  createdAt: number;
}

interface Pic {
  id: string;
  name: string;
}

interface ControlPanelProps {
  roomId: string;
  initialRoom: Room;
  initialItems: RundownItem[];
  initialMessages: PrompterMessage[];
  initialLogs: ActivityLog[];
  pics: Pic[];
}

export default function ControlPanel({ 
  roomId, 
  initialRoom, 
  initialItems, 
  initialMessages,
  initialLogs,
  pics
}: ControlPanelProps) {
  const router = useRouter();
  
  // Real-time states synchronized via SSE
  const [state, setState] = useState({
    room: initialRoom,
    items: initialItems,
    messages: initialMessages,
    logs: initialLogs,
  });

  const [connected, setConnected] = useState(false);
  const [prompterText, setPrompterText] = useState('');
  const [targetRole, setTargetRole] = useState('All');
  
  const [isTimerPending, startTimerTransition] = useTransition();
  const [isOffsetPending, startOffsetTransition] = useTransition();
  const [isMsgPending, startMsgTransition] = useTransition();

  // Local ticker states
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [isOvertime, setIsOvertime] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const pipWindowRef = useRef<any>(null);

  // Prompter alert states for PiP
  const [activeAlert, setActiveAlert] = useState<PrompterMessage | null>(null);
  const activeAlertRef = useRef<PrompterMessage | null>(null);
  useEffect(() => {
    activeAlertRef.current = activeAlert;
  }, [activeAlert]);

  const lastProcessedMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const sentAlertsRef = useRef<{ [itemIndex: number]: { '5m'?: boolean; '1m'?: boolean } }>({});
  const isTransitioningRef = useRef(false);

  // Reset auto-advance lock when the room index or status changes
  useEffect(() => {
    isTransitioningRef.current = false;
  }, [state.room?.currentRundownIndex, state.room?.timerStatus]);

  // Refs to prevent useEffect teardown on state changes, bypassing background throttle issues
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const timerDisplayRef = useRef('00:00');
  useEffect(() => {
    timerDisplayRef.current = timerDisplay;
  }, [timerDisplay]);

  // Clean up PiP window on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  // Helper mapper functions to convert database snake_case keys to camelCase models
  const mapRoom = (dbRoom: any) => {
    if (!dbRoom) return null;
    return {
      id: dbRoom.id,
      name: dbRoom.name,
      eventDate: dbRoom.event_date || dbRoom.eventDate,
      userId: dbRoom.user_id || dbRoom.userId,
      currentOffsetSeconds: dbRoom.current_offset_seconds !== undefined ? dbRoom.current_offset_seconds : dbRoom.currentOffsetSeconds,
      currentRundownIndex: dbRoom.current_rundown_index !== undefined ? dbRoom.current_rundown_index : dbRoom.currentRundownIndex,
      timerStatus: dbRoom.timer_status || dbRoom.timerStatus,
      timerStartTime: dbRoom.timer_start_time !== undefined ? dbRoom.timer_start_time : dbRoom.timerStartTime,
      timerElapsedSeconds: dbRoom.timer_elapsed_seconds !== undefined ? dbRoom.timer_elapsed_seconds : dbRoom.timerElapsedSeconds,
    };
  };

  const mapMessage = (dbMsg: any) => {
    if (!dbMsg) return null;
    return {
      id: dbMsg.id,
      roomId: dbMsg.room_id || dbMsg.roomId,
      targetRole: dbMsg.target_role || dbMsg.targetRole,
      message: dbMsg.message,
      createdAt: dbMsg.created_at !== undefined ? Number(dbMsg.created_at) : dbMsg.createdAt,
    };
  };

  const mapLog = (dbLog: any) => {
    if (!dbLog) return null;
    return {
      id: dbLog.id,
      roomId: dbLog.room_id || dbLog.roomId,
      actionType: dbLog.action_type || dbLog.actionType,
      description: dbLog.description,
      createdAt: dbLog.created_at !== undefined ? Number(dbLog.created_at) : dbLog.createdAt,
    };
  };

  // 1. Establish Supabase Realtime Connection
  useEffect(() => {
    setConnected(true);

    const channel = supabase
      .channel(`room-control:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          setState((prev: any) => ({
            ...prev,
            room: mapRoom(payload.new),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prompter_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const mappedMsg = mapMessage(payload.new);
          if (!mappedMsg) return;
          setState((prev: any) => {
            if (prev.messages.some((m: any) => m.id === mappedMsg.id)) return prev;
            return {
              ...prev,
              messages: [mappedMsg, ...prev.messages].slice(0, 15),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const mappedLog = mapLog(payload.new);
          if (!mappedLog) return;
          setState((prev: any) => {
            if (prev.logs.some((l: any) => l.id === mappedLog.id)) return prev;
            return {
              ...prev,
              logs: [mappedLog, ...prev.logs].slice(0, 30),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rundown_items',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const updatedItems = await getRundownItemsAction(roomId);
          setState((prev: any) => ({
            ...prev,
            items: updatedItems,
          }));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Monitor new messages on the admin panel to show the Big Alert in PiP
  useEffect(() => {
    const { messages } = state;
    if (messages.length === 0) {
      isInitialLoad.current = false;
      return;
    }

    const latest = messages[0];

    // On initial load, just record the latest message ID so we don't alert on historical messages
    if (isInitialLoad.current) {
      lastProcessedMessageId.current = latest.id;
      isInitialLoad.current = false;
      return;
    }

    // If message is new and we haven't processed it
    if (latest.id !== lastProcessedMessageId.current) {
      lastProcessedMessageId.current = latest.id;
      
      setActiveAlert(latest);
      
      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [state.messages]);

  // 2. High-precision ticker for master countdown (runs locally every 100ms)
  useEffect(() => {
    const tick = () => {
      const { room, items } = stateRef.current;
      
      if (room.currentRundownIndex === -1 || items.length === 0) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        setRemainingSeconds(null);
        
        // Update Document PiP if active
        if (pipWindowRef.current) {
          const doc = pipWindowRef.current.document;
          const timerEl = doc.getElementById('pip-timer');
          const statusEl = doc.getElementById('pip-status');
          const titleEl = doc.getElementById('pip-title');
          const listEl = doc.getElementById('pip-rundown-list');
          if (timerEl) timerEl.innerText = '00:00';
          if (statusEl) statusEl.innerText = 'STOPPED';
          if (titleEl) titleEl.innerText = '(BELUM DIMULAI)';
          if (listEl && items) {
            const total = items.length;
            const limit = 8;
            const end = Math.min(total, limit);
            let html = '';
            for (let index = 0; index < end; index++) {
              const item = items[index];
              if (!item) continue;
              html += `
                <div class="pip-item pip-item-inactive">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px;">${index + 1}. ${item.title}</span>
                  <span style="font-family: monospace; font-size: 8px; opacity: 0.8; margin-left: 4px;">${item.durationSeconds / 60}m</span>
                </div>
              `;
            }
            listEl.innerHTML = html;
          }
        }
        return;
      }

      const currentItem = items[room.currentRundownIndex];
      if (!currentItem) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        setRemainingSeconds(null);
        return;
      }

      // Calculate total elapsed seconds
      let elapsed = room.timerElapsedSeconds;
      if (room.timerStatus === 'running' && room.timerStartTime) {
        elapsed += (Date.now() - room.timerStartTime) / 1000;
      }

      const totalAllowed = currentItem.durationSeconds + room.currentOffsetSeconds;
      const diff = totalAllowed - elapsed;

      const over = diff < 0;
      const absDiff = Math.abs(Math.floor(diff));
      const min = Math.floor(absDiff / 60);
      const sec = absDiff % 60;
      
      const formatted = `${over ? '-' : ''}${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      
      setTimerDisplay(formatted);
      setIsOvertime(over);
      setRemainingSeconds(Math.floor(diff));

      // Auto-advance session when timer runs out
      if (room.timerStatus === 'running' && diff <= 0 && !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        const nextIndex = room.currentRundownIndex + 1;
        if (nextIndex < items.length) {
          updateTimerStatusAction(roomId, 'running', nextIndex, true)
            .then((res) => {
              if (res && res.error) {
                console.error('Failed to auto-advance to next session:', res.error);
                isTransitioningRef.current = false;
              }
            })
            .catch((err) => {
              console.error('Failed to auto-advance to next session:', err);
              isTransitioningRef.current = false;
            });
        } else {
          updateTimerStatusAction(roomId, 'stopped', undefined, true)
            .then((res) => {
              if (res && res.error) {
                console.error('Failed to stop timer at end of rundown:', res.error);
                isTransitioningRef.current = false;
              }
            })
            .catch((err) => {
              console.error('Failed to stop timer at end of rundown:', err);
              isTransitioningRef.current = false;
            });
        }
      }

      // Auto push warning check for remaining 5 minutes and 1 minute
      if (room.timerStatus === 'running' && !over) {
        const remainingSeconds = Math.floor(diff);
        const itemIndex = room.currentRundownIndex;
        
        // Initialize tracker for this item index if not exists
        if (!sentAlertsRef.current[itemIndex]) {
          sentAlertsRef.current[itemIndex] = {};
        }

        // Check for 5 minutes (300 seconds) warning — trigger window between 240s and 300s
        if (remainingSeconds <= 300 && remainingSeconds > 240) {
          if (!sentAlertsRef.current[itemIndex]['5m']) {
            sentAlertsRef.current[itemIndex]['5m'] = true;
            sendTimeAlertNotificationAction(roomId, itemIndex, '5m').catch((err) => {
              console.error('Failed to trigger 5m alert:', err);
            });
          }
        }

        // Check for 1 minute (60 seconds) warning — trigger window between 10s and 60s
        if (remainingSeconds <= 60 && remainingSeconds > 10) {
          if (!sentAlertsRef.current[itemIndex]['1m']) {
            sentAlertsRef.current[itemIndex]['1m'] = true;
            sendTimeAlertNotificationAction(roomId, itemIndex, '1m').catch((err) => {
              console.error('Failed to trigger 1m alert:', err);
            });
          }
        }
      }

      // Update Document PiP if active
      if (pipWindowRef.current) {
        const doc = pipWindowRef.current.document;
        const container = doc.getElementById('pip-container');
        const titleEl = doc.getElementById('pip-title');
        const timerEl = doc.getElementById('pip-timer');
        const dotEl = doc.getElementById('pip-status-dot');
        const wallTimeEl = doc.getElementById('pip-wall-time');
        const msgEl = doc.getElementById('pip-message');
        const clockView = doc.getElementById('pip-clock-view');
        const alertView = doc.getElementById('pip-alert-view');
        const alertText = doc.getElementById('pip-alert-text');
        const listEl = doc.getElementById('pip-rundown-list');

        const { messages: frameMessages } = stateRef.current;
        const latestMsg = frameMessages[0];
        const isFreshAlert = activeAlertRef.current !== null;
        const activeMsg = activeAlertRef.current;

        if (container) {
          container.className = `relative min-h-screen grid grid-cols-[0.8fr_1.2fr] gap-2 font-sans p-2 select-none transition-colors duration-300 ${
            over ? 'bg-rose-950 animate-pulse-slow' : 'bg-slate-950'
          }`;
        }
        if (titleEl) {
          const sessionTitle = currentItem ? currentItem.title : 'EventFlow ⏱️';
          const maxTitleLength = 20;
          titleEl.innerText = (sessionTitle.length > maxTitleLength 
            ? sessionTitle.substring(0, maxTitleLength) + '…'
            : sessionTitle).toUpperCase();
        }

        if (listEl && items) {
          const total = items.length;
          const curIdx = room.currentRundownIndex;
          const limit = 8;
          let start = 0;
          if (curIdx !== -1 && curIdx >= 7) {
            start = Math.max(0, Math.min(total - limit, curIdx - 1));
          }
          const end = Math.min(total, start + limit);
          
          let html = '';
          for (let index = start; index < end; index++) {
            const item = items[index];
            if (!item) continue;
            const isActive = index === curIdx;
            html += `
              <div class="pip-item ${isActive ? 'pip-item-active' : 'pip-item-inactive'}">
                <span class="pip-item-text">${index + 1}. ${item.title}</span>
              </div>
            `;
          }
          listEl.innerHTML = html;
        }

        if (isFreshAlert && activeMsg) {
          // Hide clock, show big alert
          if (clockView) clockView.style.display = 'none';
          if (alertView) {
            alertView.style.display = 'flex';
            alertView.className = "flex flex-col items-center justify-center text-center px-2 py-1.5 bg-indigo-950 border border-indigo-600 rounded my-1 w-full animate-pulse-fast";
          }
          if (alertText) alertText.innerText = activeMsg.message;
          if (msgEl) msgEl.className = 'hidden';
        } else {
          // Show clock, hide big alert
          if (clockView) clockView.style.display = 'flex';
          if (alertView) alertView.style.display = 'none';
          
          if (timerEl) {
            timerEl.innerText = formatted;
            const remSec = Math.floor(diff);
            const pipColorClass = over
              ? 'text-rose-500'
              : remSec <= 60
              ? 'text-red-500 animate-pulse-fast'
              : remSec <= 300
              ? 'text-amber-500'
              : room.timerStatus === 'running'
              ? 'text-indigo-400'
              : 'text-slate-300';
            timerEl.className = `font-mono text-3xl font-extrabold tracking-tighter text-center ${pipColorClass}`;
          }
          if (dotEl) {
            const currentStatus = room.timerStatus;
            if (currentStatus === 'running') {
              dotEl.className = "absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-dot-pulse";
            } else if (currentStatus === 'paused') {
              dotEl.className = "absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500";
            } else {
              dotEl.className = "absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500";
            }
          }
          if (wallTimeEl) {
            wallTimeEl.innerText = new Date().toTimeString().split(' ')[0];
          }
          if (msgEl) {
            if (latestMsg) {
              msgEl.innerText = `[To: ${latestMsg.targetRole}] ${latestMsg.message}`;
              msgEl.className = `text-[8px] font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
            } else {
              msgEl.className = 'hidden';
            }
          }
        }
      }
    };

    tick(); // Run immediately

    let worker: Worker | null = null;
    try {
      const blobCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timerId) clearInterval(timerId);
            timerId = setInterval(() => {
              self.postMessage('tick');
            }, 200);
          } else if (e.data === 'stop') {
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          tick();
        }
      };
      worker.postMessage('start');
    } catch (e) {
      console.error('Failed to create Web Worker for timer, falling back to setInterval:', e);
    }

    // Fallback if worker creation fails
    const intervalId = worker ? null : setInterval(tick, 200);

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const { room, items, messages } = state;
  const currentItem = items[room.currentRundownIndex];
  const nextItem = items[room.currentRundownIndex + 1];

  // Action Triggers
  const handlePlayPause = () => {
    if (room.currentRundownIndex === -1 && items.length > 0) {
      // Start the first session if nothing is active
      handleSelectSession(0, 'running');
      return;
    }

    const nextStatus = room.timerStatus === 'running' ? 'paused' : 'running';
    startTimerTransition(async () => {
      await updateTimerStatusAction(roomId, nextStatus);
    });
  };

  const handleSelectSession = (index: number, status?: 'running' | 'paused' | 'stopped') => {
    if (room.currentRundownIndex !== -1) {
      if (room.currentRundownIndex === index) {
        if (!confirm('Apakah Anda yakin ingin memulai ulang sesi aktif ini dari awal? Sisa waktu dan offset akan direset.')) {
          return;
        }
      } else {
        const targetItem = items[index];
        const targetTitle = targetItem ? `"${targetItem.title}"` : `sesi indeks ${index}`;
        if (!confirm(`Apakah Anda yakin ingin melompat ke sesi ${targetTitle}? Sesi aktif saat ini akan dihentikan.`)) {
          return;
        }
      }
    }
    const targetStatus = status || room.timerStatus;
    startTimerTransition(async () => {
      await updateTimerStatusAction(roomId, targetStatus as any, index);
    });
  };

  const handleStop = () => {
    if (!confirm('Apakah Anda yakin ingin menghentikan timer? Sesi aktif saat ini akan direset.')) {
      return;
    }
    startTimerTransition(async () => {
      await updateTimerStatusAction(roomId, 'stopped');
    });
  };

  const handleAdjustOffset = (seconds: number) => {
    startOffsetTransition(async () => {
      await adjustRoomOffsetAction(roomId, seconds);
    });
  };

  const handleSendPrompter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompterText.trim()) return;

    startMsgTransition(async () => {
      const res = await sendPrompterMessageAction(roomId, targetRole, prompterText);
      if (res.success) {
        setPrompterText('');
      } else {
        alert(res.error);
      }
    });
  };

  const handleClearPrompter = () => {
    if (confirm('Bersihkan riwayat pesan?')) {
      startMsgTransition(async () => {
        await clearPrompterMessagesAction(roomId);
      });
    }
  };

  const togglePiP = async () => {
    if (typeof window === 'undefined') return;

    // Fetch fresh state from ref
    const { room: currentRoom, items: currentItems } = stateRef.current;
    const currentActiveItem = currentRoom && currentItems[currentRoom.currentRundownIndex];

    // A. Use Document Picture-in-Picture API if supported (Chrome/Edge 116+)
    if ('documentPictureInPicture' in window) {
      if (isPipActive) {
        if (pipWindowRef.current) {
          pipWindowRef.current.close();
        }
        setIsPipActive(false);
        return;
      }

      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 480,
          height: 200,
        });

        pipWindowRef.current = pipWindow;
        setIsPipActive(true);

        // Copy active theme (dark/light) to the Document PiP window
        if (document.documentElement.classList.contains('dark')) {
          pipWindow.document.documentElement.classList.add('dark');
        } else {
          pipWindow.document.documentElement.classList.remove('dark');
        }

        // Copy styles to Document PiP window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch (e) {
            if (styleSheet.href) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        // Initialize PiP structure
        const pipDiv = pipWindow.document.createElement('div');
        pipDiv.innerHTML = `
          <div id="pip-container" class="relative min-h-screen grid grid-cols-[0.8fr_1.2fr] gap-2 font-sans p-2 select-none bg-slate-950 text-slate-100">
            <!-- Left: Rundown List -->
            <div id="pip-rundown-list" class="flex flex-col gap-1 pr-1.5 border-r border-slate-900/60 overflow-hidden text-[9px] justify-center">
              <!-- Items will be injected here dynamically -->
            </div>
            
            <!-- Right: Timer, Wall Clock, Prompter -->
            <div class="flex flex-col items-center justify-center relative pl-1">
              <span id="pip-status-dot" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
              <span id="pip-title" class="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">EVENTFLOW</span>
              
              <div id="pip-clock-view" class="flex flex-col items-center justify-center w-full">
                <div id="pip-timer" class="font-mono text-3xl font-extrabold tracking-tighter text-slate-300 text-center leading-none">00:00</div>
                <div class="mt-1.5 flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-bold tracking-wider text-center">
                  <span id="pip-wall-time">00:00:00</span>
                </div>
              </div>

              <div id="pip-alert-view" class="flex flex-col items-center justify-center text-center px-1.5 py-1 bg-indigo-950 border border-indigo-600 rounded w-full hidden animate-pulse-fast">
                <span class="text-[7px] font-extrabold text-rose-500 uppercase tracking-wider">ALERT!</span>
                <div id="pip-alert-text" class="text-[9px] font-extrabold text-slate-50 leading-snug line-clamp-2"></div>
              </div>

              <div id="pip-message" class="text-[8px] text-indigo-300 font-bold text-center mt-2 px-1 border-t border-slate-900 pt-1 w-full truncate hidden"></div>
            </div>
          </div>
        `;
        pipWindow.document.body.appendChild(pipDiv);

        // Add slow and fast pulse animation keyframes
        const animStyle = pipWindow.document.createElement('style');
        animStyle.textContent = `
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.93; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse-fast {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(0.98); }
          }
          .animate-pulse-fast {
            animation: pulse-fast 1s ease-in-out infinite;
          }
          @keyframes dot-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.85); }
          }
          .animate-dot-pulse {
            animation: dot-pulse 1s ease-in-out infinite;
          }
          .pip-item {
            display: flex;
            align-items: center;
            padding: 2px 4px;
            border-radius: 4px;
            margin: 1px 0;
            transition: all 0.15s ease;
            white-space: normal;
          }
          .pip-item-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            line-height: 1.1;
          }
          .pip-item-active {
            font-weight: 800;
            font-size: 9.5px;
            color: #818cf8;
            background-color: rgba(99, 102, 241, 0.1);
            border-left: 2px solid #6366f1;
            padding-left: 3px;
          }
          .pip-item-inactive {
            font-size: 8.5px;
            color: #94a3b8;
          }
        `;
        pipWindow.document.head.appendChild(animStyle);

        const handleClose = () => {
          pipWindowRef.current = null;
          setIsPipActive(false);
        };

        pipWindow.addEventListener('pagehide', handleClose);
        pipWindow.addEventListener('unload', handleClose);

        // Immediate state sync
        const titleEl = pipWindow.document.getElementById('pip-title');
        const timerEl = pipWindow.document.getElementById('pip-timer');
        const dotEl = pipWindow.document.getElementById('pip-status-dot');
        const wallTimeEl = pipWindow.document.getElementById('pip-wall-time');
        const msgEl = pipWindow.document.getElementById('pip-message');
        const clockView = pipWindow.document.getElementById('pip-clock-view');
        const alertView = pipWindow.document.getElementById('pip-alert-view');
        const alertText = pipWindow.document.getElementById('pip-alert-text');
        const listEl = pipWindow.document.getElementById('pip-rundown-list');
        
        if (titleEl) {
          const sessionTitle = currentActiveItem ? currentActiveItem.title : 'EventFlow ⏱️';
          const maxTitleLength = 20;
          titleEl.innerText = (sessionTitle.length > maxTitleLength 
            ? sessionTitle.substring(0, maxTitleLength) + '…'
            : sessionTitle).toUpperCase();
        }
        if (timerEl) timerEl.innerText = timerDisplayRef.current;
        
        const currentStatus = currentRoom ? currentRoom.timerStatus : 'stopped';
        if (dotEl) {
          if (currentStatus === 'running') {
            dotEl.className = "absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-dot-pulse";
          } else if (currentStatus === 'paused') {
            dotEl.className = "absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500";
          } else {
            dotEl.className = "absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500";
          }
        }
        if (wallTimeEl) {
          wallTimeEl.innerText = new Date().toTimeString().split(' ')[0];
        }

        if (listEl && currentItems) {
          const total = currentItems.length;
          const curIdx = currentRoom ? currentRoom.currentRundownIndex : -1;
          const limit = 8;
          let start = 0;
          if (curIdx !== -1 && curIdx >= 7) {
            start = Math.max(0, Math.min(total - limit, curIdx - 1));
          }
          const end = Math.min(total, start + limit);
          
          let html = '';
          for (let index = start; index < end; index++) {
            const item = currentItems[index];
            if (!item) continue;
            const isActive = index === curIdx;
            html += `
              <div class="pip-item ${isActive ? 'pip-item-active' : 'pip-item-inactive'}">
                <span class="pip-item-text">${index + 1}. ${item.title}</span>
              </div>
            `;
          }
          listEl.innerHTML = html;
        }

        const { messages: initMsgs } = stateRef.current;
        const latestInitMsg = initMsgs[0];
        const isFresh = activeAlertRef.current !== null;
        const activeMsg = activeAlertRef.current || latestInitMsg;

        if (isFresh && activeMsg) {
          if (clockView) clockView.style.display = 'none';
          if (alertView) {
            alertView.style.display = 'flex';
            alertView.className = "flex flex-col items-center justify-center text-center px-2 py-1.5 bg-indigo-950 border border-indigo-600 rounded my-1 w-full animate-pulse-fast";
          }
          if (alertText) alertText.innerText = activeMsg.message;
          if (msgEl) msgEl.className = 'hidden';
        } else {
          if (clockView) clockView.style.display = 'flex';
          if (alertView) alertView.style.display = 'none';
          if (msgEl) {
            if (latestInitMsg) {
              msgEl.innerText = `[To: ${latestInitMsg.targetRole}] ${latestInitMsg.message}`;
              msgEl.className = `text-[8px] font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
            } else {
              msgEl.className = 'hidden';
            }
          }
        }

        return;
      } catch (error: any) {
        console.error('Failed to open Document PiP:', error);
      }
    }

    // B. Fallback to Canvas Video PiP
    if (!document.pictureInPictureEnabled) {
      alert('Picture-in-Picture tidak didukung atau dinonaktifkan di browser ini.');
      return;
    }

    if (isPipActive) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        setIsPipActive(false);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw initial frame
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Memulai PiP…', canvas.width / 2, 90);

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('autoplay', 'true');
      // Style to be virtually invisible but considered "visible" by mobile compositors
      video.style.position = 'fixed';
      video.style.bottom = '10px';
      video.style.right = '10px';
      video.style.width = '10px';
      video.style.height = '10px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '1000';
      
      document.body.appendChild(video);

      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(10) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(10) : null;
      if (!canvasStream) {
        throw new Error('Browser tidak mendukung pengambilan stream dari canvas.');
      }
      
      video.srcObject = canvasStream;
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout memuat video metadata')), 3000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      await video.play();
      await video.requestPictureInPicture();
      setIsPipActive(true);

      let pipIntervalId: any = null;

      const handleLeavePiP = () => {
        setIsPipActive(false);
        if (pipIntervalId) clearInterval(pipIntervalId);
        try {
          document.body.removeChild(video);
        } catch (e) {}
      };

      video.addEventListener('leavepictureinpicture', handleLeavePiP);

      const draw = () => {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Define colors dynamically depending on parent theme
        const colorBg = isDark ? '#090d16' : '#FAFBFC';
        const colorTextPrimary = isDark ? '#818cf8' : '#0C66E4';
        const colorTextMuted = isDark ? '#94a3b8' : '#42526E';
        const colorTextSlate = isDark ? '#64748b' : '#5E6C84';
        const colorTextWhite = isDark ? '#ffffff' : '#091E42';

        // Fetch fresh state from ref on each draw frame
        const { room: frameRoom, items: frameItems, messages: frameMessages } = stateRef.current;
        const frameActiveItem = frameRoom && frameItems[frameRoom.currentRundownIndex];
        const latestMsg = frameMessages[0];
        const isFreshAlert = activeAlertRef.current !== null;
        const activeMsg = activeAlertRef.current;

        ctx.fillStyle = colorBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isFreshAlert && activeMsg) {
          // Draw BIG ALERT in the center instead of the clock!
          ctx.fillStyle = isDark ? '#1e1b4b' : '#DEEBFF'; // dark indigo vs subtle brand
          ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
          ctx.strokeStyle = isDark ? '#6366f1' : '#0C66E4'; // indigo border vs bold brand
          ctx.lineWidth = 2;
          ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

          ctx.fillStyle = isDark ? '#f59e0b' : '#CA3521'; // Amber vs Danger bold text
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`INSTRUKSI BARU! [To: ${activeMsg.targetRole}]`, canvas.width / 2, 34);

          ctx.fillStyle = colorTextWhite;
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Wrap text if needed (max 2 lines)
          const msgText = `"${activeMsg.message}"`;
          const words = msgText.split(' ');
          let line1 = '';
          let line2 = '';
          for (let i = 0; i < words.length; i++) {
            if ((line1 + words[i]).length < 24 && line2 === '') {
              line1 += words[i] + ' ';
            } else {
              line2 += words[i] + ' ';
            }
          }
          
          if (line2.trim() === '') {
            ctx.fillText(line1.trim(), canvas.width / 2, 85);
          } else {
            ctx.fillText(line1.trim(), canvas.width / 2, 72);
            ctx.fillText(line2.trim(), canvas.width / 2, 98);
          }
        } else {
          // Draw vertical separator
          const leftWidth = 130;
          const rightStart = 140;
          const rightCenterX = rightStart + (canvas.width - rightStart) / 2;

          ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(leftWidth + 5, 5);
          ctx.lineTo(leftWidth + 5, canvas.height - 5);
          ctx.stroke();

          // 1. Draw rundown list on the left side
          if (frameItems && frameItems.length > 0) {
            const curIdx = frameRoom ? frameRoom.currentRundownIndex : -1;
            const total = frameItems.length;
            const limit = 8;
            let start = 0;
            if (curIdx !== -1 && curIdx >= 7) {
              start = Math.max(0, Math.min(total - limit, curIdx - 1));
            }
            const end = Math.min(total, start + limit);
            
            let yOffset = 15;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            for (let index = start; index < end; index++) {
              const item = frameItems[index];
              if (!item) continue;
              const isActive = index === curIdx;
              
              if (isActive) {
                ctx.font = 'bold 9.5px sans-serif';
                ctx.fillStyle = isDark ? '#818cf8' : '#0c66e4'; // Mencolok
              } else {
                ctx.font = '9px sans-serif';
                ctx.fillStyle = colorTextMuted;
              }
              
              // Wrap text dynamically for canvas
              const itemNum = `${index + 1}. `;
              const fullText = itemNum + item.title;
              const maxTextWidth = leftWidth - 10;
              
              const words = fullText.split(' ');
              const lines: string[] = [];
              let currentLine = '';
              for (let w = 0; w < words.length; w++) {
                const testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextWidth && currentLine) {
                  lines.push(currentLine);
                  currentLine = words[w];
                } else {
                  currentLine = testLine;
                }
              }
              if (currentLine) {
                lines.push(currentLine);
              }
              
              const displayLines = lines.slice(0, 3);
              
              // Draw active indicator bar
              if (isActive) {
                ctx.fillStyle = isDark ? '#6366f1' : '#0c66e4';
                ctx.fillRect(2, yOffset, 2, displayLines.length * 10);
                ctx.fillStyle = isDark ? '#818cf8' : '#0c66e4';
              }
              
              displayLines.forEach((line, lineIdx) => {
                ctx.fillText(line, isActive ? 8 : 6, yOffset + lineIdx * 10);
              });
              
              yOffset += displayLines.length * 10 + 6;
              if (yOffset > canvas.height - 5) break;
            }
          }

          // 2. Normal clock drawing in the right column
          ctx.fillStyle = colorTextSlate;
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          const sessionTitle = frameActiveItem ? frameActiveItem.title : 'EventFlow';
          const maxTitleLength = 20; // smaller limit for right column width limit
          const truncatedTitle = sessionTitle.length > maxTitleLength 
            ? sessionTitle.substring(0, maxTitleLength) + '…'
            : sessionTitle;
          ctx.fillText(truncatedTitle.toUpperCase(), rightCenterX, 24);

          // Check if overtime dynamically
          let isFrameOvertime = false;
          if (frameRoom && frameActiveItem) {
            let elapsed = frameRoom.timerElapsedSeconds;
            if (frameRoom.timerStatus === 'running' && frameRoom.timerStartTime) {
              elapsed += (Date.now() - frameRoom.timerStartTime) / 1000;
            }
            const totalAllowed = frameActiveItem.durationSeconds + frameRoom.currentOffsetSeconds;
            isFrameOvertime = (totalAllowed - elapsed) < 0;
          }

          let frameRemainingSec = null;
          if (frameRoom && frameActiveItem) {
            let elapsed = frameRoom.timerElapsedSeconds;
            if (frameRoom.timerStatus === 'running' && frameRoom.timerStartTime) {
              elapsed += (Date.now() - frameRoom.timerStartTime) / 1000;
            }
            const totalAllowed = frameActiveItem.durationSeconds + frameRoom.currentOffsetSeconds;
            const diff = totalAllowed - elapsed;
            frameRemainingSec = Math.floor(diff);
          }

          if (isFrameOvertime) {
            ctx.fillStyle = '#ef4444';
          } else if (frameRemainingSec !== null && frameRemainingSec <= 60 && frameRoom?.timerStatus === 'running') {
            ctx.fillStyle = '#f87171'; // Red/Rose
          } else if (frameRemainingSec !== null && frameRemainingSec <= 300 && frameRoom?.timerStatus === 'running') {
            ctx.fillStyle = '#f59e0b'; // Amber
          } else {
            ctx.fillStyle = colorTextPrimary;
          }

          ctx.font = 'bold 44px monospace'; // slightly smaller font for narrow column
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(timerDisplayRef.current, rightCenterX, 75);

          const status = frameRoom ? frameRoom.timerStatus : 'stopped';
          const wallTimeText = new Date().toTimeString().split(' ')[0];
          
          // Draw status dot pulse in the top right corner
          const dotX = canvas.width - 15;
          const dotY = 15;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
          if (status === 'running') {
            const opacity = 0.5 + 0.5 * Math.sin(Date.now() / 150);
            ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#10b981';
            ctx.fill();
          } else if (status === 'paused') {
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.fill();
          }
          
          // Draw wall time centered
          const statusY = 112;
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = colorTextMuted;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wallTimeText, rightCenterX, statusY);

          // Draw latest prompter message at the bottom
          if (latestMsg) {
            ctx.fillStyle = isDark ? '#a5b4fc' : '#0C66E4';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const msgText = `[To: ${latestMsg.targetRole}] ${latestMsg.message}`;
            const maxMsgLength = 22; // shorter limit for narrow column
            const truncatedMsg = msgText.length > maxMsgLength 
              ? msgText.substring(0, maxMsgLength) + '…'
              : msgText;
            ctx.fillText(truncatedMsg, rightCenterX, 144);
          }
        }
      };
      pipIntervalId = setInterval(draw, 250);

    } catch (error: any) {
      console.error('Failed to enter PiP:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT: MASTER TIMER & CONTROLS (2 Columns on large screens) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Status Connection Indicator */}
        <div className="flex items-center justify-between px-4 py-2.5 border border-slate-900/40 bg-slate-900 rounded-lg text-xs text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-505 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-medium">{connected ? 'Koneksi Live Terhubung' : 'Mencoba Menghubungkan…'}</span>
          </div>
          <span className="font-mono text-slate-500 hidden sm:inline">Room ID: {roomId}</span>
        </div>

        {/* Master LCD Time Display */}
        <div className="relative border border-slate-900/40 bg-slate-900 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center overflow-hidden shadow-sm">
          <button
            onClick={togglePiP}
            type="button"
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-850/80 border border-slate-800 hover:bg-slate-800 hover:text-slate-100 transition text-xs flex items-center gap-1.5 z-20 cursor-pointer min-h-[32px] select-none"
            title="Kecilkan ke Picture-in-Picture (Selalu di atas)"
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{isPipActive ? 'Close PiP' : 'Float (PiP)'}</span>
          </button>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,102,228,0.04),transparent_60%)]" />
          
          <span className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
            Master Timer Sesi Aktif
          </span>

          <h2 className="relative z-10 text-lg md:text-2xl font-bold text-center text-slate-200 line-clamp-1 max-w-full font-sans">
            {currentItem ? currentItem.title : '(Sesi Belum Dimulai)'}
          </h2>

          {/* TIMER DIGITS */}
          <div className={`relative z-10 font-mono text-7xl md:text-8xl font-extrabold tracking-tighter my-4 sm:my-6 select-none ${
            isOvertime
              ? 'text-rose-500'
              : remainingSeconds !== null && remainingSeconds <= 60
              ? 'text-red-500 animate-pulse-slow'
              : remainingSeconds !== null && remainingSeconds <= 300
              ? 'text-amber-500'
              : room.timerStatus === 'running'
              ? 'text-indigo-400'
              : 'text-slate-400'
          }`}>
            {timerDisplay}
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-400">
            <span className={`px-2.5 py-1 rounded border text-[10px] font-bold tracking-wider flex items-center gap-1.5 ${
              room.timerStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              room.timerStatus === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                room.timerStatus === 'running' ? 'bg-emerald-450 animate-ping' :
                room.timerStatus === 'paused' ? 'bg-amber-400' : 'bg-slate-500'
              }`} />
              <span>{room.timerStatus.toUpperCase()}</span>
            </span>

            {currentItem && (
              <span className="font-mono text-slate-500">
                Asli: {currentItem.durationSeconds / 60}m | Offset:{' '}
                {room.currentOffsetSeconds >= 0 ? '+' : ''}
                {Math.floor(room.currentOffsetSeconds / 60)}m
              </span>
            )}
          </div>
        </div>

        {/* MASTER TIMELINE NAVIGATION CONTROLS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => handleSelectSession(Math.max(0, room.currentRundownIndex - 1))}
            disabled={room.currentRundownIndex <= 0 || items.length === 0 || isTimerPending}
            className="py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 select-none"
          >
            <SkipBack className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          <button
            onClick={handlePlayPause}
            disabled={items.length === 0 || isTimerPending}
            className={`py-2.5 px-4 text-white text-xs font-semibold rounded-lg transition duration-150 cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 select-none ${
              room.timerStatus === 'running'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {room.timerStatus === 'running' ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Mulai (Play)</span>
              </>
            )}
          </button>

          <button
            onClick={handleStop}
            disabled={room.currentRundownIndex === -1 || isTimerPending}
            className="py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 select-none"
          >
            <Square className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => {
              if (room.currentRundownIndex === -1) {
                handleSelectSession(0);
              } else {
                handleSelectSession(Math.min(items.length - 1, room.currentRundownIndex + 1));
              }
            }}
            disabled={room.currentRundownIndex >= items.length - 1 || items.length === 0 || isTimerPending}
            className="py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 select-none"
          >
            <span>Berikutnya</span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* TIME OFFSET INTERVENTION (MACRO ADJUSTMENT) */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-sans">Intervensi Durasi Sesi</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Tambah atau kurangi durasi sesi aktif secara real-time. Linimasa vendor akan langsung terupdate.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleAdjustOffset(-60)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-2 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 rounded-lg transition duration-150 cursor-pointer min-h-[36px] flex items-center justify-center gap-1 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              aria-label="Kurangi waktu 1 menit"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>1m</span>
            </button>
            <button
              onClick={() => handleAdjustOffset(-300)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-2 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 rounded-lg transition duration-150 cursor-pointer min-h-[36px] flex items-center justify-center gap-1 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              aria-label="Kurangi waktu 5 menit"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>5m</span>
            </button>
            <button
              onClick={() => handleAdjustOffset(60)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-455 rounded-lg transition duration-150 cursor-pointer min-h-[36px] flex items-center justify-center gap-1 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              aria-label="Tambah waktu 1 menit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>1m</span>
            </button>
            <button
              onClick={() => handleAdjustOffset(300)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-455 rounded-lg transition duration-150 cursor-pointer min-h-[36px] flex items-center justify-center gap-1 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              aria-label="Tambah waktu 5 menit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>5m</span>
            </button>
          </div>
        </div>

        {/* SEQUENCE/RUNDOWN LIST SELECTOR */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 font-sans">Lompat Ke Sesi</h3>
          </div>
          <div className="divide-y divide-slate-900/40 border border-slate-900/40 rounded-lg overflow-hidden bg-slate-950/20">
            {items.map((item, index) => {
              const isActive = room.currentRundownIndex === index;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSession(index)}
                  className={`w-full text-left p-3.5 flex items-center justify-between text-xs sm:text-sm transition duration-100 cursor-pointer min-h-[44px] select-none ${
                    isActive 
                      ? 'bg-indigo-600/15 text-indigo-400 border-l-2 border-l-indigo-500 font-semibold' 
                      : 'hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500 w-5">{index + 1}</span>
                    <span className="truncate max-w-[150px] sm:max-w-xs">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 font-mono">
                      {item.durationSeconds / 60}m
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold w-16 text-right truncate">
                      {item.targetRole}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: INSTANT PROMPTER & MESSAGES (1 Column) */}
      <div className="space-y-6">
        
        {/* Prompter Sender Card */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-2.5">
            <MessageSquare className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-sans">Pocket Prompter (Pesan Kru)</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Kirim pesan instan. Perangkat target akan berkedip dan bergetar (haptic) di lapangan.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendPrompter} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="target" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Divisi Target
              </label>
               <select
                id="target"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-sm appearance-none cursor-pointer min-h-[40px]"
              >
                <option value="All">Semua (All)</option>
                {pics.map((pic) => (
                  <option key={pic.id} value={pic.name}>
                    {pic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="message" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Isi Instruksi Singkat
              </label>
              <textarea
                id="message"
                value={prompterText}
                onChange={(e) => setPrompterText(e.target.value)}
                maxLength={120}
                required
                placeholder="MC silakan buka acara. Pengantin siap masuk."
                className="w-full h-24 px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isMsgPending || !prompterText.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer min-h-[40px] select-none"
            >
              {isMsgPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Kirim Instruksi Live</span>
            </button>
          </form>
        </div>

        {/* Message Broadcast History */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans">Riwayat Pesan</h3>
            {messages.length > 0 && (
              <button
                onClick={handleClearPrompter}
                className="text-xs text-slate-500 hover:text-red-400 font-semibold cursor-pointer py-1 px-2 rounded hover:bg-red-500/5 select-none"
              >
                Bersihkan
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Belum ada instruksi yang dikirimkan.
              </p>
            ) : (
              messages.map((msg) => {
                const date = new Date(msg.createdAt);
                const time = [
                  date.getHours(),
                  date.getMinutes(),
                  date.getSeconds()
                ].map(n => String(n).padStart(2, '0')).join(':');

                return (
                  <div
                    key={msg.id}
                    className="border border-slate-800 bg-slate-950/30 rounded-lg p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.2 rounded font-bold border text-[10px] tracking-wide ${getRoleBadgeStyle(msg.targetRole)}`}>
                        To: {msg.targetRole}
                      </span>
                      <span className="font-mono text-slate-500 text-[10px]">{time}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed break-words font-medium">
                      {msg.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Log Aktivitas Card */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 font-sans">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Log Aktivitas</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider">
              Live updates
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {(!state.logs || state.logs.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Belum ada aktivitas yang tercatat.
              </p>
            ) : (
              state.logs.map((log: ActivityLog) => {
                const date = new Date(log.createdAt);
                const time = [
                  date.getHours(),
                  date.getMinutes(),
                  date.getSeconds()
                ].map(n => String(n).padStart(2, '0')).join(':');

                return (
                  <div
                    key={log.id}
                    className="border border-slate-850/60 bg-slate-950/20 rounded-lg p-2.5 flex gap-2.5 items-start text-xs text-slate-350"
                  >
                    <span className="font-mono text-slate-500 text-[10px] shrink-0 mt-0.5">{time}</span>
                    <span className="shrink-0 mt-0.5" title={log.actionType}>
                      {log.actionType === 'timer' && <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      {log.actionType === 'offset' && <Hourglass className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {log.actionType === 'prompter' && <MessageSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      {log.actionType === 'rundown' && <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </span>
                    <span className="leading-relaxed font-medium break-words">
                      {log.description}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
