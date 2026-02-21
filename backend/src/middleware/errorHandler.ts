/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the Express application.
 * Converts all errors to standard API error response format.
 */

import { Request, Response, NextFunction } from 'express';
import { GPSApiError } from '../api/gpsClient';
import { errorResponse } from '../utils/apiResponse';
import { ERROR_CODES, ErrorCode } from '../types';
import { env } from '../config/environment';

/**
 * Custom application error with code and status.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Creates a validation error.
 */
export function validationError(
  message: string,
  details?: unknown
): AppError {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
}

/**
 * Creates a not found error.
 */
export function notFoundError(resource: string): AppError {
  return new AppError(
    ERROR_CODES.NOT_FOUND,
    `${resource} not found`,
    404
  );
}

/**
 * Creates a bad request error.
 */
export function badRequestError(message: string): AppError {
  return new AppError(ERROR_CODES.BAD_REQUEST, message, 400);
}

/**
 * Determines error code from error type.
 */
function getErrorCode(error: Error): ErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }

  if (error instanceof GPSApiError) {
    if (error.isTimeout) {
      return ERROR_CODES.GPS_API_TIMEOUT;
    }
    return ERROR_CODES.GPS_API_ERROR;
  }

  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Determines HTTP status from error.
 */
function getErrorStatus(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error instanceof GPSApiError) {
    if (error.isTimeout) {
      return 504;
    }
    return error.statusCode ?? 502;
  }

  return 500;
}

/**
 * Gets error details for response.
 * In production, internal errors don't expose details.
 */
function getErrorDetails(error: Error): unknown {
  if (error instanceof AppError) {
    return error.details;
  }

  // In development, include stack trace
  if (env.isDevelopment) {
    return {
      stack: error.stack,
      name: error.name,
    };
  }

  return undefined;
}

/**
 * Express error handler middleware.
 * Must be registered after all routes.
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  console.error(`[ERROR] ${error.name}: ${error.message}`);
  if (env.isDevelopment) {
    console.error(error.stack);
  }

  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  const details = getErrorDetails(error);

  const response = errorResponse(code, error.message, details);

  res.status(status).json(response);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response = errorResponse(
    ERROR_CODES.NOT_FOUND,
    `Route not found: ${req.method} ${req.path}`
  );

  res.status(404).json(response);
}
