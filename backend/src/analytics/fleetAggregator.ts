/**
 * Fleet Aggregator
 * 
 * Aggregates vehicle-level metrics and costs into fleet-wide summaries.
 * 
 * This module performs PURE AGGREGATION only:
 * - No recalculation of base or derived metrics
 * - No scoring logic
 * - No financial recomputation
 * - Consumes pre-computed metrics and costs
 * 
 * All functions are pure and do not mutate input data.
 */

import type {
  DerivedVehicleMetrics,
  FleetMetrics,
  VehicleRanking,
  VehicleCostEstimation,
  FleetCostEstimation,
} from '../types';

import { safeDivide } from '../utils/timeUtils';

// ═══════════════════════════════════════════════════════════════════════════
// RANKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a vehicle ranking entry.
 */
function createRanking(
  vehicleId: string,
  vehicleName: string,
  score: number,
  rank: number
): VehicleRanking {
  return {
    vehicleId,
    vehicleName,
    score,
    rank,
  };
}

/**
 * Comparison function for sorting by score (descending) with vehicleId tie-breaker.
 * Ensures deterministic, stable sorting.
 */
function compareByScoreDesc(
  a: { vehicleId: string; score: number },
  b: { vehicleId: string; score: number }
): number {
  // Primary: score descending
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  // Tie-breaker: vehicleId ascending (alphabetical)
  return a.vehicleId.localeCompare(b.vehicleId);
}

/**
 * Ranks vehicles by efficiency score (highest first = best performers).
 * 
 * @param metrics - Array of derived vehicle metrics
 * @returns Sorted array of vehicle rankings
 */
export function rankByEfficiency(
  metrics: readonly DerivedVehicleMetrics[]
): VehicleRanking[] {
  if (metrics.length === 0) {
    return [];
  }

  // Create sortable entries
  const entries = metrics.map((m) => ({
    vehicleId: m.vehicleId,
    score: m.efficiencyScore,
  }));

  // Sort by score descending with tie-breaker
  const sorted = [...entries].sort(compareByScoreDesc);

  // Assign sequential ranks
  return sorted.map((entry, index) =>
    createRanking(
      entry.vehicleId,
      entry.vehicleId, // Using vehicleId as name (can be enhanced with lookup)
      entry.score,
      index + 1
    )
  );
}

/**
 * Ranks vehicles by risk score (highest first = most problematic).
 * 
 * @param metrics - Array of derived vehicle metrics
 * @returns Sorted array of vehicle rankings
 */
export function rankByRisk(
  metrics: readonly DerivedVehicleMetrics[]
): VehicleRanking[] {
  if (metrics.length === 0) {
    return [];
  }

  // Create sortable entries
  const entries = metrics.map((m) => ({
    vehicleId: m.vehicleId,
    score: m.riskScore,
  }));

  // Sort by score descending with tie-breaker
  const sorted = [...entries].sort(compareByScoreDesc);

  // Assign sequential ranks
  return sorted.map((entry, index) =>
    createRanking(
      entry.vehicleId,
      entry.vehicleId,
      entry.score,
      index + 1
    )
  );
}

/**
 * Gets the top N risk vehicles.
 * 
 * @param riskRankings - Pre-computed risk rankings
 * @param count - Number of top vehicles to return (default: 3)
 * @returns Top N risk vehicles
 */
