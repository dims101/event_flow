'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getSyncedTime } from '@/lib/timeSync';

interface MonitorViewProps {
  roomId: string;
  roomName: string;
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

const mapRoom = (dbRoom: any): RoomState | null => {
  if (!dbRoom) return null;
  return {
    currentOffsetSeconds:
      dbRoom.current_offset_seconds !== undefined
        ? dbRoom.current_offset_seconds
        : dbRoom.currentOffsetSeconds,
    currentRundownIndex:
      dbRoom.current_rundown_index !== undefined
        ? dbRoom.current_rundown_index
        : dbRoom.currentRundownIndex,
    timerStatus: dbRoom.timer_status || dbRoom.timerStatus,
    timerStartTime:
      dbRoom.timer_start_time !== undefined
        ? dbRoom.timer_start_time
        : dbRoom.timerStartTime,
    timerElapsedSeconds:
      dbRoom.timer_elapsed_seconds !== undefined
        ? dbRoom.timer_elapsed_seconds
        : dbRoom.timerElapsedSeconds,
  };
};

const mapMessage = (dbMsg: any): PrompterMessage | null => {
  if (!dbMsg) return null;
  return {
    id: dbMsg.id,
    targetRole: dbMsg.target_role || dbMsg.targetRole,
    message: dbMsg.message,
    createdAt:
      dbMsg.created_at !== undefined ? Number(dbMsg.created_at) : dbMsg.createdAt,
  };
};

export default function MonitorView({
  roomId,
  roomName,
  initialRoom,
  initialItems,
  initialMessages,
}: MonitorViewProps) {
  const [room, setRoom] = useState<RoomState | null>(mapRoom(initialRoom));
  const [items, setItems] = useState<RundownItem[]>(initialItems);

  // Timer display states
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [isOvertime, setIsOvertime] = useState(false);

  // Prompter message states
  const [activeMessage, setActiveMessage] = useState<PrompterMessage | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);

