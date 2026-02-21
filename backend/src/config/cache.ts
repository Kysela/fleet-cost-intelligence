/**
 * Cache Configuration
 * 
 * Configures node-cache for caching GPS API responses.
 * Centralized cache instance for the entire application.
 */

import NodeCache from 'node-cache';
import { env } from './environment';

/**
 * Cache key constants.
 * Use these to ensure consistent key naming.
 */
export const CACHE_KEYS = {
  VEHICLES_LIST: 'vehicles:list',
  POSITIONS_LIVE: 'positions:live',
} as const;

/**
 * Cache TTL values (in seconds).
 * Loaded from environment or defaults.
 */
export const CACHE_TTL = {
  vehicles: env.cacheTtlVehicles,
  positions: env.cacheTtlPositions,
} as const;

/**
 * Application-wide cache instance.
 * 
 * Configuration:
 * - stdTTL: Default TTL for items without explicit TTL
 * - checkperiod: How often to check for expired keys (seconds)
 * - useClones: false = return references (faster, but be careful not to mutate)
 * - deleteOnExpire: true = auto-delete expired keys
 */
export const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
  deleteOnExpire: true,
});

/**
 * Gets a value from cache.
 * Returns undefined if not found or expired.
 * 
 * @param key - Cache key
 * @returns Cached value or undefined
 */
export function cacheGet<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Sets a value in cache.
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - TTL in seconds (optional, uses default if not provided)
 * @returns true if successful
 */
export function cacheSet<T>(key: string, value: T, ttl?: number): boolean {
  if (ttl !== undefined) {
    return cache.set(key, value, ttl);
  }
  return cache.set(key, value);
}

/**
 * Deletes a key from cache.
 * 
 * @param key - Cache key to delete
 * @returns Number of deleted keys
 */
export function cacheDelete(key: string): number {
  return cache.del(key);
}

/**
 * Clears all cached data.
 * Use sparingly - mainly for testing.
 */
export function cacheClear(): void {
  cache.flushAll();
}

/**
 * Gets cache statistics.
 * Useful for monitoring.
 */
export function cacheStats(): {
  keys: number;
  hits: number;
  misses: number;
  hitRate: number;
} {
  const stats = cache.getStats();
  const total = stats.hits + stats.misses;
  
  return {
    keys: cache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total > 0 ? stats.hits / total : 0,
  };
}

/**
 * Wraps a function with caching.
 * If cached value exists, returns it; otherwise calls fn and caches result.
 * 
 * @param key - Cache key
 * @param fn - Async function to call if cache miss
 * @param ttl - TTL in seconds
 * @returns Cached or fresh value
 */
export async function cacheWrap<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Check cache first
  const cached = cacheGet<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const fresh = await fn();
  
  // Store in cache
  cacheSet(key, fresh, ttl);
  
  return fresh;
}
