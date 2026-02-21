/**
 * Redis Cache Configuration
 * 
 * Provides persistent caching layer using Redis.
 * Falls back to node-cache if Redis is unavailable.
 */

import { createClient, RedisClientType } from 'redis';
import { cacheGet as nodeCacheGet, cacheSet as nodeCacheSet, cacheDelete as nodeCacheDelete } from './cache.js';

let redisClient: RedisClientType | null = null;
let redisAvailable = false;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  const redisUrl = process.env['REDIS_URL'];
  
  if (!redisUrl) {
    console.log('[Redis] No REDIS_URL found, using in-memory cache');
    return;
  }

  try {
    console.log('[Redis] Connecting to Redis...');
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err);
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
      redisAvailable = true;
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Ready to accept commands');
      redisAvailable = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
    redisClient = null;
    redisAvailable = false;
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection closed');
    } catch (error) {
      console.error('[Redis] Error closing connection:', error);
    }
  }
}

/**
 * Get value from cache (Redis or fallback to node-cache)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      redisAvailable = false;
    }
  }

  // Fallback to node-cache
  const value = nodeCacheGet<T>(key);
  return value ?? null;
}

/**
 * Set value in cache (Redis or fallback to node-cache)
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
      redisAvailable = false;
    }
  }

  // Fallback to node-cache
  return nodeCacheSet(key, value, ttlSeconds);
}

/**
 * Delete key from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error);
      redisAvailable = false;
    }
  }

  // Fallback to node-cache
  nodeCacheDelete(key);
  return true;
}

/**
 * Cache wrapper with automatic fallback
 */
export async function cacheWrap<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Check cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const fresh = await fn();
  
  // Store in cache
  await cacheSet(key, fresh, ttlSeconds);
  
  return fresh;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  redisAvailable: boolean;
  redisConnected: boolean;
} {
  return {
    redisAvailable,
    redisConnected: redisClient?.isReady ?? false,
  };
}
