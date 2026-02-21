/**
 * Financial Cost Model
 * 
 * Calculates financial impact of fleet operational inefficiencies.
 * Quantifies idle costs, speeding risk costs, and projected losses.
 * 
 * All monetary values are in the currency specified in FINANCIAL_DEFAULTS.
 * All functions are pure and do not mutate input data.
 * No rounding is applied—presentation layer handles formatting.
 */

import type {
  DerivedVehicleMetrics,
  FinancialConstants,
  VehicleCostEstimation,
  FleetCostEstimation,
} from '../types';

import { FINANCIAL_DEFAULTS } from '../config/constants';
import { safeDivide, minutesToHours } from '../utils/timeUtils';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Number of months in a year.
 * Used for annual projections from monthly costs.
 */
const MONTHS_PER_YEAR = 12;

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE VEHICLE COST CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates daily idle cost for a vehicle.
 * 
 * Formula:
 *   dailyIdleCost = (idleTimeMinutes / 60) × litersPerHour × fuelCostPerLiter
 * 
 * Business meaning: Fuel wasted per day due to engine running while stationary.
 * 
 * @param totalIdleTimeMinutes - Total idle time in minutes
 * @param financials - Financial constants
 * @returns Daily idle cost in configured currency
 * 
 * @example
 * // 90 minutes idle
 * calculateDailyIdleCost(90, FINANCIAL_DEFAULTS)
 * // = 1.5 hours × 2.5 L/h × $1.85 = $6.9375
 */
export function calculateDailyIdleCost(
  totalIdleTimeMinutes: number,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): number {
  // Handle zero or negative idle time
  if (totalIdleTimeMinutes <= 0) {
    return 0;
  }

  // Convert minutes to hours
  const idleTimeHours = minutesToHours(totalIdleTimeMinutes);

  // Calculate fuel consumed while idling
  const litersConsumed = idleTimeHours * financials.idleConsumptionLitersPerHour;

  // Calculate cost
  const cost = litersConsumed * financials.fuelCostPerLiter;

  return cost;
}

/**
 * Calculates monthly projected idle cost.
 * 
 * Formula:
 *   monthlyIdleCost = dailyIdleCost × operatingDaysPerMonth
 * 
 * Business meaning: Projected monthly fuel waste based on typical operating days.
 * 
 * @param dailyIdleCost - Daily idle cost from calculateDailyIdleCost
 * @param financials - Financial constants
 * @returns Monthly projected idle cost
 * 
 * @example
 * calculateMonthlyProjectedIdleCost(6.94, FINANCIAL_DEFAULTS)
 * // = $6.94 × 22 days = $152.68
 */
export function calculateMonthlyProjectedIdleCost(
  dailyIdleCost: number,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): number {
  return dailyIdleCost * financials.operatingDaysPerMonth;
}

/**
 * Calculates the insurance risk multiplier based on risk score.
 * 
 * Formula:
 *   multiplier = 1 + (riskScore / 100) × (insuranceMultiplier - 1)
 * 
 * This creates a linear scale from:
 *   - Risk score 0 → multiplier 1.0 (no increase)
 *   - Risk score 100 → multiplier equals speedingInsuranceMultiplier
 * 
 * @param riskScore - Risk score (0-100)
 * @param financials - Financial constants
 * @returns Insurance multiplier (1.0 to insuranceMultiplier)
 */
export function calculateInsuranceMultiplier(
  riskScore: number,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): number {
  // Clamp risk score to valid range
  const clampedScore = Math.max(0, Math.min(100, riskScore));

  // Calculate the excess multiplier portion (e.g., 0.15 for 1.15)
  const excessMultiplier = financials.speedingInsuranceMultiplier - 1;

  // Scale by risk score (0-100 → 0-1)
  const riskFraction = clampedScore / 100;

  // Calculate final multiplier
  const multiplier = 1 + (riskFraction * excessMultiplier);

  return multiplier;
}

/**
 * Calculates annual speeding risk cost.
 * 
 * Formula:
 *   riskMultiplier = 1 + (riskScore / 100) × (insuranceMultiplier - 1)
 *   speedingRiskCost = baseInsurance × (riskMultiplier - 1)
 * 
 * Business meaning: Additional annual insurance premium due to risky driving behavior.
 * Higher risk scores result in higher insurance costs.
 * 
 * @param riskScore - Risk score (0-100)
 * @param financials - Financial constants
 * @returns Annual speeding risk cost (additional premium)
 * 
 * @example
 * // Risk score 50 with base insurance $2400
 * calculateSpeedingRiskCost(50, FINANCIAL_DEFAULTS)
 * // multiplier = 1 + (0.5 × 0.15) = 1.075
 * // cost = $2400 × 0.075 = $180/year
 */
