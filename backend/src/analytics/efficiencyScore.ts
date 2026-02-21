/**
 * Efficiency Score Calculation
 * 
 * Computes a weighted efficiency score (0-100) from base vehicle metrics.
 * Higher scores indicate better operational efficiency.
 * 
 * Formula:
 *   efficiencyScore = Σ(component × weight), clamped to 0-100
 * 
 * Components:
 *   1. Idle Score (40%): Lower idle time = higher score
 *   2. Utilization Score (30%): More time in motion = higher score
 *   3. Distance Score (20%): More km per hour = higher score
 *   4. Stop Score (10%): Fewer stops per km = higher score
 * 
 * All functions are pure and do not mutate input data.
 */

import type {
  BaseVehicleMetrics,
  EfficiencyWeights,
  AnalyticsConfig,
} from '../types';

import {
  EFFICIENCY_WEIGHTS,
  ANALYTICS_CONFIG,
} from '../config/constants';

import { safeDivide, clamp } from '../utils/timeUtils';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Component scores before weighting.
 * Each component is normalized to 0-100 range.
 */
export interface EfficiencyComponents {
  /** Score based on idle ratio (lower idle = higher score) */
  readonly idleScore: number;
  
  /** Score based on time utilization (more movement = higher score) */
  readonly utilizationScore: number;
  
  /** Score based on distance per hour (more km/h = higher score) */
  readonly distanceScore: number;
  
  /** Score based on stops per km (fewer stops = higher score) */
  readonly stopScore: number;
}

/**
 * Calculates the idle score component.
 * 
 * Formula: (1 - idleRatio) × 100
 * 
 * Lower idle time results in higher score.
 * idleRatio = idleTime / (idleTime + movingTime)
 * 
 * @param metrics - Base vehicle metrics
 * @returns Idle score (0-100)
 */
export function calculateIdleScore(metrics: BaseVehicleMetrics): number {
  const operationalTime = metrics.totalIdleTimeMinutes + metrics.totalMovingTimeMinutes;
  const idleRatio = safeDivide(metrics.totalIdleTimeMinutes, operationalTime);
  
  // Invert: lower idle = higher score
  const score = (1 - idleRatio) * 100;
  
  return clamp(score, 0, 100);
}

/**
 * Calculates the utilization score component.
 * 
 * Formula: (movingTime / totalTime) × 100
 * 
 * Higher proportion of time spent moving = higher score.
 * Uses total time (including ignition off) as denominator.
 * 
 * @param metrics - Base vehicle metrics
 * @returns Utilization score (0-100)
 */
export function calculateUtilizationScore(metrics: BaseVehicleMetrics): number {
  const utilizationRate = safeDivide(
    metrics.totalMovingTimeMinutes,
    metrics.totalTimeMinutes
  );
  
  const score = utilizationRate * 100;
  
  return clamp(score, 0, 100);
}

/**
 * Calculates the distance efficiency score component.
 * 
 * Formula: min(100, (kmPerHour / expectedKmPerHour) × 100)
 * 
 * Compares actual km/hour against expected baseline.
 * Capped at 100 to prevent overweighting fast vehicles.
 * 
 * @param metrics - Base vehicle metrics
 * @param expectedKmPerHour - Expected km/h baseline from config
 * @returns Distance efficiency score (0-100)
 */
export function calculateDistanceScore(
  metrics: BaseVehicleMetrics,
  expectedKmPerHour: number
): number {
  // Calculate actual km per hour of total time
  const totalHours = metrics.totalTimeMinutes / 60;
  const kmPerHour = safeDivide(metrics.totalDistanceKm, totalHours);
  
  // Compare to expected baseline
  const efficiencyRatio = safeDivide(kmPerHour, expectedKmPerHour);
  const score = efficiencyRatio * 100;
  
  // Cap at 100 to prevent extremely fast vehicles from skewing scores
  return clamp(score, 0, 100);
}

