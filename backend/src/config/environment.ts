/**
 * Environment Configuration
 * 
 * Loads and validates environment variables.
 * All env vars should be accessed through this module.
 */

import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Environment configuration object.
 * All values are validated at startup.
 */
export interface EnvironmentConfig {
  // Server
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;

  // Demo/Showcase mode
  readonly demoMode: boolean;

  // GPS API
  readonly gpsApiBaseUrl: string;
  readonly gpsApiKey: string;
  readonly gpsApiTimeout: number;

  // Cache TTL (seconds)
  readonly cacheTtlVehicles: number;
  readonly cacheTtlPositions: number;
  readonly cacheTtlAnalytics: number;

  // Redis
  readonly redisUrl: string | null;

  // AI/LLM
  readonly aiApiKey: string;
  readonly aiApiBaseUrl: string;
  readonly aiModel: string;
  readonly aiTemperature: number;
  readonly aiMaxTokens: number;
  readonly aiTimeout: number;
  readonly aiConfigured: boolean;

  // Logging
  readonly logLevel: string;
}

/**
 * Gets an environment variable or returns a default value.
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Gets an environment variable as a number.
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Gets a required environment variable.
 * Throws if not set (in production).
 */
function getRequiredEnv(key: string, defaultForDev: string): string {
  const value = process.env[key];
  
  if (value === undefined || value === '') {
    const nodeEnv = process.env['NODE_ENV'] ?? 'development';
    
    if (nodeEnv === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    
    // Use default for development
    return defaultForDev;
  }
  
  return value;
}

/**
 * Gets an environment variable as a float.
 */
function getEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Loads and validates environment configuration.
 */
function loadEnvironment(): EnvironmentConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development') as EnvironmentConfig['nodeEnv'];
  const aiApiKey = getEnv('AI_API_KEY', '');
  
  // Enable demo mode if explicitly set OR if using dev-api-key
  const demoModeExplicit = getEnv('DEMO_MODE', 'false').toLowerCase() === 'true';
  const gpsApiKey = getEnv('GPS_API_KEY', 'dev-api-key');
  const demoMode = demoModeExplicit || gpsApiKey === 'dev-api-key' || gpsApiKey === 'demo';

  return {
    // Server
    port: getEnvNumber('PORT', 3000),
    nodeEnv,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',

    // Demo mode
    demoMode,

    // GPS API
    gpsApiBaseUrl: demoMode
      ? 'https://demo.gps-api.local'
      : getRequiredEnv('GPS_API_BASE_URL', 'https://api.example-gps-provider.com'),
    gpsApiKey,
    gpsApiTimeout: getEnvNumber('GPS_API_TIMEOUT', 10000),

    // Cache TTL
    cacheTtlVehicles: getEnvNumber('CACHE_TTL_VEHICLES', 60),
    cacheTtlPositions: getEnvNumber('CACHE_TTL_POSITIONS', 30),
    cacheTtlAnalytics: getEnvNumber('CACHE_TTL_ANALYTICS', 300),

    // Redis
    redisUrl: process.env['REDIS_URL'] ?? null,

    // AI/LLM
    aiApiKey,
    aiApiBaseUrl: getEnv('AI_API_BASE_URL', 'https://api.openai.com/v1'),
    aiModel: getEnv('AI_MODEL', 'gpt-4o-mini'),
    aiTemperature: getEnvFloat('AI_TEMPERATURE', 0.3),
    aiMaxTokens: getEnvNumber('AI_MAX_TOKENS', 2000),
    aiTimeout: getEnvNumber('AI_TIMEOUT', 30000),
    aiConfigured: aiApiKey !== '' && aiApiKey !== 'your-openai-api-key-here',

    // Logging
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}

/**
 * Singleton environment configuration.
 * Loaded once at startup.
 */
export const env: EnvironmentConfig = loadEnvironment();

/**
 * Validates that critical environment variables are set.
 * Call this at startup to fail fast.
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  if (!env.gpsApiBaseUrl) {
    errors.push('GPS_API_BASE_URL is required');
  }

  // Skip API key validation in demo mode
  if (env.isProduction && !env.demoMode && env.gpsApiKey === 'dev-api-key') {
    errors.push('GPS_API_KEY must be set in production (or enable DEMO_MODE=true)');
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}