export function calculateSpeedingRiskCost(
  riskScore: number,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): number {
  // Handle zero or negative risk score
  if (riskScore <= 0) {
    return 0;
  }

  const multiplier = calculateInsuranceMultiplier(riskScore, financials);

  // Calculate the additional premium (not the total premium)
  const additionalPremium = financials.baseInsuranceCostPerVehicle * (multiplier - 1);

  return additionalPremium;
}

/**
 * Calculates total annual projected loss.
 * 
 * Formula:
 *   annualLoss = (monthlyIdleCost × 12) + speedingRiskCost
 * 
 * Business meaning: Total yearly financial impact from operational inefficiencies,
 * combining fuel waste and increased insurance costs.
 * 
 * @param monthlyIdleCost - Monthly projected idle cost
 * @param speedingRiskCost - Annual speeding risk cost
 * @returns Annual projected loss
 * 
 * @example
 * calculateAnnualProjectedLoss(152.68, 180)
 * // = ($152.68 × 12) + $180 = $1832.16 + $180 = $2012.16
 */
export function calculateAnnualProjectedLoss(
  monthlyIdleCost: number,
  speedingRiskCost: number
): number {
  const annualIdleCost = monthlyIdleCost * MONTHS_PER_YEAR;
  return annualIdleCost + speedingRiskCost;
}

/**
 * Calculates all cost metrics for a single vehicle.
 * 
 * This is the primary function for vehicle cost estimation.
 * Combines all individual calculations into a complete cost profile.
 * 
 * @param metrics - Derived vehicle metrics (includes risk score and idle time)
 * @param financials - Financial constants
 * @returns Complete cost estimation for the vehicle
 * 
 * @example
 * const metrics = computeFullMetricsWithScores(track);
 * const costs = calculateVehicleCosts(metrics);
 * console.log(`Annual loss: $${costs.annualProjectedLoss.toFixed(2)}`);
 */
