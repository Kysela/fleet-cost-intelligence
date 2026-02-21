/**
 * Analytics Engine Barrel Export
 * 
 * Central export point for all analytics functionality.
 */

import type { GPSTrackResponse, DerivedVehicleMetrics, AnalyticsConfig } from '../types';
import { ANALYTICS_CONFIG } from '../config/constants';

// Base metrics computation
export {
  computeBaseMetrics,
  classifyPointState,
  isStopTransition,
  validateTrack,
  getOperationalRatio,
} from './baseMetrics';

// Derived metrics computation
export {
  computeDerivedMetrics,
  analyzeSpeedingTime,
  isSpeedingPoint,
  calculateIdleRatio,
  calculateAggressiveDrivingRatio,
  hasExcessiveIdling,
  hasAggressiveDriving,
  getBehavioralFlags,
  calculateSpeedVariance,
  calculateSpeedStdDev,
} from './derivedMetrics';

// Efficiency score
export {
  calculateEfficiencyScore,
  computeEfficiencyComponents,
  calculateIdleScore,
  calculateUtilizationScore,
  calculateDistanceScore,
  calculateStopScore,
  getEfficiencyBreakdown,
} from './efficiencyScore';

export type { EfficiencyComponents } from './efficiencyScore';

// Risk score
export {
  calculateRiskScore,
  computeRiskComponents,
  calculateSpeedingScore,
  calculateLongIdleFrequencyScore,
  calculateMaxSpeedSeverityScore,
  calculateErraticPatternScore,
  getRiskBreakdown,
  getRiskLevel,
  getPrimaryRiskFactor,
} from './riskScore';

export type { RiskComponents } from './riskScore';

// Fleet aggregation
export {
  aggregateFleetMetrics,
  aggregateFleetCosts,
  aggregateFleet,
  rankByEfficiency,
  rankByRisk,
  getTopRiskVehicles,
  findHighestCostVehicle,
  getFleetHealthStatus,
  getFleetRiskStatus,
  calculateHighRiskPercentage,
  getVehiclesNeedingAttention,
} from './fleetAggregator';

export type { FleetAggregationResult } from './fleetAggregator';

// Re-import for composite functions
import { computeBaseMetrics } from './baseMetrics';
import { computeDerivedMetrics } from './derivedMetrics';
import { calculateEfficiencyScore } from './efficiencyScore';
import { calculateRiskScore } from './riskScore';

/**
 * Computes both base and derived metrics in a single call.
 * 
 * Convenience function that chains computeBaseMetrics and computeDerivedMetrics.
 * Defined here in the barrel to avoid circular dependency.
 * 
 * NOTE: This does NOT compute efficiency and risk scores.
 * Use computeFullMetricsWithScores() for complete metrics.
 * 
 * @param track - GPS track response
 * @param config - Analytics configuration
 * @returns Derived metrics (which include all base metrics)
 */
export function computeFullMetrics(
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): DerivedVehicleMetrics {
  const baseMetrics = computeBaseMetrics(track, config);
  return computeDerivedMetrics(baseMetrics, track, config);
}

/**
 * Computes complete metrics including efficiency and risk scores.
 * 
 * This is the primary function for getting all vehicle analytics.
 * Chains: baseMetrics → derivedMetrics → efficiency/risk scores
 * 
 * @param track - GPS track response
 * @param config - Analytics configuration
 * @returns Derived metrics with populated efficiency and risk scores
 * 
 * @example
 * import { computeFullMetricsWithScores } from './analytics';
 * const metrics = computeFullMetricsWithScores(track);
 * console.log(`Efficiency: ${metrics.efficiencyScore}, Risk: ${metrics.riskScore}`);
 */
export function computeFullMetricsWithScores(
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): DerivedVehicleMetrics {
  const baseMetrics = computeBaseMetrics(track, config);
  const derivedMetrics = computeDerivedMetrics(baseMetrics, track, config);
  
  // Compute scores
  const efficiencyScore = calculateEfficiencyScore(baseMetrics);
  const riskScore = calculateRiskScore(derivedMetrics);
  
  // Return new object with scores (no mutation)
  return {
    ...derivedMetrics,
    efficiencyScore,
    riskScore,
  };
}
