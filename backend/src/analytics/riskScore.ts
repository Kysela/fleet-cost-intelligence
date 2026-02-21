/**
 * Risk Score Calculation
 * 
 * Computes a weighted risk score (0-100) from derived vehicle metrics.
 * Higher scores indicate higher operational and safety risk.
 * 
 * Formula:
 *   riskScore = Σ(component × weight), clamped to 0-100
 * 
 * Components:
 *   1. Speeding Score (45%): Time spent over speed threshold
 *   2. Long Idle Frequency Score (25%): Frequency of extended idle events
 *   3. Max Speed Severity Score (20%): How far max speed exceeds threshold
 *   4. Erratic Pattern Score (10%): Inconsistency in driving behavior
 * 
 * All functions are pure and do not mutate input data.
 */

import type {
  DerivedVehicleMetrics,
  RiskWeights,
  AnalyticsConfig,
} from '../types';

import {
  RISK_WEIGHTS,
  ANALYTICS_CONFIG,
} from '../config/constants';

import { safeDivide, clamp } from '../utils/timeUtils';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reference point for max speed severity calculation.
 * Speed excess of this amount (km/h) equals 100% severity.
 */
const SPEED_EXCESS_REFERENCE_KMH = 40;

/**
 * Minutes in a day, used for normalizing idle frequency.
 */
const MINUTES_PER_DAY = 1440;

/**
 * Reference point for erratic driving calculation.
 * Max/avg speed ratio of this value equals 100% erratic score.
 * At ratio 2.0, formula (ratio - 1) × 100 = 100.
 * This constant documents the design decision.
 */
// Design note: ERRATIC_RATIO_REFERENCE = 2.0
// Formula: (ratio - 1) × 100 maps ratio 1.0→0, 2.0→100

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Component scores before weighting.
 * Each component is normalized to 0-100 range.
 */
export interface RiskComponents {
  /** Score based on time spent speeding */
  readonly speedingScore: number;
  
  /** Score based on frequency of long idle events */
  readonly longIdleFrequencyScore: number;
  
  /** Score based on max speed severity (excess over threshold) */
  readonly maxSpeedSeverityScore: number;
  
  /** Score based on erratic driving patterns */
  readonly erraticPatternScore: number;
}

/**
 * Calculates the speeding score component.
 * 
 * Formula: aggressiveDrivingRatio × 100
 * 
 * Directly converts the ratio of time spent speeding to a 0-100 score.
 * aggressiveDrivingRatio is already computed in derived metrics.
 * 
 * @param metrics - Derived vehicle metrics
 * @returns Speeding score (0-100)
 */
export function calculateSpeedingScore(metrics: DerivedVehicleMetrics): number {
  const score = metrics.aggressiveDrivingRatio * 100;
  return clamp(score, 0, 100);
}

/**
 * Calculates the long idle frequency score component.
 * 
 * Formula: min(100, longIdlesPerDay × idleRiskFactor)
 * 
 * Normalizes idle count to a per-day frequency, then applies risk factor.
 * More frequent long idles = higher risk.
 * 
 * @param metrics - Derived vehicle metrics
 * @param idleRiskFactor - Risk multiplier from config
 * @returns Long idle frequency score (0-100)
 */
export function calculateLongIdleFrequencyScore(
  metrics: DerivedVehicleMetrics,
  idleRiskFactor: number
): number {
  // Calculate total days in the analysis period
  const totalDays = safeDivide(metrics.totalTimeMinutes, MINUTES_PER_DAY, 1);
  
  // Calculate long idles per day
  const longIdlesPerDay = safeDivide(
    metrics.longIdleEvents.length,
    Math.max(1, totalDays)
  );
  
  // Apply risk factor and normalize
  const score = longIdlesPerDay * idleRiskFactor;
  
  return clamp(score, 0, 100);
}

/**
 * Calculates the max speed severity score component.
 * 
 * Formula: min(100, (excessKmh / 40) × 100)
 * 
 * Measures how far the maximum recorded speed exceeds the speeding threshold.
 * 40 km/h excess = 100% severity (clamped).
 * 
 * @param metrics - Derived vehicle metrics
 * @param speedingThresholdKmh - Speed threshold from config
 * @returns Max speed severity score (0-100)
 */
export function calculateMaxSpeedSeverityScore(
  metrics: DerivedVehicleMetrics,
  speedingThresholdKmh: number
): number {
  // Calculate how far max speed exceeds the threshold
  const speedExcess = Math.max(0, metrics.maxSpeedKmh - speedingThresholdKmh);
  
  // Normalize: 40 km/h excess = 100%
  const severityRatio = safeDivide(speedExcess, SPEED_EXCESS_REFERENCE_KMH);
  const score = severityRatio * 100;
  
  return clamp(score, 0, 100);
}

/**
 * Calculates the erratic pattern score component.
 * 
 * Formula: min(100, max(0, (maxSpeed/avgSpeed - 1) × 100))
 * 
 * Uses the ratio of max speed to average speed as a proxy for driving consistency.
 * A ratio of 2.0 (max is double the average) = 100% erratic.
 * A ratio of 1.0 (max equals average) = 0% erratic.
 * 
 * This approach avoids needing raw track data (only uses DerivedVehicleMetrics).
 * 
 * @param metrics - Derived vehicle metrics
 * @returns Erratic pattern score (0-100)
 */
