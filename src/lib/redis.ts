// In-memory key-value store with reactive Pub/Sub for local development
const globalStore = global as any;

if (!globalStore.redisMockDb) {
  globalStore.redisMockDb = new Map<string, string>();
}

if (!globalStore.redisSubscribers) {
  globalStore.redisSubscribers = new Map<string, Set<() => void>>();
}

export const redis = {
  get: async (key: string): Promise<string | null> => {
    return globalStore.redisMockDb.get(key) || null;
  },
  
  set: async (key: string, value: string): Promise<void> => {
    globalStore.redisMockDb.set(key, value);
    
    // Notify subscribers for real-time pub/sub
    const parts = key.split(':');
    const roomId = parts[1]; // key format "room:roomId" or "prompter:roomId"
    
    if (roomId && globalStore.redisSubscribers.has(roomId)) {
      const subs = globalStore.redisSubscribers.get(roomId);
      if (subs) {
        subs.forEach((cb: () => void) => {
          try {
            cb();
          } catch (err) {
            console.error('PubSub callback error:', err);
          }
        });
      }
    }
  },

  subscribe: (roomId: string, callback: () => void): () => void => {
    if (!globalStore.redisSubscribers.has(roomId)) {
      globalStore.redisSubscribers.set(roomId, new Set());
    }
    
    globalStore.redisSubscribers.get(roomId).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = globalStore.redisSubscribers.get(roomId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          globalStore.redisSubscribers.delete(roomId);
        }
      }
    };
  }
};
