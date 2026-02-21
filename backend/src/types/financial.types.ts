/**
 * Financial Types
 * 
 * Interfaces for cost modeling and financial impact calculations.
 * All monetary values are in the configured currency (default: USD).
 */

/**
 * Configurable constants for financial calculations.
 * These values should be adjusted based on regional costs and fleet specifics.
 */
export interface FinancialConstants {
  /** Cost per liter of fuel (e.g., 1.85 USD) */
  readonly fuelCostPerLiter: number;
  
  /** Liters of fuel consumed per hour while idling (e.g., 2.5 L/h for trucks) */
  readonly idleConsumptionLitersPerHour: number;
  
  /** 
   * Insurance premium multiplier for speeding history (e.g., 1.15 = 15% increase).
   * Applied when risk score indicates speeding behavior.
   */
  readonly speedingInsuranceMultiplier: number;
  
  /** Operational cost per kilometer (maintenance, tires, depreciation) */
  readonly operationalCostPerKm: number;
  
  /** Base annual insurance cost per vehicle */
  readonly baseInsuranceCostPerVehicle: number;
  
  /** Number of operating days per month for projections */
  readonly operatingDaysPerMonth: number;
  
  /** Currency code for display purposes */
  readonly currencyCode: string;
}

/**
 * Cost estimation for a single vehicle.
 */
export interface VehicleCostEstimation {
  /** Vehicle identifier */
  readonly vehicleId: string;
  
  // ─────────────────────────────────────────────────────────────────
  // Idle Costs
  // ─────────────────────────────────────────────────────────────────
  
  /** Daily cost due to idling (fuel wasted) */
  readonly dailyIdleCost: number;
  
  /** Projected monthly idle cost based on operating days */
  readonly monthlyProjectedIdleCost: number;
  
  // ─────────────────────────────────────────────────────────────────
  // Risk Costs
  // ─────────────────────────────────────────────────────────────────
  
  /** 
   * Annual cost impact from speeding behavior (insurance increase).
   * Calculated based on risk score and insurance multiplier.
   */
  readonly speedingRiskCost: number;
  
  // ─────────────────────────────────────────────────────────────────
  // Totals
  // ─────────────────────────────────────────────────────────────────
  
  /** Total daily loss (idle cost for one day) */
  readonly dailyTotalLoss: number;
  
  /** Total monthly projected loss */
  readonly monthlyProjectedLoss: number;
  
  /** Total annual projected loss (monthly × 12 + annual risk costs) */
  readonly annualProjectedLoss: number;
}

/**
 * Aggregated cost estimation for the entire fleet.
 */
export interface FleetCostEstimation {
  /** Start of analysis period (ISO 8601) */
  readonly periodStart: string;
  
  /** End of analysis period (ISO 8601) */
  readonly periodEnd: string;
  
  // ─────────────────────────────────────────────────────────────────
  // Fleet Totals
  // ─────────────────────────────────────────────────────────────────
  
  /** Sum of daily idle costs across all vehicles */
  readonly totalDailyIdleCost: number;
  
  /** Sum of monthly projected idle costs */
  readonly totalMonthlyProjectedIdleCost: number;
  
  /** Sum of annual risk-adjusted costs (idle + insurance impact) */
  readonly totalRiskAdjustedAnnualCost: number;
  
  // ─────────────────────────────────────────────────────────────────
  // Per-Vehicle Breakdown
  // ─────────────────────────────────────────────────────────────────
  
  /** Cost estimations for each vehicle */
  readonly costByVehicle: readonly VehicleCostEstimation[];
  
  /** Vehicle with the highest total cost */
  readonly highestCostVehicle: VehicleCostEstimation | null;
}

/**
 * Summary of financial impact for display in UI.
 */
export interface FinancialSummary {
  /** Formatted daily loss (e.g., "$45.20") */
  readonly dailyLossFormatted: string;
  
  /** Formatted monthly loss (e.g., "$994.40") */
  readonly monthlyLossFormatted: string;
  
  /** Formatted annual loss (e.g., "$12,292.80") */
  readonly annualLossFormatted: string;
  
  /** Primary cost driver description */
  readonly primaryCostDriver: string;
  
  /** Potential savings if issues are addressed */
  readonly potentialSavings: string;
}