/**
 * Calculates the stop efficiency score component.
 * 
 * Formula: max(0, 100 - (stopsPerKm × stopPenaltyFactor))
 * 
 * Fewer stops per kilometer = higher score.
 * Uses penalty factor to control sensitivity.
 * 
 * @param metrics - Base vehicle metrics
 * @param stopPenaltyFactor - Penalty multiplier from config
 * @returns Stop efficiency score (0-100)
 */
export function calculateStopScore(
  metrics: BaseVehicleMetrics,
  stopPenaltyFactor: number
): number {
  // Calculate stops per km (use max(1, distance) to avoid div by zero for short trips)
  const stopsPerKm = safeDivide(
    metrics.numberOfStops,
    Math.max(1, metrics.totalDistanceKm)
  );
  
  // Apply penalty: more stops = lower score
  const score = 100 - (stopsPerKm * stopPenaltyFactor);
  
  return clamp(score, 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes all efficiency score components.
 * 
 * Returns individual component scores for transparency and debugging.
 * Each component is normalized to 0-100 range.
 * 
 * @param metrics - Base vehicle metrics
 * @param config - Analytics configuration
 * @returns Individual component scores
 */
export function computeEfficiencyComponents(
  metrics: BaseVehicleMetrics,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): EfficiencyComponents {
  return {
    idleScore: calculateIdleScore(metrics),
    utilizationScore: calculateUtilizationScore(metrics),
    distanceScore: calculateDistanceScore(metrics, config.expectedKmPerHour),
    stopScore: calculateStopScore(metrics, config.stopPenaltyFactor),
  };
}

/**
 * Calculates the final weighted efficiency score.
 * 
 * Formula:
 *   score = idleScore × w1 + utilizationScore × w2 + 
 *           distanceScore × w3 + stopScore × w4
 * 
 * Where weights sum to 1.0 (validated at startup in constants.ts).
 * 
 * @param metrics - Base vehicle metrics
 * @param weights - Weight configuration (optional, uses defaults)
 * @param config - Analytics configuration (optional, uses defaults)
 * @returns Efficiency score (0-100, not rounded)
 * 
 * @example
 * const baseMetrics = computeBaseMetrics(track);
 * const score = calculateEfficiencyScore(baseMetrics);
 * console.log(`Efficiency: ${score.toFixed(1)}/100`);
 */
export function calculateEfficiencyScore(
  metrics: BaseVehicleMetrics,
  weights: EfficiencyWeights = EFFICIENCY_WEIGHTS,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): number {
  // Handle edge case: no operational time
  if (metrics.totalTimeMinutes === 0) {
    return 0;
  }

  // Compute individual components
  const components = computeEfficiencyComponents(metrics, config);

  // Apply weights
  const weightedScore =
    components.idleScore * weights.idleRatio +
    components.utilizationScore * weights.utilizationRate +
    components.distanceScore * weights.distanceEfficiency +
    components.stopScore * weights.stopEfficiency;

  // Final clamp as safety net
  return clamp(weightedScore, 0, 100);
}

/**
 * Returns a detailed breakdown of the efficiency score calculation.
 * Useful for debugging and transparency in UI.
 * 
 * @param metrics - Base vehicle metrics
 * @param weights - Weight configuration
 * @param config - Analytics configuration
 * @returns Detailed breakdown with components, weights, and contributions
 */
export function getEfficiencyBreakdown(
  metrics: BaseVehicleMetrics,
  weights: EfficiencyWeights = EFFICIENCY_WEIGHTS,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): {
  components: EfficiencyComponents;
  weights: EfficiencyWeights;
  contributions: {
    idle: number;
    utilization: number;
    distance: number;
    stop: number;
  };
  finalScore: number;
} {
  const components = computeEfficiencyComponents(metrics, config);
  const finalScore = calculateEfficiencyScore(metrics, weights, config);

  return {
    components,
    weights,
    contributions: {
      idle: components.idleScore * weights.idleRatio,
      utilization: components.utilizationScore * weights.utilizationRate,
      distance: components.distanceScore * weights.distanceEfficiency,
      stop: components.stopScore * weights.stopEfficiency,
    },
    finalScore,
  };
}
