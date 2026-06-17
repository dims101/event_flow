let timeOffset = 0;
let isSynced = false;
let isSyncing = false;
let syncPromise: Promise<void> | null = null;

/**
 * Perform NTP-style time synchronization with the server.
 * Calculates the offset between the client's clock and the server's clock,
 * accounting for network latency.
 */
export async function syncTimeWithServer() {
  if (isSynced || isSyncing) {
    if (syncPromise) return syncPromise;
    return Promise.resolve();
  }

  isSyncing = true;
  syncPromise = (async () => {
    try {
      const startClientTime = Date.now();
      const response = await fetch('/api/time', { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch server time');
      }
      
      const data = await response.json();
      const endClientTime = Date.now();
      
      const serverTime = data.serverTime;
      const latency = endClientTime - startClientTime;
      
      // Calculate offset: 
      // Server time minus the client time at the moment the request reached the server
      // We estimate the request reached the server halfway through the round trip.
      timeOffset = Math.round(serverTime - (startClientTime + latency / 2));
      isSynced = true;
      
      console.log(`[TimeSync] Synchronized clock. Offset: ${timeOffset}ms, Latency: ${latency}ms`);
    } catch (error) {
      console.error('[TimeSync] Synchronization failed:', error);
      // Fallback to 0 offset if sync fails
      timeOffset = 0;
    } finally {
      isSyncing = false;
    }
  })();

  return syncPromise;
}

/**
 * Returns the current timestamp synchronized with the server.
 */
export function getSyncedTime(): number {
  return Date.now() + timeOffset;
}

/**
 * Initialize sync automatically if window exists (client-side only)
 */
if (typeof window !== 'undefined') {
  syncTimeWithServer().catch(console.error);
}
