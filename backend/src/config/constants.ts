/**
 * Application Constants
 * 
 * All configurable values for analytics, scoring, and financial calculations.
 * These constants are the single source of truth for all formulas.
 * 
 * TRANSPARENCY: All formulas in the analytics engine reference these constants.
 * Adjusting values here will affect all downstream calculations.
 */

import type {
  AnalyticsConfig,
  EfficiencyWeights,
  RiskWeights,
  FinancialConstants,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analytics thresholds and factors.
 * 
 * These values control how metrics are computed and what constitutes
 * idle time, speeding, and other behavioral indicators.
 */
export const ANALYTICS_CONFIG: AnalyticsConfig = {
  /**
   * Speed below which a vehicle is considered idle (km/h).
   * Using 2 km/h instead of 0 to account for GPS drift.
   */
  idleSpeedThresholdKmh: 2,

  /**
   * Speed above which driving is considered aggressive/risky (km/h).
   * Set to 110 km/h for commercial fleet standards.
   */
  speedingThresholdKmh: 110,

  /**
   * Minimum idle duration to flag as a "long idle" event (minutes).
   * Events shorter than this are considered normal operational stops.
   */
  longIdleThresholdMinutes: 10,

  /**
   * Expected productivity: kilometers traveled per hour of operation.
   * Used as baseline for efficiency scoring.
   * Typical commercial vehicle: 30-50 km/h effective speed including stops.
   */
  expectedKmPerHour: 35,

  /**
   * Penalty factor for excessive stops.
   * Higher values penalize frequent stopping more heavily in efficiency score.
   * stopScore = 100 - (stopsPerKm * stopPenaltyFactor)
   */
  stopPenaltyFactor: 50,

  /**
   * Factor for converting long idle frequency to risk score.
   * idleRiskScore = longIdlesPerDay * idleRiskFactor
   */
  idleRiskFactor: 15,

  /**
   * Factor for speed variance in erratic driving detection.
   * Higher variance indicates inconsistent driving patterns.
   */
  varianceFactor: 2,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// EFFICIENCY SCORE WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Weights for efficiency score components.
 * All weights must sum to 1.0.
 * 
 * Formula: efficiencyScore = Σ(component × weight)
 * 
 * Components:
 * - idleRatio: Lower idle time = higher score (inverted)
 * - utilizationRate: Higher movement ratio = higher score
 * - distanceEfficiency: More km per hour = higher score
 * - stopEfficiency: Fewer stops per km = higher score
 */
export const EFFICIENCY_WEIGHTS: EfficiencyWeights = {
  idleRatio: 0.40,          // 40% - Primary driver of efficiency
  utilizationRate: 0.30,    // 30% - Time spent productively moving
  distanceEfficiency: 0.20, // 20% - Distance covered per time unit
  stopEfficiency: 0.10,     // 10% - Avoiding excessive stops
} as const;

// Validation: weights must sum to 1.0
const efficiencyWeightSum = 
  EFFICIENCY_WEIGHTS.idleRatio +
  EFFICIENCY_WEIGHTS.utilizationRate +
  EFFICIENCY_WEIGHTS.distanceEfficiency +
  EFFICIENCY_WEIGHTS.stopEfficiency;

if (Math.abs(efficiencyWeightSum - 1.0) > 0.001) {
  throw new Error(
    `Efficiency weights must sum to 1.0, got ${efficiencyWeightSum}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK SCORE WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Weights for risk score components.
 * All weights must sum to 1.0.
 * 
 * Formula: riskScore = Σ(component × weight)
 * 
 * Components:
 * - speedingRatio: Time spent over speed threshold
 * - longIdleFrequency: Frequency of extended idle events
 * - maxSpeedSeverity: How far over the limit the max speed was
 * - erraticPattern: Inconsistency in driving behavior
 */
export const RISK_WEIGHTS: RiskWeights = {
  speedingRatio: 0.45,      // 45% - Most dangerous behavior
  longIdleFrequency: 0.25,  // 25% - Operational/security risk
  maxSpeedSeverity: 0.20,   // 20% - Extreme speed events
  erraticPattern: 0.10,     // 10% - Driving consistency
} as const;

// Validation: weights must sum to 1.0
const riskWeightSum =
  RISK_WEIGHTS.speedingRatio +
  RISK_WEIGHTS.longIdleFrequency +
  RISK_WEIGHTS.maxSpeedSeverity +
  RISK_WEIGHTS.erraticPattern;

if (Math.abs(riskWeightSum - 1.0) > 0.001) {
  throw new Error(
    `Risk weights must sum to 1.0, got ${riskWeightSum}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Financial calculation parameters.
 * 
 * These values should be adjusted based on:
 * - Regional fuel prices
 * - Fleet vehicle types (trucks vs vans vs cars)
 * - Local insurance rates
 * - Operational context
 */
export const FINANCIAL_DEFAULTS: FinancialConstants = {
  /**
   * Fuel cost per liter (USD).
   * Update based on current regional prices.
   */
  fuelCostPerLiter: 1.85,

  /**
   * Fuel consumption while idling (liters per hour).
   * Typical values:
   * - Passenger car: 0.5-1.0 L/h
   * - Light commercial van: 1.5-2.0 L/h
   * - Heavy truck: 2.5-4.0 L/h
   * Using 2.5 L/h as default for mixed commercial fleet.
   */
  idleConsumptionLitersPerHour: 2.5,

  /**
   * Insurance premium multiplier for speeding history.
   * 1.15 = 15% premium increase for fleets with speeding incidents.
   */
  speedingInsuranceMultiplier: 1.15,

  /**
   * Operational cost per kilometer driven.
   * Includes: maintenance, tires, depreciation, misc.
   * Does not include: fuel (calculated separately).
   */
  operationalCostPerKm: 0.12,

  /**
   * Base annual insurance cost per vehicle (USD).
   * Commercial vehicle insurance baseline.
   */
  baseInsuranceCostPerVehicle: 2400,

  /**
   * Operating days per month for projections.
   * Standard 5-day work week = ~22 days/month.
   */
  operatingDaysPerMonth: 22,

  /**
   * Currency code for formatting.
   */
  currencyCode: 'USD',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SCORE BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Score interpretation thresholds.
 * Used for color coding and categorization in UI.
 */
export const SCORE_THRESHOLDS = {
  efficiency: {
    excellent: 80,  // >= 80: Green
    good: 60,       // >= 60: Yellow-Green
    fair: 40,       // >= 40: Yellow
    poor: 20,       // >= 20: Orange
    // < 20: Red
  },
  risk: {
    low: 20,        // <= 20: Green (low risk)
    moderate: 40,   // <= 40: Yellow
    elevated: 60,   // <= 60: Orange
    high: 80,       // <= 80: Red
    // > 80: Critical
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cache TTL values in seconds.
 */
export const CACHE_TTL = {
  vehicleList: 60,      // Vehicle list changes infrequently
  livePositions: 30,    // Live positions need frequent updates
  analytics: 60,        // Computed analytics
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MATH CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Earth's radius in kilometers (mean radius).
 * Used for Haversine distance calculations.
 */
export const EARTH_RADIUS_KM = 6371;

/**
 * Degrees to radians conversion factor.
 */
export const DEG_TO_RAD = Math.PI / 180;
