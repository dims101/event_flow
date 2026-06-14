import Dexie, { type Table } from 'dexie';

export interface CachedRundown {
  id: string; // roomId
  roomName: string;
  roomState: {
    currentOffsetSeconds: number;
    currentRundownIndex: number;
    timerStatus: string;
    timerStartTime: number | null;
    timerElapsedSeconds: number;
  };
  items: Array<{
    id: string;
    title: string;
    durationSeconds: number;
    targetRole: string;
    orderIndex: number;
  }>;
  messages: Array<{
    id: string;
    targetRole: string;
    message: string;
    createdAt: number;
  }>;
  lastUpdated: number;
}

class EventFlowLocalDb extends Dexie {
  rundownCache!: Table<CachedRundown>;

  constructor() {
    super('EventFlowLocalDb');
    this.version(1).stores({
      rundownCache: 'id'
    });
  }
}

// Ensure Dexie is only initialized in the browser context
export const localDb = typeof window !== 'undefined' ? new EventFlowLocalDb() : null;
