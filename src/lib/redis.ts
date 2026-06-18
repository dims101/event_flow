import { Redis } from "@upstash/redis";

const globalStore = global as any;

// In-memory mock store for local development fallback
if (!globalStore.redisMockDb) {
  globalStore.redisMockDb = new Map<string, string>();
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
    if (upstashClient) {
      if (options?.ex) {
        await upstashClient.set(key, value, { ex: options.ex });
      } else {
        await upstashClient.set(key, value);
      }
      return;
    }

    // Fallback: mock in-memory set
    globalStore.redisMockDb.set(key, value);
  },
};
