/**
 * Request Logger Middleware
 * 
 * Logs incoming HTTP requests for debugging and monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

/**
 * Formats duration in milliseconds.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Gets color code for status (for terminal output).
 */
function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m'; // Red
  if (status >= 400) return '\x1b[33m'; // Yellow
  if (status >= 300) return '\x1b[36m'; // Cyan
  return '\x1b[32m'; // Green
}

const RESET = '\x1b[0m';

/**
 * Request logging middleware.
 * Logs method, path, status, and duration.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip logging in test environment
  if (env.nodeEnv === 'test') {
    return next();
  }

  const startTime = Date.now();

  // Log request start
  if (env.isDevelopment) {
    console.log(`→ ${req.method} ${req.path}`);
  }

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = getStatusColor(res.statusCode);

    const logLine = env.isDevelopment
      ? `← ${req.method} ${req.path} ${statusColor}${res.statusCode}${RESET} ${formatDuration(duration)}`
      : `${req.method} ${req.path} ${res.statusCode} ${formatDuration(duration)}`;

    console.log(logLine);
  });

  next();
}