export function getTopRiskVehicles(
  riskRankings: readonly VehicleRanking[],
  count: number = 3
): VehicleRanking[] {
  return riskRankings.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET METRICS AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a zeroed FleetMetrics structure.
 * Used for empty fleets or error cases.
 */
function createEmptyFleetMetrics(
  periodStart: string,
  periodEnd: string
): FleetMetrics {
  return {
    periodStart,
    periodEnd,
    totalVehicles: 0,
    totalDistanceKm: 0,
    totalIdleTimeMinutes: 0,
    totalMovingTimeMinutes: 0,
    averageIdleRatio: 0,
    averageEfficiencyScore: 0,
    averageRiskScore: 0,
    vehiclesByEfficiency: [],
    vehiclesByRisk: [],
    topRiskVehicles: [],
  };
}

/**
 * Aggregates vehicle metrics into fleet-wide metrics.
 * 
 * Computes:
 * - Totals: vehicles, distance, idle time, moving time
 * - Averages: idle ratio, efficiency score, risk score (simple arithmetic mean)
 * - Rankings: by efficiency, by risk, top 3 risk vehicles
 * 
 * @param vehicleMetrics - Array of pre-computed derived vehicle metrics
 * @param periodStart - Start of analysis period (ISO 8601)
 * @param periodEnd - End of analysis period (ISO 8601)
 * @returns Aggregated fleet metrics
 * 
 * @example
 * const vehicleMetrics = vehicles.map(v => computeFullMetricsWithScores(v.track));
 * const fleetMetrics = aggregateFleetMetrics(vehicleMetrics, startDate, endDate);
 */
export function aggregateFleetMetrics(
  vehicleMetrics: readonly DerivedVehicleMetrics[],
  periodStart: string,
  periodEnd: string
): FleetMetrics {
  // Handle empty fleet
  if (vehicleMetrics.length === 0) {
    return createEmptyFleetMetrics(periodStart, periodEnd);
  }

  const totalVehicles = vehicleMetrics.length;

  // Compute totals
  let totalDistanceKm = 0;
  let totalIdleTimeMinutes = 0;
  let totalMovingTimeMinutes = 0;
  let sumIdleRatio = 0;
  let sumEfficiencyScore = 0;
  let sumRiskScore = 0;

  for (const metrics of vehicleMetrics) {
    totalDistanceKm += metrics.totalDistanceKm;
    totalIdleTimeMinutes += metrics.totalIdleTimeMinutes;
    totalMovingTimeMinutes += metrics.totalMovingTimeMinutes;
    sumIdleRatio += metrics.idleRatio;
    sumEfficiencyScore += metrics.efficiencyScore;
    sumRiskScore += metrics.riskScore;
  }

  // Compute averages (simple arithmetic mean)
  const averageIdleRatio = safeDivide(sumIdleRatio, totalVehicles);
  const averageEfficiencyScore = safeDivide(sumEfficiencyScore, totalVehicles);
  const averageRiskScore = safeDivide(sumRiskScore, totalVehicles);

  // Compute rankings
  const vehiclesByEfficiency = rankByEfficiency(vehicleMetrics);
  const vehiclesByRisk = rankByRisk(vehicleMetrics);
  const topRiskVehicles = getTopRiskVehicles(vehiclesByRisk, 3);

  return {
    periodStart,
    periodEnd,
    totalVehicles,
    totalDistanceKm,
    totalIdleTimeMinutes,
    totalMovingTimeMinutes,
    averageIdleRatio,
    averageEfficiencyScore,
    averageRiskScore,
    vehiclesByEfficiency,
    vehiclesByRisk,
    topRiskVehicles,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET COST AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a zeroed FleetCostEstimation structure.
 * Used for empty fleets or error cases.
 */
function createEmptyFleetCostEstimation(
  periodStart: string,
  periodEnd: string
): FleetCostEstimation {
  return {
    periodStart,
    periodEnd,
    totalDailyIdleCost: 0,
    totalMonthlyProjectedIdleCost: 0,
    totalRiskAdjustedAnnualCost: 0,
    costByVehicle: [],
    highestCostVehicle: null,
  };
}

/**
 * Finds the vehicle with the highest annual projected loss.
 * 
 * @param costs - Array of vehicle cost estimations
 * @returns Vehicle with highest cost, or null if empty
 */
export function findHighestCostVehicle(
  costs: readonly VehicleCostEstimation[]
): VehicleCostEstimation | null {
  if (costs.length === 0) {
    return null;
  }

  let highest = costs[0];

  if (!highest) {
    return null;
  }

  for (const cost of costs) {
    if (cost.annualProjectedLoss > highest.annualProjectedLoss) {
      highest = cost;
    }
  }

  return highest;
}

/**
 * Aggregates vehicle costs into fleet-wide cost estimation.
 * 
 * Computes:
 * - Total daily idle cost
 * - Total monthly projected idle cost
 * - Total risk-adjusted annual cost
 * - Identifies highest cost vehicle
 * 
 * @param vehicleCosts - Array of pre-computed vehicle cost estimations
 * @param periodStart - Start of analysis period (ISO 8601)
 * @param periodEnd - End of analysis period (ISO 8601)
 * @returns Aggregated fleet cost estimation
 * 
 * @example
 * const vehicleCosts = vehicleMetrics.map(m => calculateVehicleCosts(m));
 * const fleetCosts = aggregateFleetCosts(vehicleCosts, startDate, endDate);
 */
export function aggregateFleetCosts(
  vehicleCosts: readonly VehicleCostEstimation[],
  periodStart: string,
  periodEnd: string
): FleetCostEstimation {
  // Handle empty fleet
  if (vehicleCosts.length === 0) {
    return createEmptyFleetCostEstimation(periodStart, periodEnd);
  }

  // Compute totals
  let totalDailyIdleCost = 0;
  let totalMonthlyProjectedIdleCost = 0;
  let totalRiskAdjustedAnnualCost = 0;

  for (const cost of vehicleCosts) {
    totalDailyIdleCost += cost.dailyIdleCost;
    totalMonthlyProjectedIdleCost += cost.monthlyProjectedIdleCost;
    totalRiskAdjustedAnnualCost += cost.annualProjectedLoss;
  }

  // Find highest cost vehicle
  const highestCostVehicle = findHighestCostVehicle(vehicleCosts);

  return {
    periodStart,
    periodEnd,
    totalDailyIdleCost,
    totalMonthlyProjectedIdleCost,
    totalRiskAdjustedAnnualCost,
    costByVehicle: vehicleCosts,
    highestCostVehicle,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of full fleet aggregation.
 */
export interface FleetAggregationResult {
  readonly metrics: FleetMetrics;
  readonly costs: FleetCostEstimation;
}

/**
 * Aggregates both metrics and costs for the fleet in a single call.
 * 
 * @param vehicleMetrics - Array of derived vehicle metrics
 * @param vehicleCosts - Array of vehicle cost estimations
 * @param periodStart - Start of analysis period
 * @param periodEnd - End of analysis period
 * @returns Combined aggregation result
 */
export function aggregateFleet(
  vehicleMetrics: readonly DerivedVehicleMetrics[],
  vehicleCosts: readonly VehicleCostEstimation[],
  periodStart: string,
  periodEnd: string
): FleetAggregationResult {
  return {
    metrics: aggregateFleetMetrics(vehicleMetrics, periodStart, periodEnd),
    costs: aggregateFleetCosts(vehicleCosts, periodStart, periodEnd),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets the fleet health status based on average efficiency score.
 * 
 * @param averageEfficiencyScore - Fleet average efficiency (0-100)
 * @returns Health status category
 */
export function getFleetHealthStatus(
  averageEfficiencyScore: number
): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (averageEfficiencyScore >= 80) return 'excellent';
  if (averageEfficiencyScore >= 60) return 'good';
  if (averageEfficiencyScore >= 40) return 'fair';
  if (averageEfficiencyScore >= 20) return 'poor';
  return 'critical';
}

/**
 * Gets the fleet risk status based on average risk score.
 * 
 * @param averageRiskScore - Fleet average risk (0-100)
 * @returns Risk status category
 */
export function getFleetRiskStatus(
  averageRiskScore: number
): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (averageRiskScore <= 20) return 'low';
  if (averageRiskScore <= 40) return 'moderate';
  if (averageRiskScore <= 60) return 'elevated';
  if (averageRiskScore <= 80) return 'high';
  return 'critical';
}

/**
 * Calculates what percentage of fleet vehicles are in the top risk category.
 * 
 * @param vehicleMetrics - Array of vehicle metrics
 * @param riskThreshold - Risk score threshold for "high risk" (default: 60)
 * @returns Percentage of high-risk vehicles (0-100)
 */
export function calculateHighRiskPercentage(
  vehicleMetrics: readonly DerivedVehicleMetrics[],
  riskThreshold: number = 60
): number {
  if (vehicleMetrics.length === 0) {
    return 0;
  }

  const highRiskCount = vehicleMetrics.filter(
    (m) => m.riskScore >= riskThreshold
  ).length;

  return safeDivide(highRiskCount, vehicleMetrics.length) * 100;
}

/**
 * Gets vehicles that need attention (low efficiency OR high risk).
 * 
 * @param vehicleMetrics - Array of vehicle metrics
 * @param efficiencyThreshold - Below this = needs attention (default: 50)
 * @param riskThreshold - Above this = needs attention (default: 60)
 * @returns Array of vehicle IDs needing attention
 */
export function getVehiclesNeedingAttention(
  vehicleMetrics: readonly DerivedVehicleMetrics[],
  efficiencyThreshold: number = 50,
  riskThreshold: number = 60
): string[] {
  return vehicleMetrics
    .filter(
      (m) =>
        m.efficiencyScore < efficiencyThreshold ||
        m.riskScore >= riskThreshold
    )
    .map((m) => m.vehicleId);
}