  // Refs for high-frequency loop
  const roomRef = useRef<RoomState | null>(room);
  const itemsRef = useRef<RundownItem[]>(items);
  const lastProcessedMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const messageClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Initialize lastProcessedMessageId from initial messages on mount
  useEffect(() => {
    if (initialMessages.length > 0) {
      const mapped = initialMessages.map(mapMessage).filter(Boolean) as PrompterMessage[];
      if (mapped.length > 0) {
        lastProcessedMessageId.current = mapped[0].id;
      }
    }
    isInitialLoad.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-monitor:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          setRoom(mapRoom(payload.new));
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
          const msg = mapMessage(payload.new);
          if (!msg) return;

          // Only process messages explicitly targeted at Monitor
          if (msg.targetRole !== 'Monitor') return;

          // Skip if already processed
          if (msg.id === lastProcessedMessageId.current) return;
          lastProcessedMessageId.current = msg.id;

          showMessage(msg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Show message with auto-clear after 15 seconds
  const showMessage = (msg: PrompterMessage) => {
    // Clear any previous timers
    if (messageClearTimer.current) clearTimeout(messageClearTimer.current);
    if (messageFadeTimer.current) clearTimeout(messageFadeTimer.current);

    setActiveMessage(msg);
    setIsMessageVisible(true);

    // Start fade-out animation 1.5s before removal
    messageFadeTimer.current = setTimeout(() => {
      setIsMessageVisible(false);
    }, 13500);

    // Remove message after 15 seconds
    messageClearTimer.current = setTimeout(() => {
      setActiveMessage(null);
    }, 15000);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (messageClearTimer.current) clearTimeout(messageClearTimer.current);
      if (messageFadeTimer.current) clearTimeout(messageFadeTimer.current);
    };
  }, []);

  // High-precision timer ticker (Web Worker, 200ms)
  useEffect(() => {
    const tick = () => {
      const currentRoom = roomRef.current;
      const currentItems = itemsRef.current;

      if (
        !currentRoom ||
        currentRoom.currentRundownIndex === -1 ||
        currentItems.length === 0
      ) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        return;
      }

      const currentItem = currentItems[currentRoom.currentRundownIndex];
      if (!currentItem) {
        setTimerDisplay('00:00');
        setIsOvertime(false);
        return;
      }

      let elapsed = currentRoom.timerElapsedSeconds;
      if (currentRoom.timerStatus === 'running' && currentRoom.timerStartTime) {
        elapsed += (getSyncedTime() - currentRoom.timerStartTime) / 1000;
      }

      const totalAllowed =
        currentItem.durationSeconds + (currentRoom.currentOffsetSeconds || 0);
      const diff = totalAllowed - elapsed;

      const over = diff < 0;
      const absDiff = Math.abs(Math.floor(diff));
      const min = Math.floor(absDiff / 60);
      const sec = absDiff % 60;
      const formatted = `${over ? '-' : ''}${min.toString().padStart(2, '0')}:${sec
        .toString()
        .padStart(2, '0')}`;

      setTimerDisplay(formatted);
      setIsOvertime(over);
    };

    tick();

    let worker: Worker | null = null;
    try {
      const blobCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timerId) clearInterval(timerId);
            timerId = setInterval(() => { self.postMessage('tick'); }, 200);
          } else if (e.data === 'stop') {
            if (timerId) { clearInterval(timerId); timerId = null; }
          }
        };
      `;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = (e) => {
        if (e.data === 'tick') tick();
      };
      worker.postMessage('start');
    } catch {
      // Fallback
    }

    const intervalId = worker ? null : setInterval(tick, 200);

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Derived values
  const currentItem =
    room && room.currentRundownIndex !== -1 ? items[room.currentRundownIndex] : null;
  const hasActiveSession = !!currentItem;
  const isRunning = room?.timerStatus === 'running';
  const hasMessage = !!activeMessage;

  // Timer color based on state
  const getTimerColor = () => {
    if (!hasActiveSession) return 'text-slate-700';
    if (isOvertime) return 'text-rose-400';
    if (!isRunning) return 'text-slate-500';
    return 'text-white';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #000;
          overflow: hidden;
        }

        .monitor-root {
          width: 100vw;
          height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          user-select: none;
          overflow: hidden;
          position: relative;
        }

        /* Subtle grain texture for premium TV look */
        .monitor-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .monitor-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0 4vw;
          gap: 0;
          transition: gap 0.6s ease;
          transform: translateY(-8vh);
        }

        /* ── Logo ── */
        .monitor-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2.5vh;
          opacity: 0.35;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .monitor-logo.has-message {
          opacity: 0.55;
          transform: scale(0.9);
        }
        .monitor-logo-icon {
          width: 3.5vw;
          height: 3.5vw;
          min-width: 28px;
          min-height: 28px;
          color: #6366f1;
        }
        .monitor-logo-text {
          font-size: clamp(18px, 2.2vw, 36px);
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #6366f1;
        }

        /* ── Session title ── */
        .monitor-session-title {
          font-size: clamp(20px, 3.5vw, 56px);
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #94a3b8;
          text-align: center;
          max-width: 80vw;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 1.5vh;
          transition: font-size 0.5s ease, color 0.3s ease;
        }
        .monitor-session-title.inactive {
          color: #334155;
        }

        /* ── Timer ── */
        .monitor-timer {
          font-family: 'Inter', monospace;
          font-size: 26vw;
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1;
          text-align: center;
          transition:
            font-size 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
            color 0.3s ease;
          color: #1e293b;
        }
        .monitor-timer.color-white   { color: #ffffff; }
        .monitor-timer.color-rose    { color: #fb7185; animation: overtime-pulse 1.5s ease-in-out infinite; }
        .monitor-timer.color-slate   { color: #475569; }
        .monitor-timer.color-muted   { color: #1e293b; }

        /* Timer shrinks when message is active */
        .monitor-timer.has-message {
          font-size: 14vw;
        }

        @keyframes overtime-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.65; }
        }

        /* ── Message area ── */
        .monitor-message-wrapper {
          width: 80vw;
          max-width: 1200px;
          margin-top: 3vh;
          overflow: hidden;
          /* Height animates from 0 to auto via max-height trick */
          max-height: 0;
          transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .monitor-message-wrapper.visible {
          max-height: 30vh;
        }

        .monitor-message-inner {
          padding: 2.5vh 3vw;
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.06);
          animation: msg-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .monitor-message-inner.fading {
          animation: msg-fade-out 1.5s ease forwards;
        }

        @keyframes msg-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes msg-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        .monitor-message-label {
          font-size: clamp(10px, 0.9vw, 14px);
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #6366f1;
          margin-bottom: 0.8vh;
        }

        .monitor-message-text {
          font-size: clamp(18px, 3vw, 48px);
          font-weight: 500;
          color: #f1f5f9;
          line-height: 1.3;
          word-break: break-word;
        }

        /* ── Overtime background glow ── */
        .monitor-root.overtime {
          background: radial-gradient(ellipse at center, #1a0a0a 0%, #000 70%);
        }
      `}</style>

      <div
        className={`monitor-root${isOvertime && hasActiveSession ? ' overtime' : ''}`}
      >
        <div className="monitor-content">
          {/* Logo */}
          <div className={`monitor-logo${hasMessage ? ' has-message' : ''}`}>
            {/* Inline SVG wave/flow icon */}
            <svg
              className="monitor-logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="monitor-logo-text">EventFlow</span>
          </div>

          {/* Session Title */}
          <div
            className={`monitor-session-title${!hasActiveSession ? ' inactive' : ''}`}
          >
            {hasActiveSession
              ? currentItem!.title
              : 'Menunggu sesi dimulai\u2026'}
          </div>

          {/* Timer */}
          <div
            className={[
              'monitor-timer',
              hasMessage ? 'has-message' : '',
              !hasActiveSession
                ? 'color-muted'
                : isOvertime
                ? 'color-rose'
                : !isRunning
                ? 'color-slate'
                : 'color-white',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {timerDisplay}
          </div>

          {/* Message */}
          <div
            className={`monitor-message-wrapper${hasMessage ? ' visible' : ''}`}
          >
            {activeMessage && (
              <div
                className={`monitor-message-inner${!isMessageVisible ? ' fading' : ''}`}
              >
                <div className="monitor-message-label">Pesan dari Show Caller</div>
                <div className="monitor-message-text">{activeMessage.message}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
