/**
 * Frontend Financial Cost Model Utilities
 *
 * Mirrors backend financial formulas so UI simulations stay consistent
 * with server-side cost calculations without additional API calls.
 */

import type { FleetCostEstimation } from '../types';

const MONTHS_PER_YEAR = 12;

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

export function calculateAnnualProjectedLoss(
  monthlyIdleCost: number,
  speedingRiskCost: number
): number {
  const annualIdleCost = monthlyIdleCost * MONTHS_PER_YEAR;
  return annualIdleCost + speedingRiskCost;
}

export function calculatePotentialIdleSavings(
  currentIdleCost: number,
  reductionPercent: number
): number {
  const reductionFraction = clampPercent(reductionPercent) / 100;
  return currentIdleCost * reductionFraction;
}

export interface IdleReductionSimulation {
  readonly originalAnnualLoss: number;
  readonly adjustedAnnualLoss: number;
  readonly estimatedSavings: number;
  readonly originalAnnualIdleCost: number;
  readonly adjustedAnnualIdleCost: number;
  readonly annualSpeedingRiskCost: number;
}

/**
 * Simulates annual fleet loss with reduced idle time.
 *
 * Uses current fleet totals and re-applies the existing annual loss model:
 * annualLoss = annualIdleCost + annualSpeedingRiskCost
 */
export function simulateFleetIdleReduction(
  fleetCosts: FleetCostEstimation,
  reductionPercent: number
): IdleReductionSimulation {
  const clampedReduction = clampPercent(reductionPercent);
  const originalAnnualLoss = fleetCosts.totalRiskAdjustedAnnualCost;
  const originalAnnualIdleCost = fleetCosts.totalMonthlyProjectedIdleCost * MONTHS_PER_YEAR;

  // Decompose annual loss into idle + risk using existing model structure.
  const annualSpeedingRiskCost = Math.max(
    0,
    originalAnnualLoss - originalAnnualIdleCost
  );

  const idleSavings = calculatePotentialIdleSavings(
    originalAnnualIdleCost,
    clampedReduction
  );
  const adjustedAnnualIdleCost = originalAnnualIdleCost - idleSavings;
  const adjustedAnnualLoss = calculateAnnualProjectedLoss(
    adjustedAnnualIdleCost / MONTHS_PER_YEAR,
    annualSpeedingRiskCost
  );

  return {
    originalAnnualLoss,
    adjustedAnnualLoss,
    estimatedSavings: originalAnnualLoss - adjustedAnnualLoss,
    originalAnnualIdleCost,
    adjustedAnnualIdleCost,
    annualSpeedingRiskCost,
  };
}
