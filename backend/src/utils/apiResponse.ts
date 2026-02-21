/**
 * API Response Utilities
 * 
 * Standard response formatting for all API endpoints.
 * Ensures consistent response structure across the application.
 */

import type {
  ApiResponse,
  ApiErrorResponse,
  ErrorCode,
} from '../types';

/**
 * Creates a successful API response.
 * 
 * @param data - Response payload
 * @returns Formatted success response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates an error API response.
 * 
 * @param code - Error code
 * @param message - Human-readable error message
 * @param details - Optional additional details
 * @returns Formatted error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * HTTP status codes mapped to error codes.
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  INVALID_DATE_RANGE: 400,
  MISSING_PARAMETER: 400,
  INTERNAL_ERROR: 500,
  GPS_API_ERROR: 502,
  GPS_API_TIMEOUT: 504,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Gets the appropriate HTTP status code for an error code.
 */
export function getStatusForError(code: ErrorCode): number {
  return ERROR_STATUS_MAP[code] ?? 500;
}
