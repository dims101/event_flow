'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  updateTimerStatusAction, 
  adjustRoomOffsetAction, 
  sendPrompterMessageAction,
  clearPrompterMessagesAction 
} from '@/app/actions/roomControl';
import { 
  Play, Pause, Square, SkipBack, SkipForward, Plus, Minus, Send, 
  Trash2, Clock, Activity, MessageSquare, Monitor, Check, Calendar, 
  ChevronRight, Sparkles, AlertCircle, Hourglass, HelpCircle 
} from 'lucide-react';

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

interface ControlPanelProps {
  roomId: string;
  initialRoom: Room;
  initialItems: RundownItem[];
  initialMessages: PrompterMessage[];
  initialLogs: ActivityLog[];
}

export default function ControlPanel({ 
  roomId, 
  initialRoom, 
  initialItems, 
  initialMessages,
  initialLogs
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

  // 1. Establish SSE Connection
  useEffect(() => {
    let eventSource: EventSource;

    function connect() {
      eventSource = new EventSource(`/api/rooms/${roomId}/stream`);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        // Retry connection after 3s
        setTimeout(connect, 3000);
      };

      eventSource.addEventListener('state', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          setState(data);
        } catch (e) {
          console.error('Failed to parse SSE state data', e);
        }
      });
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
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
        const latestMsg = frameMessages[0];
        const isFreshAlert = activeAlertRef.current !== null;
        const activeMsg = activeAlertRef.current;

        if (container) {
          container.className = `relative min-h-screen flex flex-col items-center justify-center font-sans p-2 select-none transition-colors duration-300 ${
            over ? 'bg-rose-950 animate-pulse-slow' : 'bg-slate-950'
          }`;
        }
        if (titleEl) {
          const sessionTitle = currentItem ? currentItem.title : 'EventFlow ⏱️';
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
              msgEl.innerText = `[To: ${latestMsg.targetRole}] ${latestMsg.message}`;
              msgEl.className = `text-[9px] font-bold text-center mt-1.5 px-2 line-clamp-1 border-t border-slate-900 pt-1 w-full truncate block text-indigo-300`;
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
    const targetStatus = status || room.timerStatus;
    startTimerTransition(async () => {
      await updateTimerStatusAction(roomId, targetStatus as any, index);
    });
  };

  const handleStop = () => {
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
        const latestMsg = frameMessages[0];
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
          ctx.fillText(`INSTRUKSI BARU! [To: ${activeMsg.targetRole}]`, canvas.width / 2, 34);

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
          
          const sessionTitle = frameActiveItem ? frameActiveItem.title : 'EventFlow ⏱️';
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

          // Draw latest prompter message sent at the bottom
          if (latestMsg) {
            ctx.fillStyle = '#a5b4fc';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const msgText = `[To: ${latestMsg.targetRole}] ${latestMsg.message}`;
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
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT: MASTER TIMER & CONTROLS (2 Columns on large screens) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Status Connection Indicator */}
        <div className="flex items-center justify-between px-4 py-2.5 border border-slate-900 bg-slate-900/40 rounded-xl text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-medium">{connected ? 'Koneksi Live Terhubung' : 'Mencoba Menghubungkan...'}</span>
          </div>
          <span className="font-mono text-slate-500 hidden sm:inline">Room ID: {roomId}</span>
        </div>

        {/* Master LCD Time Display */}
        <div className="relative border border-slate-900 bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
          <button
            onClick={togglePiP}
            type="button"
            className="absolute top-4 right-4 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 hover:bg-slate-850 hover:text-white transition text-xs flex items-center gap-1.5 z-20 cursor-pointer min-h-[38px] select-none"
            title="Kecilkan ke Picture-in-Picture (Selalu di atas)"
          >
            <Monitor className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">{isPipActive ? 'Close PiP' : 'Float (PiP)'}</span>
          </button>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_60%)]" />
          
          <span className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
            Master Timer Sesi Aktif
          </span>

          <h2 className="relative z-10 text-lg md:text-2xl font-bold text-center text-slate-200 line-clamp-1 max-w-full font-sans">
            {currentItem ? currentItem.title : '(Sesi Belum Dimulai)'}
          </h2>

          {/* TIMER DIGITS */}
          <div className={`relative z-10 font-mono text-7xl md:text-9xl font-extrabold tracking-tighter my-4 sm:my-6 select-none ${
            isOvertime ? 'text-rose-500' : room.timerStatus === 'running' ? 'text-indigo-400' : 'text-slate-400'
          }`}>
            {timerDisplay}
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-400">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider flex items-center gap-1.5 ${
              room.timerStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              room.timerStatus === 'paused' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                room.timerStatus === 'running' ? 'bg-emerald-400 animate-ping' :
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
            className="py-3 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition duration-150 cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
          >
            <SkipBack className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          <button
            onClick={handlePlayPause}
            disabled={items.length === 0 || isTimerPending}
            className={`py-3 px-4 text-white text-xs sm:text-sm font-bold rounded-xl transition duration-150 shadow-lg cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5 ${
              room.timerStatus === 'running'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10'
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
            className="py-3 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition duration-150 cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
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
            className="py-3 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition duration-150 cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
          >
            <span>Berikutnya</span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* TIME OFFSET INTERVENTION (MACRO ADJUSTMENT) */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-md font-bold text-white font-sans">Intervensi Durasi Sesi</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Tambah atau kurangi durasi sesi aktif secara real-time. Linimasa vendor akan langsung terupdate.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleAdjustOffset(-60)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-3 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition duration-150 cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>1m</span>
            </button>
            <button
              onClick={() => handleAdjustOffset(-300)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-3 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition duration-150 cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>5m</span>
            </button>
            <button
              onClick={() => handleAdjustOffset(60)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-3 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>1m</span>
            </button>
            <button
              onClick={() => handleAdjustOffset(300)}
              disabled={!currentItem || isOffsetPending}
              className="px-4 py-3 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>5m</span>
            </button>
          </div>
        </div>

        {/* SEQUENCE/RUNDOWN LIST SELECTOR */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-md font-bold text-white font-sans">Lompat Ke Sesi</h3>
          </div>
          <div className="divide-y divide-slate-850 border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
            {items.map((item, index) => {
              const isActive = room.currentRundownIndex === index;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSession(index)}
                  className={`w-full text-left p-3.5 flex items-center justify-between text-xs sm:text-sm transition duration-150 cursor-pointer min-h-[48px] ${
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
                    <span className="text-[10px] px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-mono">
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
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-start gap-2.5">
            <MessageSquare className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-md font-bold text-white font-sans">Pocket Prompter (Pesan Kru)</h3>
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
              <div className="relative">
                <select
                  id="target"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-none focus:border-indigo-500 transition duration-150 text-sm appearance-none cursor-pointer min-h-[44px]"
                >
                  <option value="All">Semua Kru (All)</option>
                  <option value="MC">Master of Ceremony (MC)</option>
                  <option value="Catering">Katering (Catering)</option>
                  <option value="MUA">Make-Up Artist (MUA)</option>
                </select>
              </div>
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
                placeholder="e.g. MC silakan buka acara. Pengantin siap masuk."
                className="w-full h-24 px-4 py-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition duration-150 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isMsgPending || !prompterText.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
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
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Riwayat Pesan</h3>
            {messages.length > 0 && (
              <button
                onClick={handleClearPrompter}
                className="text-xs text-slate-500 hover:text-red-400 font-semibold cursor-pointer py-1 px-2.5 rounded-md hover:bg-red-500/5"
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
                      <span className={`px-2 py-0.2 rounded font-bold border text-[10px] tracking-wide ${
                        msg.targetRole === 'All' ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' :
                        msg.targetRole === 'MC' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                        msg.targetRole === 'Catering' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                        'border-purple-500/20 bg-purple-500/10 text-purple-400'
                      }`}>
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
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
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
                    className="border border-slate-850 bg-slate-950/20 rounded-lg p-2.5 flex gap-2.5 items-start text-xs text-slate-350"
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