export function calculateVehicleCosts(
  metrics: DerivedVehicleMetrics,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): VehicleCostEstimation {
  // Calculate idle costs
  const dailyIdleCost = calculateDailyIdleCost(
    metrics.totalIdleTimeMinutes,
    financials
  );

  const monthlyProjectedIdleCost = calculateMonthlyProjectedIdleCost(
    dailyIdleCost,
    financials
  );

  // Calculate risk costs
  const speedingRiskCost = calculateSpeedingRiskCost(
    metrics.riskScore,
    financials
  );

  // Calculate totals
  const dailyTotalLoss = dailyIdleCost;
  const monthlyProjectedLoss = monthlyProjectedIdleCost;
  const annualProjectedLoss = calculateAnnualProjectedLoss(
    monthlyProjectedIdleCost,
    speedingRiskCost
  );

  return {
    vehicleId: metrics.vehicleId,
    dailyIdleCost,
    monthlyProjectedIdleCost,
    speedingRiskCost,
    dailyTotalLoss,
    monthlyProjectedLoss,
    annualProjectedLoss,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET COST CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates aggregated costs for the entire fleet.
 * 
 * Sums individual vehicle costs and identifies the highest-cost vehicle.
 * 
 * @param vehicleCosts - Array of individual vehicle cost estimations
 * @param periodStart - Start of analysis period (ISO 8601)
 * @param periodEnd - End of analysis period (ISO 8601)
 * @returns Fleet-wide cost estimation
 * 
 * @example
 * const fleetMetrics = vehicles.map(v => computeFullMetricsWithScores(v.track));
 * const vehicleCosts = fleetMetrics.map(m => calculateVehicleCosts(m));
 * const fleetCosts = calculateFleetCosts(vehicleCosts, startDate, endDate);
 */
export function calculateFleetCosts(
  vehicleCosts: readonly VehicleCostEstimation[],
  periodStart: string,
  periodEnd: string
): FleetCostEstimation {
  // Handle empty fleet
  if (vehicleCosts.length === 0) {
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

  // Sum all costs
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

/**
 * Finds the vehicle with the highest annual projected loss.
 * 
 * @param vehicleCosts - Array of vehicle cost estimations
 * @returns Vehicle with highest cost, or null if array is empty
 */
export function findHighestCostVehicle(
  vehicleCosts: readonly VehicleCostEstimation[]
): VehicleCostEstimation | null {
  if (vehicleCosts.length === 0) {
    return null;
  }

  let highest = vehicleCosts[0];
  
  if (!highest) {
    return null;
  }

  for (const cost of vehicleCosts) {
    if (cost.annualProjectedLoss > highest.annualProjectedLoss) {
      highest = cost;
    }
  }

  return highest;
}

/**
 * Calculates fleet costs directly from vehicle metrics.
 * 
 * Convenience function that combines calculateVehicleCosts and calculateFleetCosts.
 * 
 * @param vehicleMetrics - Array of derived vehicle metrics
 * @param periodStart - Start of analysis period
 * @param periodEnd - End of analysis period
 * @param financials - Financial constants
 * @returns Fleet-wide cost estimation
 */
export function calculateFleetCostsFromMetrics(
  vehicleMetrics: readonly DerivedVehicleMetrics[],
  periodStart: string,
  periodEnd: string,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): FleetCostEstimation {
  const vehicleCosts = vehicleMetrics.map(
    (metrics) => calculateVehicleCosts(metrics, financials)
  );

  return calculateFleetCosts(vehicleCosts, periodStart, periodEnd);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates the percentage of fleet cost attributed to a single vehicle.
 * 
 * @param vehicleCost - Individual vehicle cost
 * @param totalFleetCost - Total fleet annual cost
 * @returns Percentage (0-100)
 */
export function calculateCostPercentage(
  vehicleCost: number,
  totalFleetCost: number
): number {
  return safeDivide(vehicleCost, totalFleetCost) * 100;
}

/**
 * Calculates potential savings if idle time is reduced by a percentage.
 * 
 * @param currentIdleCost - Current annual idle cost
 * @param reductionPercent - Target reduction percentage (0-100)
 * @returns Potential annual savings
 * 
 * @example
 * calculatePotentialIdleSavings(2000, 25)
 * // = $2000 × 0.25 = $500 potential savings
 */
export function calculatePotentialIdleSavings(
  currentIdleCost: number,
  reductionPercent: number
): number {
  const reductionFraction = Math.max(0, Math.min(100, reductionPercent)) / 100;
  return currentIdleCost * reductionFraction;
}

/**
 * Calculates potential savings if risk score is reduced to a target level.
 * 
 * @param currentRiskScore - Current risk score (0-100)
 * @param targetRiskScore - Target risk score (0-100)
 * @param financials - Financial constants
 * @returns Potential annual insurance savings
 */
export function calculatePotentialRiskSavings(
  currentRiskScore: number,
  targetRiskScore: number,
  financials: FinancialConstants = FINANCIAL_DEFAULTS
): number {
  const currentCost = calculateSpeedingRiskCost(currentRiskScore, financials);
  const targetCost = calculateSpeedingRiskCost(targetRiskScore, financials);

  // Savings is the difference (can be negative if target > current)
  return Math.max(0, currentCost - targetCost);
}

/**
 * Returns a summary of cost drivers for a vehicle.
 * 
 * @param costs - Vehicle cost estimation
 * @returns Object indicating which cost driver is primary
 */
export function identifyCostDriver(
  costs: VehicleCostEstimation
): {
  primaryDriver: 'idle' | 'speeding';
  idlePercentage: number;
  speedingPercentage: number;
} {
  const annualIdleCost = costs.monthlyProjectedIdleCost * MONTHS_PER_YEAR;
  const totalAnnual = costs.annualProjectedLoss;

  const idlePercentage = safeDivide(annualIdleCost, totalAnnual) * 100;
  const speedingPercentage = safeDivide(costs.speedingRiskCost, totalAnnual) * 100;

  return {
    primaryDriver: idlePercentage >= speedingPercentage ? 'idle' : 'speeding',
    idlePercentage,
    speedingPercentage,
  };
}

/**
 * Formats a cost value with currency symbol.
 * Note: This is a presentation helper. Core calculations remain unrounded.
 * 
 * @param value - Cost value
 * @param financials - Financial constants (for currency code)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function formatCost(
  value: number,
  financials: FinancialConstants = FINANCIAL_DEFAULTS,
  decimals: number = 2
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: financials.currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(value);
}
