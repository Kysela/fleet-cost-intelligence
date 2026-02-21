/**
 * Derived Metrics Computation
 * 
 * Computes derived ratios and indicators from base metrics.
 * These metrics provide normalized values for scoring and comparison.
 * 
 * All functions are pure and do not mutate input data.
 */

import type {
  GPSTrackResponse,
  GPSTrackPoint,
  BaseVehicleMetrics,
  DerivedVehicleMetrics,
  AnalyticsConfig,
} from '../types';

import { ANALYTICS_CONFIG } from '../config/constants';
import { getPointDurationMinutes, safeDivide } from '../utils/timeUtils';
import { classifyPointState } from './baseMetrics';

// ═══════════════════════════════════════════════════════════════════════════
// SPEEDING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of speeding time analysis.
 */
interface SpeedingAnalysis {
  /** Total time spent over the speed threshold while moving (minutes) */
  timeOverThresholdMinutes: number;
  
  /** Number of distinct speeding segments */
  speedingSegmentCount: number;
  
  /** Maximum speed recorded during speeding segments */
  maxSpeedingSpeed: number;
}

/**
 * Checks if a point represents speeding behavior.
 * A point is considered speeding if:
 * - Ignition is on
 * - Speed is at or above the speeding threshold
 * 
 * @param point - GPS track point
 * @param speedingThresholdKmh - Speed threshold for aggressive driving
 * @returns True if the point represents speeding
 */
export function isSpeedingPoint(
  point: GPSTrackPoint,
  speedingThresholdKmh: number
): boolean {
  return point.ignitionOn && point.speed >= speedingThresholdKmh;
}

/**
 * Analyzes speeding behavior across a GPS track.
 * 
 * Iterates through consecutive point pairs and accumulates time
 * where the starting point was in a speeding state (moving above threshold).
 * 
 * @param track - GPS track response
 * @param config - Analytics configuration
 * @returns Speeding analysis results
 */