export function calculateErraticPatternScore(
  metrics: DerivedVehicleMetrics
): number {
  // Handle edge case: no average speed (no movement)
  if (metrics.averageSpeedKmh === 0) {
    // If there was max speed recorded but no average, that's erratic
    return metrics.maxSpeedKmh > 0 ? 50 : 0;
  }
  
  // Calculate ratio of max to average speed
  const speedRatio = safeDivide(metrics.maxSpeedKmh, metrics.averageSpeedKmh, 1);
  
  // Normalize: ratio of 1.0 = 0, ratio of 2.0 = 100
  // Formula: (ratio - 1) / (reference - 1) × 100
  // With reference = 2.0: (ratio - 1) × 100
  const erraticRatio = speedRatio - 1;
  const score = erraticRatio * 100;
  
  return clamp(score, 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes all risk score components.
 * 
 * Returns individual component scores for transparency and debugging.
 * Each component is normalized to 0-100 range.
 * 
 * @param metrics - Derived vehicle metrics
 * @param config - Analytics configuration
 * @returns Individual component scores
 */
export function computeRiskComponents(
  metrics: DerivedVehicleMetrics,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): RiskComponents {
  return {
    speedingScore: calculateSpeedingScore(metrics),
    longIdleFrequencyScore: calculateLongIdleFrequencyScore(
      metrics,
      config.idleRiskFactor
    ),
    maxSpeedSeverityScore: calculateMaxSpeedSeverityScore(
      metrics,
      config.speedingThresholdKmh
    ),
    erraticPatternScore: calculateErraticPatternScore(metrics),
  };
}

/**
 * Calculates the final weighted risk score.
 * 
 * Formula:
 *   score = speedingScore × w1 + longIdleFrequencyScore × w2 + 
 *           maxSpeedSeverityScore × w3 + erraticPatternScore × w4
 * 
 * Where weights sum to 1.0 (validated at startup in constants.ts).
 * 
 * @param metrics - Derived vehicle metrics
 * @param weights - Weight configuration (optional, uses defaults)
 * @param config - Analytics configuration (optional, uses defaults)
 * @returns Risk score (0-100, not rounded)
 * 
 * @example
 * const derivedMetrics = computeDerivedMetrics(baseMetrics, track);
 * const score = calculateRiskScore(derivedMetrics);
 * console.log(`Risk: ${score.toFixed(1)}/100`);
 */
export function calculateRiskScore(
  metrics: DerivedVehicleMetrics,
  weights: RiskWeights = RISK_WEIGHTS,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): number {
  // Handle edge case: no operational time
  if (metrics.totalTimeMinutes === 0) {
    return 0;
  }

  // Compute individual components
  const components = computeRiskComponents(metrics, config);

  // Apply weights
  const weightedScore =
    components.speedingScore * weights.speedingRatio +
    components.longIdleFrequencyScore * weights.longIdleFrequency +
    components.maxSpeedSeverityScore * weights.maxSpeedSeverity +
    components.erraticPatternScore * weights.erraticPattern;

  // Final clamp as safety net
  return clamp(weightedScore, 0, 100);
}

/**
 * Returns a detailed breakdown of the risk score calculation.
 * Useful for debugging and transparency in UI.
 * 
 * @param metrics - Derived vehicle metrics
 * @param weights - Weight configuration
 * @param config - Analytics configuration
 * @returns Detailed breakdown with components, weights, and contributions
 */
export function getRiskBreakdown(
  metrics: DerivedVehicleMetrics,
  weights: RiskWeights = RISK_WEIGHTS,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): {
  components: RiskComponents;
  weights: RiskWeights;
  contributions: {
    speeding: number;
    longIdleFrequency: number;
    maxSpeedSeverity: number;
    erraticPattern: number;
  };
  finalScore: number;
} {
  const components = computeRiskComponents(metrics, config);
  const finalScore = calculateRiskScore(metrics, weights, config);

  return {
    components,
    weights,
    contributions: {
      speeding: components.speedingScore * weights.speedingRatio,
      longIdleFrequency: components.longIdleFrequencyScore * weights.longIdleFrequency,
      maxSpeedSeverity: components.maxSpeedSeverityScore * weights.maxSpeedSeverity,
      erraticPattern: components.erraticPatternScore * weights.erraticPattern,
    },
    finalScore,
  };
}

/**
 * Determines the risk level category based on score.
 * 
 * Categories:
 *   - low: 0-20
 *   - moderate: 21-40
 *   - elevated: 41-60
 *   - high: 61-80
 *   - critical: 81-100
 * 
 * @param score - Risk score (0-100)
 * @returns Risk level category
 */
export function getRiskLevel(
  score: number
): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (score <= 20) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 60) return 'elevated';
  if (score <= 80) return 'high';
  return 'critical';
}

/**
 * Gets the primary risk factor (highest contributing component).
 * 
 * @param metrics - Derived vehicle metrics
 * @param weights - Weight configuration
 * @param config - Analytics configuration
 * @returns The name of the highest contributing risk factor
 */
export function getPrimaryRiskFactor(
  metrics: DerivedVehicleMetrics,
  weights: RiskWeights = RISK_WEIGHTS,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): 'speeding' | 'longIdleFrequency' | 'maxSpeedSeverity' | 'erraticPattern' {
  const breakdown = getRiskBreakdown(metrics, weights, config);
  const { contributions } = breakdown;

  const factors = [
    { name: 'speeding' as const, value: contributions.speeding },
    { name: 'longIdleFrequency' as const, value: contributions.longIdleFrequency },
    { name: 'maxSpeedSeverity' as const, value: contributions.maxSpeedSeverity },
    { name: 'erraticPattern' as const, value: contributions.erraticPattern },
  ];

  // Sort by contribution (descending) and return the highest
  factors.sort((a, b) => b.value - a.value);
  
  return factors[0]?.name ?? 'speeding';
}
