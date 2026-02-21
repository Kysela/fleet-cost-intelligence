/**
 * Analytics Service
 * 
 * Orchestrates the analytics pipeline:
 * GPS Track → Base Metrics → Derived Metrics → Scores → Costs
 * 
 * This is the central business logic layer that combines
 * all analytics and financial computations.
 */

import { getVehicles, getVehicleById, getVehicleTrack } from '../api/gpsClient';
import { notFoundError } from '../middleware/errorHandler';
import { cacheWrap, env } from '../config';

// Analytics imports
import {
  computeBaseMetrics,
  computeDerivedMetrics,
  calculateEfficiencyScore,
  calculateRiskScore,
  aggregateFleetMetrics,
} from '../analytics';

// Financial imports
import {
  calculateVehicleCosts,
  calculateFleetCosts,
} from '../financial';

import type {
  GPSTrackResponse,
  DerivedVehicleMetrics,
  VehicleCostEstimation,
  VehicleAnalyticsResponse,
  FleetAnalyticsResponse,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE VEHICLE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes full metrics with scores for a single track.
 * Internal helper used by both vehicle and fleet analytics.
 */
function computeFullMetrics(track: GPSTrackResponse): DerivedVehicleMetrics {
  // Step 1: Compute base metrics
  const baseMetrics = computeBaseMetrics(track);

  // Step 2: Compute derived metrics (ratios)
  const derivedMetrics = computeDerivedMetrics(baseMetrics, track);

  // Step 3: Compute scores
  const efficiencyScore = calculateEfficiencyScore(baseMetrics);
  const riskScore = calculateRiskScore(derivedMetrics);

  // Return complete metrics
  return {
    ...derivedMetrics,
    efficiencyScore,
    riskScore,
  };
}

/**
 * Computes vehicle costs from metrics.
 * Internal helper.
 */
function computeVehicleCosts(metrics: DerivedVehicleMetrics): VehicleCostEstimation {
  return calculateVehicleCosts(metrics);
}

/**
 * Fetches and computes analytics for a single vehicle.
 * 
 * @param vehicleId - Vehicle identifier
 * @param start - Start time (ISO 8601)
 * @param end - End time (ISO 8601)
 * @returns Vehicle analytics response
 * @throws NotFoundError if vehicle doesn't exist
 */
export async function getVehicleAnalytics(
  vehicleId: string,
  start: string,
  end: string
): Promise<VehicleAnalyticsResponse> {
  const cacheKey = `analytics:vehicle:${vehicleId}:${start}:${end}`;
  
  return cacheWrap(cacheKey, async () => {
    // Verify vehicle exists
    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
      throw notFoundError(`Vehicle '${vehicleId}'`);
    }

    // Fetch track data
    const track = await getVehicleTrack(vehicleId, start, end);

    // Compute full metrics pipeline
    const metrics = computeFullMetrics(track);

    // Compute costs
    const costs = computeVehicleCosts(metrics);

    return {
      vehicleId,
      periodStart: start,
      periodEnd: end,
      metrics,
      costs,
    };
  }, env.cacheTtlAnalytics);
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches and computes analytics for the entire fleet.
 * 
 * @param start - Start time (ISO 8601)
 * @param end - End time (ISO 8601)
 * @returns Fleet analytics response
 */
export async function getFleetAnalytics(
  start: string,
  end: string
): Promise<FleetAnalyticsResponse> {
  const cacheKey = `analytics:fleet:${start}:${end}`;
  
  return cacheWrap(cacheKey, async () => {
    // Get all vehicles
    const vehicles = await getVehicles();

    // Fetch tracks for all vehicles in parallel
    const trackPromises = vehicles.map((v) =>
      getVehicleTrack(v.id, start, end).catch((error) => {
        // Log error but don't fail entire fleet request
        console.warn(`Failed to fetch track for vehicle ${v.id}:`, error.message);
        return null;
      })
    );

    const tracks = await Promise.all(trackPromises);

    // Filter out failed fetches and compute metrics
    const vehicleMetrics: DerivedVehicleMetrics[] = [];
    const vehicleCosts: VehicleCostEstimation[] = [];

    for (const track of tracks) {
      if (track === null) {
        continue;
      }

      const metrics = computeFullMetrics(track);
      const costs = computeVehicleCosts(metrics);

      vehicleMetrics.push(metrics);
      vehicleCosts.push(costs);
    }

    // Aggregate fleet metrics
    const fleetMetrics = aggregateFleetMetrics(vehicleMetrics, start, end);

    // Aggregate fleet costs
    const fleetCosts = calculateFleetCosts(vehicleCosts, start, end);

    return {
      periodStart: start,
      periodEnd: end,
      fleetMetrics,
      fleetCosts,
      vehicleMetrics,
    };
  }, env.cacheTtlAnalytics);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets a summary of fleet health for quick dashboard display.
 */
export async function getFleetSummary(
  start: string,
  end: string
): Promise<{
  totalVehicles: number;
  averageEfficiency: number;
  averageRisk: number;
  totalDailyLoss: number;
  topRiskVehicleId: string | null;
}> {
  const analytics = await getFleetAnalytics(start, end);

  return {
    totalVehicles: analytics.fleetMetrics.totalVehicles,
    averageEfficiency: analytics.fleetMetrics.averageEfficiencyScore,
    averageRisk: analytics.fleetMetrics.averageRiskScore,
    totalDailyLoss: analytics.fleetCosts.totalDailyIdleCost,
    topRiskVehicleId: analytics.fleetMetrics.topRiskVehicles[0]?.vehicleId ?? null,
  };
}
