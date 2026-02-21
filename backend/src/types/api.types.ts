/**
 * API Types
 * 
 * Request and response types for the REST API.
 * These types define the contract between frontend and backend.
 */

import type {
  GPSVehicle,
  GPSPosition,
  DerivedVehicleMetrics,
  FleetMetrics,
  VehicleCostEstimation,
  FleetCostEstimation,
} from './index';

// ═══════════════════════════════════════════════════════════════════════════
// STANDARD RESPONSE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard API success response.
 */
export interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: string;
}

/**
 * Standard API error response.
 */
export interface ApiErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: string;
}

/**
 * Union type for any API response.
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard error codes.
 */
export const ERROR_CODES = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  GPS_API_ERROR: 'GPS_API_ERROR',
  GPS_API_TIMEOUT: 'GPS_API_TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/vehicles response.
 */
export interface VehiclesListResponse {
  readonly vehicles: readonly GPSVehicle[];
  readonly count: number;
}

/**
 * GET /api/vehicles/live response.
 */
export interface VehiclesLiveResponse {
  readonly positions: readonly GPSPosition[];
  readonly timestamp: string;
  readonly count: number;
}

/**
 * GET /api/vehicles/:id/tracks query params.
 */
export interface VehicleTracksQuery {
  readonly start: string;  // ISO 8601
  readonly end: string;    // ISO 8601
}

/**
 * GET /api/vehicles/:id/tracks response.
 */
export interface VehicleTracksResponse {
  readonly vehicleId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly pointCount: number;
  readonly track: {
    readonly points: readonly {
      readonly latitude: number;
      readonly longitude: number;
      readonly speed: number;
      readonly timestamp: string;
      readonly ignitionOn: boolean;
    }[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query params for analytics endpoints.
 */
export interface AnalyticsQuery {
  readonly start: string;  // ISO 8601
  readonly end: string;    // ISO 8601
}

/**
 * GET /api/analytics/vehicle/:id response.
 */
export interface VehicleAnalyticsResponse {
  readonly vehicleId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly metrics: DerivedVehicleMetrics;
  readonly costs: VehicleCostEstimation;
}

/**
 * GET /api/analytics/fleet response.
 */
export interface FleetAnalyticsResponse {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly fleetMetrics: FleetMetrics;
  readonly fleetCosts: FleetCostEstimation;
  readonly vehicleMetrics: readonly DerivedVehicleMetrics[];
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validation error detail.
 */
export interface ValidationErrorDetail {
  readonly field: string;
  readonly message: string;
}

/**
 * Result of request validation.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationErrorDetail[];
}
