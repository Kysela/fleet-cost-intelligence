/**
 * Financial Module Barrel Export
 */

export {
  // Single vehicle calculations
  calculateDailyIdleCost,
  calculateMonthlyProjectedIdleCost,
  calculateInsuranceMultiplier,
  calculateSpeedingRiskCost,
  calculateAnnualProjectedLoss,
  calculateVehicleCosts,

  // Fleet calculations
  calculateFleetCosts,
  calculateFleetCostsFromMetrics,
  findHighestCostVehicle,

  // Utilities
  calculateCostPercentage,
  calculatePotentialIdleSavings,
  calculatePotentialRiskSavings,
  identifyCostDriver,
  formatCost,
} from './costModel';
