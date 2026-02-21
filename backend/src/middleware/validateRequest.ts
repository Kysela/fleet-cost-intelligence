/**
 * Request Validation Middleware
 * 
 * Validates query parameters and request bodies.
 */

import { Request, Response, NextFunction } from 'express';
import { validationError } from './errorHandler';
import { parseTimestamp } from '../utils/timeUtils';
import type { ValidationErrorDetail } from '../types';

/**
 * Validates that required query parameters are present.
 * 
 * @param requiredParams - Array of required parameter names
 */
export function requireQueryParams(
  ...requiredParams: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: ValidationErrorDetail[] = [];

    for (const param of requiredParams) {
      if (!req.query[param]) {
        errors.push({
          field: param,
          message: `Query parameter '${param}' is required`,
        });
      }
    }

    if (errors.length > 0) {
      return next(validationError('Missing required parameters', errors));
    }

    next();
  };
}

/**
 * Validates date range query parameters (start, end).
 * Ensures both are valid ISO 8601 dates and start <= end.
 */
export function validateDateRange(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { start, end } = req.query;
  const errors: ValidationErrorDetail[] = [];

  // Check presence
  if (!start) {
    errors.push({ field: 'start', message: "Query parameter 'start' is required" });
  }
  if (!end) {
    errors.push({ field: 'end', message: "Query parameter 'end' is required" });
  }

  if (errors.length > 0) {
    return next(validationError('Missing date range parameters', errors));
  }

  // Validate format
  const startDate = parseTimestamp(start as string);
  const endDate = parseTimestamp(end as string);

  if (!startDate) {
    errors.push({
      field: 'start',
      message: "Invalid date format for 'start'. Use ISO 8601 format.",
    });
  }

  if (!endDate) {
    errors.push({
      field: 'end',
      message: "Invalid date format for 'end'. Use ISO 8601 format.",
    });
  }

  if (errors.length > 0) {
    return next(validationError('Invalid date format', errors));
  }

  // Validate range
  if (startDate && endDate && startDate > endDate) {
    return next(
      validationError("'start' date must be before or equal to 'end' date", [
        { field: 'start', message: 'Must be before end date' },
        { field: 'end', message: 'Must be after start date' },
      ])
    );
  }

  // Check reasonable range (max 31 days)
  if (startDate && endDate) {
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      return next(
        validationError('Date range cannot exceed 31 days', [
          { field: 'start', message: 'Range too large' },
          { field: 'end', message: 'Range too large' },
        ])
      );
    }
  }

  next();
}

/**
 * Validates that a route parameter exists and is non-empty.
 * 
 * @param paramName - Name of the route parameter
 */
export function requireRouteParam(
  paramName: string
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.params[paramName];

    if (!value || value.trim() === '') {
      return next(
        validationError(`Route parameter '${paramName}' is required`, [
          { field: paramName, message: 'Required parameter is missing or empty' },
        ])
      );
    }

    next();
  };
}
