/**
 * Geographic Calculations
 * 
 * Pure utility functions for GPS coordinate operations.
 * All functions are stateless and have no side effects.
 */

import { EARTH_RADIUS_KM, DEG_TO_RAD } from '../config/constants';
import type { GPSTrackPoint } from '../types';

/**
 * Converts degrees to radians.
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * Calculates the distance between two GPS coordinates using the Haversine formula.
 * 
 * The Haversine formula determines the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 * 
 * @param lat1 - Latitude of first point in decimal degrees
 * @param lon1 - Longitude of first point in decimal degrees
 * @param lat2 - Latitude of second point in decimal degrees
 * @param lon2 - Longitude of second point in decimal degrees
 * @returns Distance in kilometers
 * 
 * @example
 * // Distance from New York to London
 * haversineDistance(40.7128, -74.0060, 51.5074, -0.1278) // ≈ 5570 km
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Handle identical points
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const lat1Rad = degreesToRadians(lat1);
  const lat2Rad = degreesToRadians(lat2);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates the total distance of a GPS track by summing distances
 * between consecutive points.
 * 
 * @param points - Array of GPS track points (must be chronologically ordered)
 * @returns Total distance in kilometers
 * 
 * @example
 * const track = [
 *   { latitude: 40.7128, longitude: -74.0060, ... },
 *   { latitude: 40.7580, longitude: -73.9855, ... },
 * ];
 * calculateTrackDistance(track) // Returns distance in km
 */
export function calculateTrackDistance(
  points: readonly GPSTrackPoint[]
): number {
  // Handle empty or single-point tracks
  if (points.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];

    // Safety check for strict index access
    if (!prevPoint || !currPoint) {
      continue;
    }

    const segmentDistance = haversineDistance(
      prevPoint.latitude,
      prevPoint.longitude,
      currPoint.latitude,
      currPoint.longitude
    );

    totalDistance += segmentDistance;
  }

  return totalDistance;
}

/**
 * Calculates the bearing (direction) from one point to another.
 * 
 * @param lat1 - Latitude of start point in decimal degrees
 * @param lon1 - Longitude of start point in decimal degrees
 * @param lat2 - Latitude of end point in decimal degrees
 * @param lon2 - Longitude of end point in decimal degrees
 * @returns Bearing in degrees (0-360, where 0 = North)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const lat1Rad = degreesToRadians(lat1);
  const lat2Rad = degreesToRadians(lat2);
  const dLon = degreesToRadians(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * (180 / Math.PI);

  // Normalize to 0-360
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Validates that GPS coordinates are within valid ranges.
 * 
 * @param latitude - Latitude value to validate
 * @param longitude - Longitude value to validate
 * @returns True if coordinates are valid
 */
export function isValidCoordinate(
  latitude: number,
  longitude: number
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Filters out track points with invalid coordinates.
 * Returns a new array without mutating the input.
 * 
 * @param points - Array of GPS track points
 * @returns Array containing only points with valid coordinates
 */
export function filterValidPoints(
  points: readonly GPSTrackPoint[]
): GPSTrackPoint[] {
  return points.filter((point) =>
    isValidCoordinate(point.latitude, point.longitude)
  );
}

/**
 * Calculates speed between two GPS points based on distance and time.
 * Useful for validating reported speed values.
 * 
 * @param point1 - First GPS point (earlier in time)
 * @param point2 - Second GPS point (later in time)
 * @returns Calculated speed in km/h, or 0 if time difference is zero
 */
export function calculateSpeedBetweenPoints(
  point1: GPSTrackPoint,
  point2: GPSTrackPoint
): number {
  const time1 = new Date(point1.timestamp).getTime();
  const time2 = new Date(point2.timestamp).getTime();

  const timeDiffHours = (time2 - time1) / (1000 * 60 * 60);

  // Avoid division by zero
  if (timeDiffHours <= 0) {
    return 0;
  }

  const distance = haversineDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  );

  return distance / timeDiffHours;
}

/**
 * Finds the centroid (geographic center) of a set of GPS points.
 * Useful for determining the center of an idle event or route.
 * 
 * @param points - Array of GPS track points
 * @returns Center coordinates, or null if array is empty
 */
export function calculateCentroid(
  points: readonly GPSTrackPoint[]
): { lat: number; lng: number } | null {
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1) {
    const firstPoint = points[0];
    if (!firstPoint) {
      return null;
    }
    return {
      lat: firstPoint.latitude,
      lng: firstPoint.longitude,
    };
  }

  // Convert to Cartesian coordinates, average, then convert back
  // This handles wrapping around the antimeridian correctly
  let x = 0;
  let y = 0;
  let z = 0;

  for (const point of points) {
    const latRad = degreesToRadians(point.latitude);
    const lonRad = degreesToRadians(point.longitude);

    x += Math.cos(latRad) * Math.cos(lonRad);
    y += Math.cos(latRad) * Math.sin(lonRad);
    z += Math.sin(latRad);
  }

  const count = points.length;
  x /= count;
  y /= count;
  z /= count;

  const centralLon = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSquareRoot);

  return {
    lat: centralLat * (180 / Math.PI),
    lng: centralLon * (180 / Math.PI),
  };
}
