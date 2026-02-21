/**
 * GPS API Client
 * 
 * Isolated adapter for the external GPS tracking API.
 * Handles HTTP communication, caching, and error translation.
 * 
 * All GPS API interactions MUST go through this module.
 * Never call the GPS API directly from services or routes.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/environment';
import { cacheWrap, CACHE_KEYS, CACHE_TTL } from '../config/cache';
import type {
  GPSVehicle,
  GPSPosition,
  GPSTrackResponse,
  GPSTrackPoint,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom error for GPS API failures.
 */
export class GPSApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | undefined,
    public readonly isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'GPSApiError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AXIOS INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configured Axios instance for GPS API.
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: env.gpsApiBaseUrl,
  timeout: env.gpsApiTimeout,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.gpsApiKey}`,
  },
});

/**
 * Translates Axios errors to GPSApiError.
 */
function handleAxiosError(error: AxiosError): never {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    throw new GPSApiError(
      'GPS API request timed out',
      undefined,
      true
    );
  }

  if (error.response) {
    throw new GPSApiError(
      `GPS API error: ${error.response.status} ${error.response.statusText}`,
      error.response.status
    );
  }

  if (error.request) {
    throw new GPSApiError(
      'GPS API request failed: No response received',
      undefined
    );
  }

  throw new GPSApiError(
    `GPS API request failed: ${error.message}`,
    undefined
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA (for development without real GPS API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mock vehicle data for development.
 */
const MOCK_VEHICLES: GPSVehicle[] = [
  { id: 'v001', name: 'Truck Alpha', licensePlate: 'ABC-1234', vehicleType: 'truck', groupId: 'fleet-1' },
  { id: 'v002', name: 'Van Beta', licensePlate: 'DEF-5678', vehicleType: 'van', groupId: 'fleet-1' },
  { id: 'v003', name: 'Truck Gamma', licensePlate: 'GHI-9012', vehicleType: 'truck', groupId: 'fleet-1' },
  { id: 'v004', name: 'Car Delta', licensePlate: 'JKL-3456', vehicleType: 'car', groupId: 'fleet-2' },
  { id: 'v005', name: 'Van Epsilon', licensePlate: 'MNO-7890', vehicleType: 'van', groupId: 'fleet-2' },
];

/**
 * Generates mock positions for all vehicles.
 */
function generateMockPositions(): GPSPosition[] {
  const baseTime = new Date();
  
  return MOCK_VEHICLES.map((v, i) => ({
    vehicleId: v.id,
    latitude: 40.7128 + (i * 0.01),
    longitude: -74.006 + (i * 0.01),
    speed: Math.floor(Math.random() * 80) + 20,
    heading: Math.floor(Math.random() * 360),
    timestamp: baseTime.toISOString(),
    ignitionOn: Math.random() > 0.2,
  }));
}

/**
 * Generates mock track data for a vehicle.
 */
function generateMockTrack(
  vehicleId: string,
  startTime: string,
  endTime: string
): GPSTrackResponse {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const intervalMs = 60000; // 1 minute intervals
  const pointCount = Math.min(Math.floor(durationMs / intervalMs), 500);

  const points: GPSTrackPoint[] = [];
  let lat = 40.7128;
  let lon = -74.006;
  let ignitionOn = true;

  for (let i = 0; i < pointCount; i++) {
    const timestamp = new Date(start.getTime() + i * intervalMs);
    
    // Simulate movement patterns
    const isMoving = Math.random() > 0.3;
    const speed = isMoving ? Math.floor(Math.random() * 60) + 30 : 0;
    
    // Random ignition changes
    if (Math.random() < 0.05) {
      ignitionOn = !ignitionOn;
    }

    points.push({
      latitude: lat,
      longitude: lon,
      speed: ignitionOn ? speed : 0,
      timestamp: timestamp.toISOString(),
      ignitionOn,
    });

    // Move slightly if driving
    if (isMoving && ignitionOn) {
      lat += (Math.random() - 0.5) * 0.002;
      lon += (Math.random() - 0.5) * 0.002;
    }
  }

  return {
    vehicleId,
    startTime,
    endTime,
    points,
  };
}

/**
 * Checks if we should use mock data.
 * Uses mock data in demo mode or in development/test environments when no real API key is configured.
 */
function useMockData(): boolean {
  // Use mock data if explicitly in demo mode
  if (env.demoMode) {
    return true;
  }
  
  // Also use mock data in non-production if no real API key
  const isNonProduction = env.isDevelopment || env.nodeEnv === 'test';
  const hasNoRealApiKey = env.gpsApiKey === 'dev-api-key';
  return isNonProduction && hasNoRealApiKey;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches list of all vehicles.
 * Cached for 60 seconds.
 * 
 * @returns Array of vehicles
 */
export async function getVehicles(): Promise<GPSVehicle[]> {
  return cacheWrap(
    CACHE_KEYS.VEHICLES_LIST,
    async () => {
      if (useMockData()) {
        return MOCK_VEHICLES;
      }

      try {
        const response = await axiosInstance.get<{ vehicles: GPSVehicle[] }>('/vehicles');
        return response.data.vehicles;
      } catch (error) {
        if (error instanceof AxiosError) {
          handleAxiosError(error);
        }
        throw error;
      }
    },
    CACHE_TTL.vehicles
  );
}

/**
 * Fetches live positions for all vehicles.
 * Cached for 30 seconds.
 * 
 * @returns Array of current positions
 */
export async function getLivePositions(): Promise<GPSPosition[]> {
  return cacheWrap(
    CACHE_KEYS.POSITIONS_LIVE,
    async () => {
      if (useMockData()) {
        return generateMockPositions();
      }

      try {
        const response = await axiosInstance.get<{ positions: GPSPosition[] }>('/positions/live');
        return response.data.positions;
      } catch (error) {
        if (error instanceof AxiosError) {
          handleAxiosError(error);
        }
        throw error;
      }
    },
    CACHE_TTL.positions
  );
}

/**
 * Fetches historical track data for a vehicle.
 * NOT cached (date range varies).
 * 
 * @param vehicleId - Vehicle identifier
 * @param startTime - Start of period (ISO 8601)
 * @param endTime - End of period (ISO 8601)
 * @returns Track response with GPS points
 */
export async function getVehicleTrack(
  vehicleId: string,
  startTime: string,
  endTime: string
): Promise<GPSTrackResponse> {
  if (useMockData()) {
    // Verify vehicle exists in mock data
    const vehicle = MOCK_VEHICLES.find((v) => v.id === vehicleId);
    if (!vehicle) {
      throw new GPSApiError(`Vehicle not found: ${vehicleId}`, 404);
    }
    return generateMockTrack(vehicleId, startTime, endTime);
  }

  try {
    const response = await axiosInstance.get<GPSTrackResponse>(
      `/vehicles/${vehicleId}/tracks`,
      {
        params: { start: startTime, end: endTime },
      }
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      handleAxiosError(error);
    }
    throw error;
  }
}

/**
 * Fetches a single vehicle by ID.
 * Uses cached vehicle list.
 * 
 * @param vehicleId - Vehicle identifier
 * @returns Vehicle or null if not found
 */
export async function getVehicleById(
  vehicleId: string
): Promise<GPSVehicle | null> {
  const vehicles = await getVehicles();
  return vehicles.find((v) => v.id === vehicleId) ?? null;
}

/**
 * Checks if the GPS API is reachable.
 * Used for health checks.
 */
export async function checkHealth(): Promise<boolean> {
  if (useMockData()) {
    return true;
  }

  try {
    await axiosInstance.get('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
