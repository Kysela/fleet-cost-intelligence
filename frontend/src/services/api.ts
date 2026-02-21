/**
 * API Service
 * 
 * Centralized HTTP client for backend communication.
 * All API calls should go through this service.
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  GPSVehicle,
  GPSPosition,
  GPSTrackPoint,
  DerivedVehicleMetrics,
  FleetMetrics,
  FleetCostEstimation,
  VehicleCostEstimation,
  AIInsightsResponse,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Configured Axios instance.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function handleError(error: unknown): never {
  if (error instanceof AxiosError) {
    if (error.response?.data?.error) {
      throw new ApiError(
        error.response.data.error.message,
        error.response.data.error.code,
        error.response.status
      );
    }
    throw new ApiError(
      error.message,
      'NETWORK_ERROR',
      error.response?.status
    );
  }
  throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export interface VehiclesListResponse {
  vehicles: GPSVehicle[];
  count: number;
}

export interface VehiclesLiveResponse {
  positions: GPSPosition[];
  timestamp: string;
  count: number;
}

export interface VehicleTracksResponse {
  vehicleId: string;
  startTime: string;
  endTime: string;
  pointCount: number;
  track: {
    points: GPSTrackPoint[];
  };
}

/**
 * Fetches all vehicles.
 */
export async function getVehicles(): Promise<VehiclesListResponse> {
  try {
    const response = await apiClient.get<ApiResponse<VehiclesListResponse>>('/vehicles');
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Fetches live positions.
 */
export async function getLivePositions(): Promise<VehiclesLiveResponse> {
  try {
    const response = await apiClient.get<ApiResponse<VehiclesLiveResponse>>('/vehicles/live');
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Fetches vehicle tracks.
 */
export async function getVehicleTracks(
  vehicleId: string,
  start: string,
  end: string
): Promise<VehicleTracksResponse> {
  try {
    const response = await apiClient.get<ApiResponse<VehicleTracksResponse>>(
      `/vehicles/${vehicleId}/tracks`,
      { params: { start, end } }
    );
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export interface VehicleAnalyticsResponse {
  vehicleId: string;
  periodStart: string;
  periodEnd: string;
  metrics: DerivedVehicleMetrics;
  costs: VehicleCostEstimation;
}

export interface FleetAnalyticsResponse {
  periodStart: string;
  periodEnd: string;
  fleetMetrics: FleetMetrics;
  fleetCosts: FleetCostEstimation;
  vehicleMetrics: DerivedVehicleMetrics[];
}

/**
 * Fetches vehicle analytics.
 */
export async function getVehicleAnalytics(
  vehicleId: string,
  start: string,
  end: string
): Promise<VehicleAnalyticsResponse> {
  try {
    const response = await apiClient.get<ApiResponse<VehicleAnalyticsResponse>>(
      `/analytics/vehicle/${vehicleId}`,
      { params: { start, end } }
    );
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Fetches fleet analytics.
 */
export async function getFleetAnalytics(
  start: string,
  end: string
): Promise<FleetAnalyticsResponse> {
  try {
    const response = await apiClient.get<ApiResponse<FleetAnalyticsResponse>>(
      '/analytics/fleet',
      { params: { start, end } }
    );
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export interface AIInsightsRequestBody {
  vehicleMetrics: DerivedVehicleMetrics[];
  fleetMetrics: FleetMetrics;
  fleetCosts: FleetCostEstimation;
}

export interface AIInsightsApiResponse {
  insights: AIInsightsResponse;
  source: 'llm' | 'fallback';
}

export interface AIStatusResponse {
  available: boolean;
  message: string;
}

/**
 * Fetches AI insights.
 */
export async function getAIInsights(
  body: AIInsightsRequestBody
): Promise<AIInsightsApiResponse> {
  try {
    const response = await apiClient.post<ApiResponse<AIInsightsApiResponse>>(
      '/ai/insights',
      body
    );
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Checks AI service status.
 */
export async function getAIStatus(): Promise<AIStatusResponse> {
  try {
    const response = await apiClient.get<ApiResponse<AIStatusResponse>>('/ai/status');
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

/**
 * Checks API health.
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  } catch (error) {
    handleError(error);
  }
}
