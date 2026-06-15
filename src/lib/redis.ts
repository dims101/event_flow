import { Redis } from "@upstash/redis";

const globalStore = global as any;

// In-memory mock store for local development fallback
if (!globalStore.redisMockDb) {
  globalStore.redisMockDb = new Map<string, string>();
}

if (!globalStore.redisSubscribers) {
  globalStore.redisSubscribers = new Map<string, Set<() => void>>();
}

const isPlaceholder = (val?: string): boolean => {
  if (!val) return true;
  return val.includes("your-redis-instance") || val.includes("your_redis_token");
};

const hasValidRedisEnv =
  !!process.env.REDIS_URL &&
  !!process.env.REDIS_TOKEN &&
  !isPlaceholder(process.env.REDIS_URL) &&
  !isPlaceholder(process.env.REDIS_TOKEN);

// Initialize Upstash Redis if valid credentials exist
let upstashClient: Redis | null = null;
if (hasValidRedisEnv) {
  upstashClient = new Redis({
    url: process.env.REDIS_URL!,
    token: process.env.REDIS_TOKEN!,
  });
  console.log("🔌 Upstash Redis initialized successfully.");
} else {
  console.log("ℹ️  Using in-memory mock Redis (Fallback mode). Set REDIS_URL and REDIS_TOKEN in .env to use Upstash.");
}

export const redis = {
  get: async (key: string): Promise<string | null> => {
    if (upstashClient) {
      return await upstashClient.get<string>(key);
    }
    return globalStore.redisMockDb.get(key) || null;
  },

  set: async (key: string, value: string, options?: { ex?: number }): Promise<void> => {
    // key format: "room:{roomId}" or "prompter:{roomId}"
    const parts = key.split(":");
    const roomId = parts[1];

    if (upstashClient) {
      if (options?.ex) {
        await upstashClient.set(key, value, { ex: options.ex });
      } else {
        await upstashClient.set(key, value);
      }
      if (roomId) {
        // Publish to notify all SSE subscribers watching this room
        await upstashClient.publish(roomId, value);
      }
      return;
    }

    // Fallback: mock in-memory set + local pub/sub notification
    globalStore.redisMockDb.set(key, value);

    if (roomId && globalStore.redisSubscribers.has(roomId)) {
      const subs: Set<() => void> = globalStore.redisSubscribers.get(roomId);
      subs.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error("PubSub callback error:", err);
        }
      });
    }
  },

  /**
   * Subscribe to room-specific updates.
   * Returns an unsubscribe function for cleanup.
   */
  subscribe: (roomId: string, callback: () => void): (() => void) => {
    if (upstashClient) {
      const subscription = upstashClient.subscribe([roomId]);
      subscription.on("message", () => {
        callback();
      });
      return () => {
        subscription.unsubscribe();
      };
    }

    // Fallback: mock in-memory pub/sub
    if (!globalStore.redisSubscribers.has(roomId)) {
      globalStore.redisSubscribers.set(roomId, new Set());
    }
    globalStore.redisSubscribers.get(roomId).add(callback);

    return () => {
      const subs: Set<() => void> = globalStore.redisSubscribers.get(roomId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          globalStore.redisSubscribers.delete(roomId);
        }
      }
    };
  },
};
