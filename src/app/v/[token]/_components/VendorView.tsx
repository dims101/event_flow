'use client';

import React, { useState, useEffect, useRef } from 'react';
import { localDb } from '@/lib/localDb';
import { supabase } from '@/lib/supabaseClient';
import { getRundownItemsAction } from '@/app/actions/rundown';
import { subscribeToPushAction, unsubscribeFromPushAction } from '@/app/actions/pushSubscribe';
import { 
  Monitor, AlertTriangle, MessageSquare, Bell, Wifi, WifiOff, 
  ChevronRight, ArrowRight, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import { getRoleBadgeStyle } from '@/lib/picColors';

interface VendorViewProps {
  roomId: string;
  roomName: string;
  vendorRole: string;
  token: string;
  initialRoom: any;
  initialItems: any[];
  initialMessages: any[];
}

interface RoomState {
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

const playSound = (type: 'message' | 'timer') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    if (type === 'message') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.start(now);
      osc1.stop(now + 0.3);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.42);
    } else if (type === 'timer') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    console.error('AudioContext sound failed to play:', e);
  }
};

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
    createdAt: dbLog.created_at !== undefined ? Number(dbLog.createdAt) : dbLog.createdAt,
  };
};

export default function VendorView({ 
  roomId, 
  roomName, 
  vendorRole, 
  token,
  initialRoom,
  initialItems,
  initialMessages 
}: VendorViewProps) {
  // 1. Core States
  const [state, setState] = useState<{
    room: RoomState | null;
    items: RundownItem[];
    messages: PrompterMessage[];
  }>({
    room: mapRoom(initialRoom),
    items: initialItems,
    messages: initialMessages.map(mapMessage).filter(Boolean) as any[],
  });

  const [isOnline, setIsOnline] = useState(true);
  const [connected, setConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  
  // Ticker states
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [isOvertime, setIsOvertime] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  
  // Prompter alert states
  const [activeAlert, setActiveAlert] = useState<PrompterMessage | null>(null);
  const activeAlertRef = useRef<PrompterMessage | null>(null);
  useEffect(() => {
    activeAlertRef.current = activeAlert;
  }, [activeAlert]);
  
  // Refs
  const lastProcessedMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const prevOffset = useRef<number | null>(null);
  const prevStatus = useRef<string | null>(null);
  const pipWindowRef = useRef<any>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

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
        try {
          pipWindowRef.current.close();
        } catch (e) {}
      }
      if (pipVideoRef.current) {
        try {
          const video = pipVideoRef.current;
          if ((video as any).webkitPresentationMode === 'picture-in-picture') {
            (video as any).webkitSetPresentationMode('inline');
          }
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        } catch (e) {}
      }
    };
  }, []);

  // Check Web Push Notification support and status
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false);
      return;
    }
    setPushSupported(true);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(err => console.error("Error checking push subscription:", err));
  }, []);

  // 2. Network status tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };
    
    const handleOffline = async () => {
      setIsOnline(false);
      setConnected(false);
      // Load cache when offline
      if (localDb) {
        const cached = await localDb.rundownCache.get(roomId);
        if (cached) {
          setState({
            room: cached.roomState as any,
            items: cached.items,
            messages: cached.messages,
          });
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [roomId]);

  // Trigger sound/vibrate on timer status or offset change
  useEffect(() => {
    if (!state.room) return;

    // Trigger on offset changes
    if (prevOffset.current !== null && prevOffset.current !== state.room.currentOffsetSeconds) {
      playSound('timer');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
    }

    // Trigger on play/pause status changes
    if (prevStatus.current !== null && prevStatus.current !== state.room.timerStatus) {
      playSound('timer');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(150);
      }
    }

    prevOffset.current = state.room.currentOffsetSeconds;
    prevStatus.current = state.room.timerStatus;
  }, [state.room]);



  // 3. Supabase Realtime Connection (Only when online)
  useEffect(() => {
    if (!isOnline) return;

    setConnected(true);

    const updateDexieCache = async (nextState: any) => {
      if (localDb) {
        try {
          await localDb.rundownCache.put({
            id: roomId,
            roomName,
            roomState: nextState.room,
            items: nextState.items,
            messages: nextState.messages,
            lastUpdated: Date.now(),
          });
        } catch (err) {
          console.error('Failed to update Dexie cache:', err);
        }
      }
    };

    const channel = supabase
      .channel(`room-vendor:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          const mappedRoom = mapRoom(payload.new);
          setState((prev: any) => {
            const nextState = { ...prev, room: mappedRoom };
            updateDexieCache(nextState);
            return nextState;
          });
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
            const nextState = {
              ...prev,
              messages: [mappedMsg, ...prev.messages].slice(0, 15),
            };
            updateDexieCache(nextState);
            return nextState;
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
          setState((prev: any) => {
            const nextState = { ...prev, items: updatedItems };
            updateDexieCache(nextState);
            return nextState;
          });
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
  }, [roomId, isOnline, roomName]);

  // 4. Timer ticker (Local interval running every 200ms)
  useEffect(() => {
    const tick = () => {
      const { room, items } = stateRef.current;
      if (!room || room.currentRundownIndex === -1 || items.length === 0) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        setRemainingSeconds(null);
        
        // Update Document PiP if active
        if (pipWindowRef.current) {
          try {
            const doc = pipWindowRef.current.document;
            if (doc) {
              const timerEl = doc.getElementById('pip-timer');
              const statusEl = doc.getElementById('pip-status');
              const titleEl = doc.getElementById('pip-title');
              if (timerEl) timerEl.innerText = '00:00';
              if (statusEl) statusEl.innerText = 'STOPPED';
              if (titleEl) titleEl.innerText = '(BELUM DIMULAI)';
            } else {
              pipWindowRef.current = null;
              setIsPipActive(false);
            }
          } catch (pipErr) {
            console.error('Error updating PiP window document on stop:', pipErr);
            try {
              pipWindowRef.current.close();
            } catch (e) {}
            pipWindowRef.current = null;
            setIsPipActive(false);
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

      let elapsed = room.timerElapsedSeconds;
      if (room.timerStatus === 'running' && room.timerStartTime) {
        elapsed += (Date.now() - room.timerStartTime) / 1000;
      }

      const totalAllowed = currentItem.durationSeconds + (room.currentOffsetSeconds || 0);
      const diff = totalAllowed - elapsed;

      const over = diff < 0;
      const absDiff = Math.abs(Math.floor(diff));
      const min = Math.floor(absDiff / 60);
      const sec = absDiff % 60;
      
      const formatted = `${over ? '-' : ''}${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      
      setTimerDisplay(formatted);
      setIsOvertime(over);
      setRemainingSeconds(Math.floor(diff));

      // Update Document PiP if active
      if (pipWindowRef.current) {
        try {
          const doc = pipWindowRef.current.document;
          if (!doc) {
            pipWindowRef.current = null;
            setIsPipActive(false);
            return;
          }
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
            container.className = `relative min-h-screen grid grid-cols-[0.45fr_1.55fr] gap-2 font-sans p-2 select-none transition-colors duration-300 ${
              over ? 'bg-rose-950 animate-pulse-slow' : 'bg-slate-950'
            }`;
          }
          if (titleEl) {
            const sessionTitle = currentItem ? currentItem.title : 'EventFlow';
            const maxTitleLength = 20;
            titleEl.innerText = (sessionTitle.length > maxTitleLength 
              ? sessionTitle.substring(0, maxTitleLength) + '…'
              : sessionTitle).toUpperCase();
          }

          if (listEl && items) {
            const total = items.length;
            const curIdx = room.currentRundownIndex;
            const limit = 5;
            const page = curIdx !== -1 ? Math.floor(curIdx / limit) : 0;
            const start = page * limit;
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
            if (alertText) alertText.innerText = `[to ${activeMsg.targetRole}] : ${activeMsg.message}`;
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
              timerEl.className = `font-mono text-6xl font-black tracking-tighter text-center leading-none ${pipColorClass}`;
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
                msgEl.innerText = `[to ${latestMsg.targetRole}] : ${latestMsg.message}`;
                msgEl.className = `text-xs font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
              } else {
                msgEl.className = 'hidden';
              }
            }
          }
        } catch (pipErr) {
          console.error('Error updating PiP window document, closing PiP:', pipErr);
          try {
            pipWindowRef.current.close();
          } catch (e) {}
          pipWindowRef.current = null;
          setIsPipActive(false);
        }
      }
    };

    tick();

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

  // 5. Prompter check & haptic cues (Vibrate & alert overlay)
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
      
      // Trigger haptic vibration & sound chime
      playSound('message');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300]);
      }

      // Display flashing screen alert
      setActiveAlert(latest);
      
      // Auto-hide alert after 7s (matches the 7-second design requirement)
      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [state.messages]);

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
          <div id="pip-container" class="relative min-h-screen grid grid-cols-[0.45fr_1.55fr] gap-2 font-sans p-2 select-none bg-slate-950 text-slate-100">
            <!-- Left: Rundown List -->
            <div id="pip-rundown-list" class="flex flex-col gap-1 pr-1.5 border-r border-slate-900/60 overflow-hidden text-[13px] justify-center">
              <!-- Items will be injected here dynamically -->
            </div>
            
            <!-- Right: Timer, Wall Clock, Prompter -->
            <div class="flex flex-col items-center justify-center relative pl-1">
              <span id="pip-status-dot" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
              <span id="pip-title" class="text-sm font-bold text-slate-400 uppercase tracking-wider text-center mb-1.5">EVENTFLOW</span>
              
              <div id="pip-clock-view" class="flex flex-col items-center justify-center w-full">
                <div id="pip-timer" class="font-mono text-6xl font-black tracking-tighter text-slate-300 text-center leading-none">00:00</div>
                <div class="mt-2 flex items-center gap-2 text-base px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-bold tracking-wider text-center">
                  <span id="pip-wall-time" class="font-mono">00:00:00</span>
                </div>
              </div>

              <div id="pip-alert-view" class="flex flex-col items-center justify-center text-center px-1.5 py-1 bg-indigo-950 border border-indigo-600 rounded w-full hidden animate-pulse-fast">
                <span class="text-[7px] font-extrabold text-rose-500 uppercase tracking-wider">ALERT!</span>
                <div id="pip-alert-text" class="text-[9px] font-extrabold text-slate-50 leading-snug line-clamp-2"></div>
              </div>

              <div id="pip-message" class="text-xs text-indigo-300 font-bold text-center mt-2 px-1 border-t border-slate-900 pt-1 w-full truncate hidden"></div>
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
            padding: 4px 6px;
            border-radius: 4px;
            margin: 2px 0;
            transition: all 0.15s ease;
            white-space: normal;
          }
          .pip-item-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            line-height: 1.2;
          }
          .pip-item-active {
            font-weight: 850;
            font-size: 16px;
            color: #818cf8;
            background-color: rgba(99, 102, 241, 0.15);
            border-left: 3.5px solid #6366f1;
            padding-left: 6px;
          }
          .pip-item-inactive {
            font-size: 13px;
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
          const limit = 5;
          const page = curIdx !== -1 ? Math.floor(curIdx / limit) : 0;
          const start = page * limit;
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
          if (alertText) alertText.innerText = `[to ${activeMsg.targetRole}] : ${activeMsg.message}`;
          if (msgEl) msgEl.className = 'hidden';
        } else {
          if (clockView) clockView.style.display = 'flex';
          if (alertView) alertView.style.display = 'none';
          if (msgEl) {
            if (latestInitMsg) {
              msgEl.innerText = `[to ${latestInitMsg.targetRole}] : ${latestInitMsg.message}`;
              msgEl.className = `text-xs font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
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
    const hasWebkitPiP = typeof HTMLVideoElement !== 'undefined' && 
                         (HTMLVideoElement.prototype as any).webkitSupportsPresentationMode;
    
    if (!document.pictureInPictureEnabled && !hasWebkitPiP) {
      alert('Picture-in-Picture tidak didukung atau dinonaktifkan di browser ini.');
      return;
    }

    if (isPipActive) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (pipVideoRef.current && (pipVideoRef.current as any).webkitPresentationMode === 'picture-in-picture') {
          (pipVideoRef.current as any).webkitSetPresentationMode('inline');
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
      pipVideoRef.current = video;

      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(10) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(10) : null;
      if (!canvasStream) {
        throw new Error('Browser tidak mendukung pengambilan stream dari canvas.');
      }
      
      video.srcObject = canvasStream;
      
      try {
        await video.play();
      } catch (playErr) {
        console.warn('Initial video.play() failed, continuing:', playErr);
      }

      // Beri sedikit jeda mikro agar frame render terkomposisi di Safari iOS
      await new Promise((r) => requestAnimationFrame(r));

      if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      } else if ((video as any).webkitSupportsPresentationMode && typeof (video as any).webkitSetPresentationMode === 'function') {
        (video as any).webkitSetPresentationMode('picture-in-picture');
      } else {
        throw new Error('Browser tidak mendukung Picture-in-Picture.');
      }

      setIsPipActive(true);

      let pipIntervalId: any = null;

      const handleLeavePiP = () => {
        setIsPipActive(false);
        pipVideoRef.current = null;
        if (pipIntervalId) clearInterval(pipIntervalId);
        try {
          document.body.removeChild(video);
        } catch (e) {}
      };

      video.addEventListener('leavepictureinpicture', handleLeavePiP);

      // Safari iOS event listener
      video.addEventListener('webkitpresentationmodechanged', () => {
        const presentationMode = (video as any).webkitPresentationMode;
        if (presentationMode === 'inline' || presentationMode === 'fullscreen') {
          handleLeavePiP();
        }
      });

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
          ctx.fillText(`INSTRUKSI BARU!`, canvas.width / 2, 34);

          ctx.fillStyle = colorTextWhite;
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Wrap text if needed (max 2 lines)
          const msgText = `"[to ${activeMsg.targetRole}] : ${activeMsg.message}"`;
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
          const leftWidth = 75;
          const rightStart = 85;
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
            const limit = 5;
            const page = curIdx !== -1 ? Math.floor(curIdx / limit) : 0;
            const start = page * limit;
            const end = Math.min(total, start + limit);
            
            let yOffset = 15;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            for (let index = start; index < end; index++) {
              const item = frameItems[index];
              if (!item) continue;
              const isActive = index === curIdx;
              
              if (isActive) {
                ctx.font = 'bold 14px sans-serif';
                ctx.fillStyle = isDark ? '#818cf8' : '#0c66e4'; // Mencolok
              } else {
                ctx.font = '11px sans-serif';
                ctx.fillStyle = colorTextMuted;
              }
              
              // Wrap text dynamically for canvas
              const itemNum = `${index + 1}. `;
              const fullText = itemNum + item.title;
              const maxTextWidth = leftWidth - 8;
              
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
              const lineHeight = isActive ? 15 : 12;
              
              // Draw active indicator bar
              if (isActive) {
                ctx.fillStyle = isDark ? '#6366f1' : '#0c66e4';
                ctx.fillRect(2, yOffset, 2, displayLines.length * lineHeight);
                ctx.fillStyle = isDark ? '#818cf8' : '#0c66e4';
              }
              
              displayLines.forEach((line, lineIdx) => {
                ctx.fillText(line, isActive ? 8 : 6, yOffset + lineIdx * lineHeight);
              });
              
              yOffset += displayLines.length * lineHeight + 6;
              if (yOffset > canvas.height - 5) break;
            }
          }

          // 2. Normal clock drawing in the right column
          ctx.fillStyle = colorTextSlate;
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          const sessionTitle = frameActiveItem ? frameActiveItem.title : 'EventFlow';
          const maxTitleLength = 28; // slightly longer limit for wider right column width limit
          const truncatedTitle = sessionTitle.length > maxTitleLength 
            ? sessionTitle.substring(0, maxTitleLength) + '…'
            : sessionTitle;
          ctx.fillText(truncatedTitle.toUpperCase(), rightCenterX, 20);

          // Check if overtime dynamically
          let isFrameOvertime = false;
          if (frameRoom && frameActiveItem) {
            let elapsed = frameRoom.timerElapsedSeconds;
            if (frameRoom.timerStatus === 'running' && frameRoom.timerStartTime) {
              elapsed += (Date.now() - frameRoom.timerStartTime) / 1000;
            }
            const totalAllowed = frameActiveItem.durationSeconds + (frameRoom.currentOffsetSeconds || 0);
            isFrameOvertime = (totalAllowed - elapsed) < 0;
          }

          let frameRemainingSec = null;
          if (frameRoom && frameActiveItem) {
            let elapsed = frameRoom.timerElapsedSeconds;
            if (frameRoom.timerStatus === 'running' && frameRoom.timerStartTime) {
              elapsed += (Date.now() - frameRoom.timerStartTime) / 1000;
            }
            const totalAllowed = frameActiveItem.durationSeconds + (frameRoom.currentOffsetSeconds || 0);
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

          ctx.font = 'bold 64px monospace'; // larger font for wider column
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(timerDisplayRef.current, rightCenterX, 72);

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
          const statusY = 115;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = colorTextMuted;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wallTimeText, rightCenterX, statusY);

          // Draw latest prompter message at the bottom
          if (latestMsg) {
            ctx.fillStyle = isDark ? '#a5b4fc' : '#0C66E4';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const msgText = `[to ${latestMsg.targetRole}] : ${latestMsg.message}`;
            const maxMsgLength = 28; // longer limit for wider column
            const truncatedMsg = msgText.length > maxMsgLength 
              ? msgText.substring(0, maxMsgLength) + '…'
              : msgText;
            ctx.fillText(truncatedMsg, rightCenterX, 148);
          }
        }
      };

      pipIntervalId = setInterval(draw, 250);

    } catch (error: any) {
      console.error('Failed to enter PiP:', error);
      alert(`Gagal mengaktifkan Picture-in-Picture: ${error.message || error}`);
    }
  };

  const handleToggleNotification = async () => {
    try {
      if (!pushSupported) {
        alert("Browser atau perangkat Anda tidak mendukung push notifikasi.");
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      if (!registration) {
        throw new Error("Service Worker tidak aktif.");
      }

      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout menunggu Service Worker siap.")), 5000)
        ),
      ]);

      if (!isSubscribed) {
        // 1. Minta Izin Notifikasi
        const status = await Notification.requestPermission();
        if (status !== "granted") {
          throw new Error("Izin notifikasi ditolak oleh browser.");
        }

        // 2. Dapatkan VAPID Key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID Public Key belum dikonfigurasi di server.");
        }
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

        // 3. Subscribe
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        // 4. Simpan ke Database
        const res = await subscribeToPushAction(
          roomId,
          vendorRole,
          JSON.parse(JSON.stringify(sub)),
          navigator.userAgent
        );

        if (res.error) {
          throw new Error(res.error);
        }
        setIsSubscribed(true);
      } else {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribeFromPushAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setIsSubscribed(false);
      }
    } catch (err: any) {
      console.error("Gagal memperbarui notifikasi:", err);
      alert(err.message || "Gagal mengubah setelan notifikasi.");
    }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const { room, items, messages } = state;
  const currentItem = room && items[room.currentRundownIndex];
  const nextItem = room && items[room.currentRundownIndex + 1];

  // Show all messages since this is a shared screen
  const allMessages = messages;

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-350 p-4 pb-6 select-none ${
      isOvertime 
        ? 'bg-rose-950 text-white animate-pulse-slow' 
        : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* 1. TOP STATUS PANEL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900/40 pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Event Kontrol</span>
            <h1 className="text-sm font-bold text-slate-100 truncate max-w-[140px] sm:max-w-[180px] font-sans">{roomName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePiP}
              type="button"
              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 font-bold transition duration-150 flex items-center gap-1 cursor-pointer min-h-[32px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              title="Aktifkan Picture-in-Picture"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>Float</span>
            </button>

            {pushSupported && (
              <button
                onClick={handleToggleNotification}
                type="button"
                className={`px-2.5 py-1 rounded-lg border transition duration-150 flex items-center gap-1 cursor-pointer min-h-[32px] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                  isSubscribed
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold'
                }`}
                title={isSubscribed ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
              >
                <Bell className={`w-3.5 h-3.5 ${isSubscribed ? 'text-emerald-400' : 'text-slate-400 animate-pulse'}`} />
                <span>{isSubscribed ? "Aktif" : "Notif"}</span>
              </button>
            )}

            <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${getRoleBadgeStyle(vendorRole)}`}>
              {vendorRole}
            </span>

            {/* Offline/Online indicators */}
            {!isOnline ? (
              <span className="px-2 py-1 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px] font-bold animate-pulse flex items-center gap-1.5">
                <WifiOff className="w-3 h-3" />
                <span>OFFLINE</span>
              </span>
            ) : connected ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Koneksi terhubung" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" title="Koneksi terputus" />
            )}
          </div>
        </div>

        {/* Option 2: Active Push Notification Invite Banner */}
        {pushSupported && !isSubscribed && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-slate-300 text-xs gap-3 animate-pulse-slow">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400 shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
              <span>Aktifkan push notifikasi untuk getaran HP & smartwatch saat instruksi baru masuk.</span>
            </div>
            <button
              onClick={handleToggleNotification}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition duration-150 whitespace-nowrap cursor-pointer min-h-[28px]"
            >
              Aktifkan
            </button>
          </div>
        )}

        {/* Current Active Item Card */}
        <div className="text-center py-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1 font-mono">
            Sesi Berlangsung
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100 line-clamp-2 px-4 font-sans">
            {currentItem ? currentItem.title : '(Sesi Belum Dimulai)'}
          </h2>
        </div>
      </div>

      {/* 2. GIANT TIMER VIEW */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className={`font-mono text-8xl sm:text-9xl font-extrabold tracking-tighter select-none ${
          isOvertime
            ? 'text-white'
            : remainingSeconds !== null && remainingSeconds <= 60
            ? 'text-red-500 animate-pulse-slow'
            : remainingSeconds !== null && remainingSeconds <= 300
            ? 'text-amber-500'
            : room?.timerStatus === 'running'
            ? 'text-indigo-400'
            : 'text-slate-400'
        }`}>
          {timerDisplay}
        </div>
        
        {isOvertime && (
          <span className="text-xs font-bold uppercase bg-white text-rose-700 px-3.5 py-1.5 rounded-lg animate-bounce mt-4 shadow-lg shadow-rose-950/50 flex items-center gap-1.5 font-sans">
            <AlertTriangle className="w-4 h-4 text-rose-700 animate-pulse" />
            <span>TERLAMBAT (OVERTIME)</span>
          </span>
        )}
      </div>

      {/* 3. NEXT SESSION / PROMPTER BAR */}
      <div className="space-y-4">
        {/* Next Item indicator */}
        <div className="border border-slate-900/40 bg-slate-900 rounded-xl p-4 flex items-center justify-between text-sm">
          <span className="text-slate-400 font-medium">Sesi Berikutnya:</span>
          <span className="font-bold text-slate-100 max-w-[200px] truncate font-sans">
            {nextItem ? nextItem.title : 'Selesai / Habis'}
          </span>
        </div>

        {/* Live Prompter Message (Latest Instruction) */}
        <div className="border border-slate-900/40 bg-slate-900 rounded-xl p-4 min-h-[96px] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instruksi Terakhir Prompter:</span>
          </span>
          {allMessages.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Belum ada instruksi prompter. Tetap ikuti rundown acara.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-indigo-300 font-bold leading-relaxed animate-in fade-in duration-300 font-sans">
                &ldquo;[to {allMessages[0].targetRole}] : {allMessages[0].message}&rdquo;
              </p>
              <span className="text-[9px] text-slate-500 font-mono block">
                Dikirim pukul {new Date(allMessages[0].createdAt).toLocaleTimeString('id-ID')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. FRESH MESSAGE HAPTIC ALERTS OVERLAY */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/95 border-4 border-indigo-500 animate-in zoom-in-95 duration-150">
          <div className="absolute inset-0 bg-indigo-950 animate-flash-blue" />
          <div className="relative z-10 text-center space-y-6 max-w-sm">
            <div className="flex items-center justify-center">
              <Bell className="w-16 h-16 text-amber-400 animate-bounce" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-indigo-400/30 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider font-mono">
              Instruksi Baru ({activeAlert.targetRole})
            </div>
            <h2 className="text-2xl font-bold text-white leading-snug font-sans">
              &ldquo;[to {activeAlert.targetRole}] : {activeAlert.message}&rdquo;
            </h2>
            <button
              onClick={() => setActiveAlert(null)}
              className="w-full py-3 bg-white hover:bg-slate-100 text-indigo-950 font-bold rounded-lg text-sm shadow-md transition cursor-pointer min-h-[40px] select-none"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Embedded CSS rules for flash animations */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.93; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes flash-blue {
          0%, 100% { background-color: rgba(30, 27, 75, 0.95); }
          50% { background-color: rgba(67, 56, 202, 0.95); }
        }
        .animate-flash-blue {
          animation: flash-blue 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
