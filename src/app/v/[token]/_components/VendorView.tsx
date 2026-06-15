'use client';

import React, { useState, useEffect, useRef } from 'react';
import { localDb } from '@/lib/localDb';
import { 
  Monitor, AlertTriangle, MessageSquare, Bell, Wifi, WifiOff, 
  ChevronRight, ArrowRight, ShieldAlert, CheckCircle2 
} from 'lucide-react';

interface VendorViewProps {
  roomId: string;
  roomName: string;
  vendorRole: string;
  token: string;
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

export default function VendorView({ roomId, roomName, vendorRole, token }: VendorViewProps) {
  // 1. Core States
  const [state, setState] = useState<{
    room: RoomState | null;
    items: RundownItem[];
    messages: PrompterMessage[];
  }>({
    room: null,
    items: [],
    messages: [],
  });

  const [isOnline, setIsOnline] = useState(true);
  const [connected, setConnected] = useState(false);
  
  // Ticker states
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [isOvertime, setIsOvertime] = useState(false);
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

  // 3. SSE Connection (Only when online)
  useEffect(() => {
    if (!isOnline) return;

    let eventSource: EventSource;

    function connect() {
      eventSource = new EventSource(`/api/rooms/${roomId}/stream`);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        setTimeout(connect, 3000); // retry
      };

      eventSource.addEventListener('state', async (event: any) => {
        try {
          const data = JSON.parse(event.data);
          setState(data);

          // Auto-cache to Dexie (IndexedDB)
          if (localDb) {
            await localDb.rundownCache.put({
              id: roomId,
              roomName,
              roomState: data.room,
              items: data.items,
              messages: data.messages,
              lastUpdated: Date.now(),
            });
          }
        } catch (e) {
          console.error('Failed to parse SSE state data', e);
        }
      });
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [roomId, isOnline, roomName]);

  // 4. Timer ticker (Local interval running every 200ms)
  useEffect(() => {
    const tick = () => {
      const { room, items } = stateRef.current;
      if (!room || room.currentRundownIndex === -1 || items.length === 0) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        
        // Update Document PiP if active
        if (pipWindowRef.current) {
          const doc = pipWindowRef.current.document;
          const timerEl = doc.getElementById('pip-timer');
          const statusEl = doc.getElementById('pip-status');
          const titleEl = doc.getElementById('pip-title');
          if (timerEl) timerEl.innerText = '00:00';
          if (statusEl) statusEl.innerText = 'STOPPED';
          if (titleEl) titleEl.innerText = '(BELUM DIMULAI)';
        }
        return;
      }

      const currentItem = items[room.currentRundownIndex];
      if (!currentItem) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        return;
      }

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

        const { messages: frameMessages } = stateRef.current;
        const relevantMsgs = frameMessages.filter(
          (m) => m.targetRole === 'All' || m.targetRole === vendorRole
        );
        const latestMsg = relevantMsgs[0];
        const isFreshAlert = activeAlertRef.current !== null;
        const activeMsg = activeAlertRef.current;

        if (container) {
          container.className = `relative min-h-screen flex flex-col items-center justify-center font-sans p-2 select-none transition-colors duration-300 ${
            over ? 'bg-rose-950 animate-pulse-slow' : 'bg-slate-950'
          }`;
        }
        if (titleEl) {
          const sessionTitle = currentItem ? currentItem.title : 'EventFlow';
          const maxTitleLength = 35;
          titleEl.innerText = (sessionTitle.length > maxTitleLength 
            ? sessionTitle.substring(0, maxTitleLength) + '...'
            : sessionTitle).toUpperCase();
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
            timerEl.className = `font-mono text-4xl font-extrabold tracking-tighter text-center ${
              over ? 'text-rose-500' : room.timerStatus === 'running' ? 'text-indigo-400' : 'text-slate-300'
            }`;
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
              msgEl.innerText = latestMsg.message;
              msgEl.className = `text-[9px] font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
            } else {
              msgEl.className = 'hidden';
            }
          }
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

    // Get latest message targeting this role (or 'All')
    const relevantMsgs = messages.filter(
      (m) => m.targetRole === 'All' || m.targetRole === vendorRole
    );
    
    if (relevantMsgs.length === 0) {
      isInitialLoad.current = false;
      return;
    }
    
    const latest = relevantMsgs[0];

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
  }, [state.messages, vendorRole]);

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
          width: 320,
          height: 180,
        });

        pipWindowRef.current = pipWindow;
        setIsPipActive(true);

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
          <div id="pip-container" class="relative min-h-screen flex flex-col items-center justify-center font-sans p-2 select-none bg-slate-950 text-slate-100">
            <span id="pip-status-dot" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
            <span id="pip-title" class="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">EVENTFLOW</span>
            
            <div id="pip-clock-view" class="flex flex-col items-center justify-center">
              <div id="pip-timer" class="font-mono text-4xl font-extrabold tracking-tighter text-slate-355 my-0.5 text-center">00:00</div>
              <div class="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-bold tracking-wider text-center">
                <span id="pip-wall-time">00:00:00</span>
              </div>
            </div>

            <div id="pip-alert-view" class="flex flex-col items-center justify-center text-center px-2 py-1.5 bg-indigo-950 border border-indigo-600 rounded my-1 w-full hidden animate-pulse-fast">
              <span class="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider">PESAN BARU!</span>
              <div id="pip-alert-text" class="text-[11px] font-extrabold text-white leading-snug line-clamp-2"></div>
            </div>

            <div id="pip-message" class="text-[9px] text-indigo-300 font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate hidden"></div>
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
        
        if (titleEl) titleEl.innerText = (currentActiveItem ? currentActiveItem.title : 'EventFlow ⏱️').toUpperCase();
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

        const { messages: initMsgs } = stateRef.current;
        const relevantInitMsgs = initMsgs.filter(
          (m) => m.targetRole === 'All' || m.targetRole === vendorRole
        );
        const latestInitMsg = relevantInitMsgs[0];
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
              msgEl.innerText = `💬 ${latestInitMsg.message}`;
              msgEl.className = `text-[9px] font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
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
      ctx.fillText('Memulai PiP...', canvas.width / 2, 90);

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
        // Fetch fresh state from ref on each draw frame
        const { room: frameRoom, items: frameItems, messages: frameMessages } = stateRef.current;
        const frameActiveItem = frameRoom && frameItems[frameRoom.currentRundownIndex];
        const relevantMsgs = frameMessages.filter(
          (m) => m.targetRole === 'All' || m.targetRole === vendorRole
        );
        const latestMsg = relevantMsgs[0];
        const isFreshAlert = activeAlertRef.current !== null;
        const activeMsg = activeAlertRef.current;

        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isFreshAlert && activeMsg) {
          // Draw BIG ALERT in the center instead of the clock!
          ctx.fillStyle = '#1e1b4b'; // dark indigo
          ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
          ctx.strokeStyle = '#6366f1'; // indigo border
          ctx.lineWidth = 2;
          ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

          ctx.fillStyle = '#f59e0b'; // Amber header text
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText('INSTRUKSI BARU!', canvas.width / 2, 34);

          ctx.fillStyle = '#ffffff'; // White message text
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
          // Normal clock drawing
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          const sessionTitle = frameActiveItem ? frameActiveItem.title : 'EventFlow';
          const maxTitleLength = 35;
          const truncatedTitle = sessionTitle.length > maxTitleLength 
            ? sessionTitle.substring(0, maxTitleLength) + '...'
            : sessionTitle;
          ctx.fillText(truncatedTitle.toUpperCase(), canvas.width / 2, 28);

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

          ctx.fillStyle = isFrameOvertime ? '#ef4444' : '#818cf8';
          ctx.font = 'bold 64px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(timerDisplayRef.current, canvas.width / 2, 85);

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
          const statusY = 120;
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wallTimeText, canvas.width / 2, statusY);

          // Draw latest prompter message at the bottom
          if (latestMsg) {
            ctx.fillStyle = '#a5b4fc';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const msgText = latestMsg.message;
            const maxMsgLength = 45;
            const truncatedMsg = msgText.length > maxMsgLength 
              ? msgText.substring(0, maxMsgLength) + '...'
              : msgText;
            ctx.fillText(truncatedMsg, canvas.width / 2, 144);
          }
        }
      };

      pipIntervalId = setInterval(draw, 250);

    } catch (error: any) {
      console.error('Failed to enter PiP:', error);
      alert(`Gagal mengaktifkan Picture-in-Picture: ${error.message || error}`);
    }
  };

  const { room, items, messages } = state;
  const currentItem = room && items[room.currentRundownIndex];
  const nextItem = room && items[room.currentRundownIndex + 1];

  // Filtering messages for this specific vendor view
  const myMessages = messages.filter(
    (m) => m.targetRole === 'All' || m.targetRole === vendorRole
  );

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-350 p-4 pb-6 select-none ${
      isOvertime 
        ? 'bg-rose-950 text-white animate-pulse-slow' 
        : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* 1. TOP STATUS PANEL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Event Kontrol</span>
            <h1 className="text-md font-extrabold text-white truncate max-w-[140px] sm:max-w-[180px] font-sans">{roomName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePiP}
              type="button"
              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 font-bold transition duration-150 flex items-center gap-1 cursor-pointer min-h-[32px] select-none"
              title="Aktifkan Picture-in-Picture"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>Float</span>
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              vendorRole === 'All' ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' :
              vendorRole === 'MC' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
              vendorRole === 'Catering' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
              'border-purple-500/20 bg-purple-500/10 text-purple-400'
            }`}>
              {vendorRole}
            </span>

            {/* Offline/Online indicators */}
            {!isOnline ? (
              <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px] font-bold animate-pulse flex items-center gap-1.5">
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

        {/* Current Active Item Card */}
        <div className="text-center py-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1 font-mono">
            Sesi Berlangsung
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white line-clamp-2 px-4 font-sans">
            {currentItem ? currentItem.title : '(Sesi Belum Dimulai)'}
          </h2>
        </div>
      </div>

      {/* 2. GIANT TIMER VIEW */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className={`font-mono text-8xl sm:text-9xl font-extrabold tracking-tighter select-none ${
          isOvertime ? 'text-white' : room?.timerStatus === 'running' ? 'text-indigo-400' : 'text-slate-400'
        }`}>
          {timerDisplay}
        </div>
        
        {isOvertime && (
          <span className="text-xs font-extrabold uppercase bg-white text-rose-700 px-3.5 py-1.5 rounded-full animate-bounce mt-4 shadow-lg shadow-rose-950/50 flex items-center gap-1.5 font-sans">
            <AlertTriangle className="w-4 h-4 text-rose-700 animate-pulse" />
            <span>TERLAMBAT (OVERTIME)</span>
          </span>
        )}
      </div>

      {/* 3. NEXT SESSION / PROMPTER BAR */}
      <div className="space-y-4">
        {/* Next Item indicator */}
        <div className="border border-slate-900 bg-slate-900/40 rounded-xl p-4 flex items-center justify-between text-sm">
          <span className="text-slate-400 font-medium">Sesi Berikutnya:</span>
          <span className="font-bold text-white max-w-[200px] truncate font-sans">
            {nextItem ? nextItem.title : 'Selesai / Habis'}
          </span>
        </div>

        {/* Live Prompter Message (Latest Instruction) */}
        <div className="border border-slate-900 bg-slate-900/60 rounded-xl p-4 min-h-[96px] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instruksi Terakhir Divisi Anda:</span>
          </span>
          {myMessages.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Belum ada instruksi khusus untuk divisi Anda. Tetap ikuti rundown acara.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-indigo-300 font-extrabold leading-relaxed animate-in fade-in duration-300 font-sans">
                "{myMessages[0].message}"
              </p>
              <span className="text-[9px] text-slate-500 font-mono block">
                Dikirim pukul {new Date(myMessages[0].createdAt).toLocaleTimeString('id-ID')}
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-400/30 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider font-mono">
              Instruksi Baru ({activeAlert.targetRole})
            </div>
            <h2 className="text-2xl font-black text-white leading-snug font-sans">
              "{activeAlert.message}"
            </h2>
            <button
              onClick={() => setActiveAlert(null)}
              className="w-full py-3.5 bg-white hover:bg-slate-100 text-indigo-950 font-bold rounded-lg text-sm shadow-md transition cursor-pointer min-h-[48px]"
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
