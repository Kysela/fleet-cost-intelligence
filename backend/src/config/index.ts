/**
 * Configuration Barrel Export
 */

export {
  ANALYTICS_CONFIG,
  EFFICIENCY_WEIGHTS,
  RISK_WEIGHTS,
  FINANCIAL_DEFAULTS,
  SCORE_THRESHOLDS,
  CACHE_TTL as ANALYTICS_CACHE_TTL,
  EARTH_RADIUS_KM,
  DEG_TO_RAD,
} from './constants';

export { env, validateEnvironment } from './environment';
export type { EnvironmentConfig } from './environment';

export {
  initializeRedis,
  closeRedis,
  getCacheStats,
} from './redis';

export {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheWrap,
} from './redis';

export {
  cache,
  cacheGet as nodeCacheGet,
  cacheSet as nodeCacheSet,
  cacheDelete as nodeCacheDelete,
  cacheClear,
  cacheStats,
  cacheWrap as nodeCacheWrap,
  CACHE_KEYS,
  CACHE_TTL,
} from './cache';
