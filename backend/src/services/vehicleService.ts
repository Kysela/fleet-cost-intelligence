/**
 * Vehicle Service
 * 
 * Business logic for vehicle-related operations.
 * Orchestrates GPS API calls and data transformation.
 */

import {
  getVehicles,
  getLivePositions,
  getVehicleTrack,
  getVehicleById,
} from '../api/gpsClient';
import { notFoundError } from '../middleware/errorHandler';
import type {
  GPSVehicle,
  GPSPosition,
  GPSTrackResponse,
  VehiclesListResponse,
  VehiclesLiveResponse,
  VehicleTracksResponse,
} from '../types';

/**
 * Fetches all vehicles.
 * 
 * @returns Vehicles list response
 */
export async function fetchVehiclesList(): Promise<VehiclesListResponse> {
  const vehicles = await getVehicles();

  return {
    vehicles,
    count: vehicles.length,
  };
}

/**
 * Fetches live positions for all vehicles.
 * 
 * @returns Live positions response
 */
export async function fetchLivePositions(): Promise<VehiclesLiveResponse> {
  const positions = await getLivePositions();

  return {
    positions,
    timestamp: new Date().toISOString(),
    count: positions.length,
  };
}

/**
 * Fetches track data for a specific vehicle.
 * 
 * @param vehicleId - Vehicle identifier
 * @param start - Start time (ISO 8601)
 * @param end - End time (ISO 8601)
 * @returns Track response
 * @throws NotFoundError if vehicle doesn't exist
 */
export async function fetchVehicleTrack(
  vehicleId: string,
  start: string,
  end: string
): Promise<VehicleTracksResponse> {
  // Verify vehicle exists
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) {
    throw notFoundError(`Vehicle '${vehicleId}'`);
  }

  const track = await getVehicleTrack(vehicleId, start, end);

  return {
    vehicleId,
    startTime: start,
    endTime: end,
    pointCount: track.points.length,
    track: {
      points: track.points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        timestamp: p.timestamp,
        ignitionOn: p.ignitionOn,
      })),
    },
  };
}

/**
 * Fetches raw track data for analytics processing.
 * Used internally by analytics service.
 * 
 * @param vehicleId - Vehicle identifier
 * @param start - Start time (ISO 8601)
 * @param end - End time (ISO 8601)
 * @returns GPS track response (raw format for analytics)
 */
export async function fetchRawTrack(
  vehicleId: string,
  start: string,
  end: string
): Promise<GPSTrackResponse> {
  return getVehicleTrack(vehicleId, start, end);
}

/**
 * Fetches all vehicles with their current positions.
 * Combines vehicle metadata with live position data.
 * 
 * @returns Array of vehicles with positions
 */
export async function fetchVehiclesWithPositions(): Promise<
  Array<{
    vehicle: GPSVehicle;
    position: GPSPosition | null;
  }>
> {
  const [vehicles, positions] = await Promise.all([
    getVehicles(),
    getLivePositions(),
  ]);

  // Create position lookup by vehicleId
  const positionMap = new Map<string, GPSPosition>();
  for (const pos of positions) {
    positionMap.set(pos.vehicleId, pos);
  }

  // Combine
  return vehicles.map((vehicle) => ({
    vehicle,
    position: positionMap.get(vehicle.id) ?? null,
  }));
}