export function analyzeSpeedingTime(
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): SpeedingAnalysis {
  const { points } = track;

  // Handle empty or single-point tracks
  if (points.length < 2) {
    return {
      timeOverThresholdMinutes: 0,
      speedingSegmentCount: 0,
      maxSpeedingSpeed: 0,
    };
  }

  let timeOverThresholdMinutes = 0;
  let speedingSegmentCount = 0;
  let maxSpeedingSpeed = 0;
  let previousWasSpeeding = false;

  // Process each consecutive pair
  for (let i = 0; i < points.length - 1; i++) {
    const currentPoint = points[i];
    const nextPoint = points[i + 1];

    // Safety check for strict index access
    if (!currentPoint || !nextPoint) {
      continue;
    }

    // Check if current point is speeding
    const isSpeeding = isSpeedingPoint(currentPoint, config.speedingThresholdKmh);

    if (isSpeeding) {
      // Calculate duration of this segment
      const segmentDuration = getPointDurationMinutes(currentPoint, nextPoint);
      timeOverThresholdMinutes += segmentDuration;

      // Track max speeding speed
      if (currentPoint.speed > maxSpeedingSpeed) {
        maxSpeedingSpeed = currentPoint.speed;
      }

      // Count distinct speeding segments (transitions into speeding)
      if (!previousWasSpeeding) {
        speedingSegmentCount++;
      }
    }

    previousWasSpeeding = isSpeeding;
  }

  return {
    timeOverThresholdMinutes,
    speedingSegmentCount,
    maxSpeedingSpeed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RATIO CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates the idle ratio from base metrics.
 * 
 * Formula: idleTime / (idleTime + movingTime)
 * 
 * This represents what portion of operational time (ignition on)
 * was spent idling vs moving. Ignition-off time is excluded.
 * 
 * @param baseMetrics - Computed base metrics
 * @returns Idle ratio (0-1), or 0 if no operational time
 */
export function calculateIdleRatio(baseMetrics: BaseVehicleMetrics): number {
  const operationalTime = 
    baseMetrics.totalIdleTimeMinutes + baseMetrics.totalMovingTimeMinutes;

  return safeDivide(baseMetrics.totalIdleTimeMinutes, operationalTime);
}

/**
 * Calculates the aggressive driving ratio.
 * 
 * Formula: timeOverSpeedThreshold / totalMovingTime
 * 
 * This represents what portion of active driving time was spent
 * exceeding the speed threshold.
 * 
 * @param timeOverThresholdMinutes - Time spent speeding
 * @param totalMovingTimeMinutes - Total moving time from base metrics
 * @returns Aggressive driving ratio (0-1), or 0 if no moving time
 */
export function calculateAggressiveDrivingRatio(
  timeOverThresholdMinutes: number,
  totalMovingTimeMinutes: number
): number {
  return safeDivide(timeOverThresholdMinutes, totalMovingTimeMinutes);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes derived metrics from base metrics and track data.
 * 
 * Derived metrics include ratios and indicators that provide
 * normalized values for scoring and fleet-wide comparison.
 * 
 * @param baseMetrics - Previously computed base metrics
 * @param track - Original GPS track (for speeding analysis)
 * @param config - Analytics configuration
 * @returns Derived metrics extending base metrics
 * 
 * @example
 * const baseMetrics = computeBaseMetrics(track);
 * const derivedMetrics = computeDerivedMetrics(baseMetrics, track);
 * console.log(`Idle ratio: ${(derivedMetrics.idleRatio * 100).toFixed(1)}%`);
 */
export function computeDerivedMetrics(
  baseMetrics: BaseVehicleMetrics,
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): DerivedVehicleMetrics {
  // Calculate idle ratio
  const idleRatio = calculateIdleRatio(baseMetrics);

  // Analyze speeding behavior
  const speedingAnalysis = analyzeSpeedingTime(track, config);

  // Calculate aggressive driving ratio
  const aggressiveDrivingRatio = calculateAggressiveDrivingRatio(
    speedingAnalysis.timeOverThresholdMinutes,
    baseMetrics.totalMovingTimeMinutes
  );

  // Note: efficiencyScore and riskScore are set to 0 here
  // They will be computed separately by dedicated modules
  return {
    // Spread base metrics (immutable copy)
    ...baseMetrics,

    // Derived ratios
    idleRatio,
    aggressiveDrivingRatio,
    timeOverSpeedThresholdMinutes: speedingAnalysis.timeOverThresholdMinutes,

    // Placeholder scores (computed separately)
    efficiencyScore: 0,
    riskScore: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes both base and derived metrics in a single pass.
 * 
 * Convenience function that chains computeBaseMetrics and computeDerivedMetrics.
 * Use when you need the full derived metrics and don't need intermediate results.
 * 
 * NOTE: This function is defined in the analytics/index.ts barrel to avoid
 * circular dependency between baseMetrics and derivedMetrics modules.
 * Import from '../analytics' instead of this module directly.
 */
// Function moved to analytics/index.ts - see computeFullMetrics

/**
 * Checks if a vehicle's idle ratio exceeds a threshold.
 * Useful for flagging vehicles with excessive idling.
 * 
 * @param metrics - Derived metrics
 * @param threshold - Idle ratio threshold (0-1, default 0.3 = 30%)
 * @returns True if idle ratio exceeds threshold
 */
export function hasExcessiveIdling(
  metrics: DerivedVehicleMetrics,
  threshold: number = 0.3
): boolean {
  return metrics.idleRatio > threshold;
}

/**
 * Checks if a vehicle exhibits aggressive driving behavior.
 * 
 * @param metrics - Derived metrics
 * @param threshold - Aggressive ratio threshold (0-1, default 0.1 = 10%)
 * @returns True if aggressive driving ratio exceeds threshold
 */
export function hasAggressiveDriving(
  metrics: DerivedVehicleMetrics,
  threshold: number = 0.1
): boolean {
  return metrics.aggressiveDrivingRatio > threshold;
}

/**
 * Gets a summary of behavioral indicators.
 * 
 * @param metrics - Derived metrics
 * @returns Object with boolean flags for various behaviors
 */
export function getBehavioralFlags(
  metrics: DerivedVehicleMetrics
): {
  excessiveIdling: boolean;
  aggressiveDriving: boolean;
  hasLongIdleEvents: boolean;
  lowUtilization: boolean;
} {
  const operationalTime = metrics.totalMovingTimeMinutes + metrics.totalIdleTimeMinutes;
  const utilizationRatio = safeDivide(operationalTime, metrics.totalTimeMinutes);

  return {
    excessiveIdling: hasExcessiveIdling(metrics),
    aggressiveDriving: hasAggressiveDriving(metrics),
    hasLongIdleEvents: metrics.longIdleEvents.length > 0,
    lowUtilization: utilizationRatio < 0.5, // Less than 50% operational
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEED VARIANCE (for risk scoring)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates speed variance from track points.
 * High variance indicates erratic driving behavior.
 * 
 * Only considers moving points (ignition on, speed above idle threshold).
 * 
 * @param track - GPS track response
 * @param config - Analytics configuration
 * @returns Speed variance in (km/h)², or 0 if insufficient data
 */
export function calculateSpeedVariance(
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): number {
  const { points } = track;

  // Collect speeds from moving points
  const movingSpeeds: number[] = [];

  for (const point of points) {
    const state = classifyPointState(point, config);
    if (state === 'moving') {
      movingSpeeds.push(point.speed);
    }
  }

  // Need at least 2 samples for variance
  if (movingSpeeds.length < 2) {
    return 0;
  }

  // Calculate mean
  const sum = movingSpeeds.reduce((acc, speed) => acc + speed, 0);
  const mean = sum / movingSpeeds.length;

  // Calculate variance
  const squaredDiffs = movingSpeeds.map(speed => {
    const diff = speed - mean;
    return diff * diff;
  });

  const variance = squaredDiffs.reduce((acc, sq) => acc + sq, 0) / movingSpeeds.length;

  return variance;
}

/**
 * Calculates standard deviation of speed.
 * 
 * @param track - GPS track response
 * @param config - Analytics configuration
 * @returns Speed standard deviation in km/h
 */
export function calculateSpeedStdDev(
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): number {
  const variance = calculateSpeedVariance(track, config);
  return Math.sqrt(variance);
}
