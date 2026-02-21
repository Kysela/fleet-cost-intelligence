/**
 * Time Utilities
 * 
 * Pure utility functions for time and duration calculations.
 * All functions work with ISO 8601 timestamps and return consistent units.
 */

import type { GPSTrackPoint } from '../types';

/**
 * Parses an ISO 8601 timestamp string to a Date object.
 * Returns null for invalid timestamps instead of throwing.
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns Date object or null if invalid
 */
export function parseTimestamp(timestamp: string): Date | null {
  if (!timestamp || typeof timestamp !== 'string') {
    return null;
  }

  const date = new Date(timestamp);

  // Check for Invalid Date
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Calculates the duration between two ISO 8601 timestamps in minutes.
 * 
 * @param startTime - Start timestamp (ISO 8601)
 * @param endTime - End timestamp (ISO 8601)
 * @returns Duration in minutes, or 0 if timestamps are invalid or end is before start
 * 
 * @example
 * getDurationMinutes('2024-01-15T09:00:00Z', '2024-01-15T09:30:00Z') // 30
 */
export function getDurationMinutes(
  startTime: string,
  endTime: string
): number {
  const start = parseTimestamp(startTime);
  const end = parseTimestamp(endTime);

  if (!start || !end) {
    return 0;
  }

  const durationMs = end.getTime() - start.getTime();

  // Return 0 for negative durations (end before start)
  if (durationMs < 0) {
    return 0;
  }

  return durationMs / (1000 * 60);
}

/**
 * Calculates the duration between two GPS track points in minutes.
 * Uses the timestamp field from each point.
 * 
 * @param point1 - First GPS point (earlier)
 * @param point2 - Second GPS point (later)
 * @returns Duration in minutes, or 0 if invalid
 */
export function getPointDurationMinutes(
  point1: GPSTrackPoint,
  point2: GPSTrackPoint
): number {
  return getDurationMinutes(point1.timestamp, point2.timestamp);
}

/**
 * Calculates the duration between two GPS track points in hours.
 * 
 * @param point1 - First GPS point (earlier)
 * @param point2 - Second GPS point (later)
 * @returns Duration in hours, or 0 if invalid
 */
export function getPointDurationHours(
  point1: GPSTrackPoint,
  point2: GPSTrackPoint
): number {
  return getPointDurationMinutes(point1, point2) / 60;
}

/**
 * Converts minutes to hours.
 * 
 * @param minutes - Duration in minutes
 * @returns Duration in hours
 */
export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/**
 * Converts hours to minutes.
 * 
 * @param hours - Duration in hours
 * @returns Duration in minutes
 */
export function hoursToMinutes(hours: number): number {
  return hours * 60;
}

/**
 * Formats a duration in minutes to a human-readable string.
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "2h 30m", "45m", "1d 3h")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0 || !Number.isFinite(minutes)) {
    return '0m';
  }

  const totalMinutes = Math.round(minutes);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

/**
 * Checks if two timestamps are on the same calendar day (UTC).
 * 
 * @param timestamp1 - First timestamp (ISO 8601)
 * @param timestamp2 - Second timestamp (ISO 8601)
 * @returns True if both timestamps are on the same UTC day
 */
export function isSameDay(timestamp1: string, timestamp2: string): boolean {
  const date1 = parseTimestamp(timestamp1);
  const date2 = parseTimestamp(timestamp2);

  if (!date1 || !date2) {
    return false;
  }

  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Gets the number of calendar days in a time range.
 * 
 * @param startTime - Start timestamp (ISO 8601)
 * @param endTime - End timestamp (ISO 8601)
 * @returns Number of days (minimum 1), or 0 if invalid
 */
export function getDayCount(startTime: string, endTime: string): number {
  const start = parseTimestamp(startTime);
  const end = parseTimestamp(endTime);

  if (!start || !end) {
    return 0;
  }

  const durationMs = end.getTime() - start.getTime();

  if (durationMs < 0) {
    return 0;
  }

  const days = durationMs / (1000 * 60 * 60 * 24);

  // Return at least 1 day for any positive duration
  return Math.max(1, Math.ceil(days));
}

/**
 * Checks if a timestamp falls within a time range (inclusive).
 * 
 * @param timestamp - Timestamp to check (ISO 8601)
 * @param rangeStart - Start of range (ISO 8601)
 * @param rangeEnd - End of range (ISO 8601)
 * @returns True if timestamp is within range (inclusive)
 */
export function isWithinRange(
  timestamp: string,
  rangeStart: string,
  rangeEnd: string
): boolean {
  const date = parseTimestamp(timestamp);
  const start = parseTimestamp(rangeStart);
  const end = parseTimestamp(rangeEnd);

  if (!date || !start || !end) {
    return false;
  }

  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

/**
 * Gets the ISO 8601 string for the start of a day (00:00:00 UTC).
 * 
 * @param timestamp - Any timestamp on the target day (ISO 8601)
 * @returns ISO 8601 string for start of that day, or empty string if invalid
 */
export function getStartOfDay(timestamp: string): string {
  const date = parseTimestamp(timestamp);

  if (!date) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}T00:00:00Z`;
}

/**
 * Gets the ISO 8601 string for the end of a day (23:59:59 UTC).
 * 
 * @param timestamp - Any timestamp on the target day (ISO 8601)
 * @returns ISO 8601 string for end of that day, or empty string if invalid
 */
export function getEndOfDay(timestamp: string): string {
  const date = parseTimestamp(timestamp);

  if (!date) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}T23:59:59Z`;
}

/**
 * Calculates the time elapsed from a reference point to now.
 * Useful for "last updated X minutes ago" displays.
 * 
 * @param timestamp - Reference timestamp (ISO 8601)
 * @returns Elapsed time in minutes, or -1 if invalid
 */
export function getElapsedMinutes(timestamp: string): number {
  const date = parseTimestamp(timestamp);

  if (!date) {
    return -1;
  }

  const now = Date.now();
  const elapsed = now - date.getTime();

  if (elapsed < 0) {
    return 0; // Future timestamp
  }

  return elapsed / (1000 * 60);
}

/**
 * Safe division that returns 0 instead of Infinity or NaN.
 * Use this for ratio calculations to avoid division by zero.
 * 
 * @param numerator - The dividend
 * @param denominator - The divisor
 * @param fallback - Value to return if division is impossible (default: 0)
 * @returns Result of division, or fallback if denominator is 0
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback: number = 0
): number {
  if (denominator === 0 || !Number.isFinite(denominator)) {
    return fallback;
  }

  const result = numerator / denominator;

  if (!Number.isFinite(result)) {
    return fallback;
  }

  return result;
}

/**
 * Clamps a value between a minimum and maximum.
 * 
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
