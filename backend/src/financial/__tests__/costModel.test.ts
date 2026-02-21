/**
 * Financial Cost Model Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { DerivedVehicleMetrics, VehicleCostEstimation, FinancialConstants } from '../../types';
import {
  calculateDailyIdleCost,
  calculateMonthlyProjectedIdleCost,
  calculateInsuranceMultiplier,
  calculateSpeedingRiskCost,
  calculateAnnualProjectedLoss,
  calculateVehicleCosts,
  calculateFleetCosts,
  calculateFleetCostsFromMetrics,
  findHighestCostVehicle,
  calculateCostPercentage,
  calculatePotentialIdleSavings,
  calculatePotentialRiskSavings,
  identifyCostDriver,
  formatCost,
} from '../costModel';
import { FINANCIAL_DEFAULTS } from '../../config/constants';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

function createDerivedMetrics(
  overrides: Partial<DerivedVehicleMetrics> = {}
): DerivedVehicleMetrics {
  return {
    vehicleId: 'vehicle-001',
    periodStart: '2024-01-15T09:00:00Z',
    periodEnd: '2024-01-15T10:00:00Z',
    totalDistanceKm: 50,
    totalMovingTimeMinutes: 45,
    totalIdleTimeMinutes: 15,
    totalTimeMinutes: 60,
    averageSpeedKmh: 66.67,
    maxSpeedKmh: 90,
    numberOfStops: 3,
    longIdleEvents: [],
    totalPointsAnalyzed: 60,
    idleRatio: 0.25,
    aggressiveDrivingRatio: 0.1,
    timeOverSpeedThresholdMinutes: 5,
    efficiencyScore: 75,
    riskScore: 30,
    ...overrides,
  };
}

function createVehicleCostEstimation(
  overrides: Partial<VehicleCostEstimation> = {}
): VehicleCostEstimation {
  return {
    vehicleId: 'vehicle-001',
    dailyIdleCost: 6.94,
    monthlyProjectedIdleCost: 152.68,
    speedingRiskCost: 108,
    dailyTotalLoss: 6.94,
    monthlyProjectedLoss: 152.68,
    annualProjectedLoss: 1940.16,
    ...overrides,
  };
}

// Custom financial constants for testing
const TEST_FINANCIALS: FinancialConstants = {
  fuelCostPerLiter: 2.0,
  idleConsumptionLitersPerHour: 2.0,
  speedingInsuranceMultiplier: 1.20,
  operationalCostPerKm: 0.10,
  baseInsuranceCostPerVehicle: 2000,
  operatingDaysPerMonth: 20,
  currencyCode: 'USD',
};

// ═══════════════════════════════════════════════════════════════════════════
// DAILY IDLE COST TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateDailyIdleCost', () => {
  it('should calculate cost correctly', () => {
    // 60 minutes = 1 hour × 2.0 L/h × $2.0/L = $4.00
    const cost = calculateDailyIdleCost(60, TEST_FINANCIALS);
    expect(cost).toBe(4.0);
  });

  it('should return 0 for zero idle time', () => {
    const cost = calculateDailyIdleCost(0, TEST_FINANCIALS);
    expect(cost).toBe(0);
  });

  it('should return 0 for negative idle time', () => {
    const cost = calculateDailyIdleCost(-30, TEST_FINANCIALS);
    expect(cost).toBe(0);
  });

  it('should handle fractional hours', () => {
    // 90 minutes = 1.5 hours × 2.0 L/h × $2.0/L = $6.00
    const cost = calculateDailyIdleCost(90, TEST_FINANCIALS);
    expect(cost).toBe(6.0);
  });

  it('should use default financial constants', () => {
    // 60 minutes = 1 hour × 2.5 L/h × $1.85/L = $4.625
    const cost = calculateDailyIdleCost(60, FINANCIAL_DEFAULTS);
    expect(cost).toBeCloseTo(4.625, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY IDLE COST TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateMonthlyProjectedIdleCost', () => {
  it('should multiply daily cost by operating days', () => {
    // $4.00/day × 20 days = $80.00
    const monthlyCost = calculateMonthlyProjectedIdleCost(4.0, TEST_FINANCIALS);
    expect(monthlyCost).toBe(80.0);
  });

  it('should use default operating days', () => {
    // $4.00/day × 22 days = $88.00
    const monthlyCost = calculateMonthlyProjectedIdleCost(4.0, FINANCIAL_DEFAULTS);
    expect(monthlyCost).toBe(88.0);
  });

  it('should handle zero daily cost', () => {
    const monthlyCost = calculateMonthlyProjectedIdleCost(0, TEST_FINANCIALS);
    expect(monthlyCost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INSURANCE MULTIPLIER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateInsuranceMultiplier', () => {
  it('should return 1.0 for risk score 0', () => {
    const multiplier = calculateInsuranceMultiplier(0, TEST_FINANCIALS);
    expect(multiplier).toBe(1.0);
  });

  it('should return full multiplier for risk score 100', () => {
    // speedingInsuranceMultiplier = 1.20
    const multiplier = calculateInsuranceMultiplier(100, TEST_FINANCIALS);
    expect(multiplier).toBe(1.20);
  });

  it('should interpolate linearly for risk score 50', () => {
    // 1 + (0.5 × 0.20) = 1.10
    const multiplier = calculateInsuranceMultiplier(50, TEST_FINANCIALS);
    expect(multiplier).toBe(1.10);
  });

  it('should clamp negative risk scores to 0', () => {
    const multiplier = calculateInsuranceMultiplier(-20, TEST_FINANCIALS);
    expect(multiplier).toBe(1.0);
  });

  it('should clamp risk scores above 100', () => {
    const multiplier = calculateInsuranceMultiplier(150, TEST_FINANCIALS);
    expect(multiplier).toBe(1.20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SPEEDING RISK COST TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateSpeedingRiskCost', () => {
  it('should return 0 for risk score 0', () => {
    const cost = calculateSpeedingRiskCost(0, TEST_FINANCIALS);
    expect(cost).toBe(0);
  });

  it('should return full additional premium for risk score 100', () => {
    // baseInsurance × (1.20 - 1) = $2000 × 0.20 = $400
    const cost = calculateSpeedingRiskCost(100, TEST_FINANCIALS);
    expect(cost).toBeCloseTo(400, 2);
  });

  it('should return half additional premium for risk score 50', () => {
    // baseInsurance × (1.10 - 1) = $2000 × 0.10 = $200
    const cost = calculateSpeedingRiskCost(50, TEST_FINANCIALS);
    expect(cost).toBeCloseTo(200, 2);
  });

  it('should return 0 for negative risk score', () => {
    const cost = calculateSpeedingRiskCost(-10, TEST_FINANCIALS);
    expect(cost).toBe(0);
  });

  it('should use default financial constants', () => {
    // Risk 100: $2400 × 0.15 = $360
    const cost = calculateSpeedingRiskCost(100, FINANCIAL_DEFAULTS);
    expect(cost).toBeCloseTo(360, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ANNUAL PROJECTED LOSS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateAnnualProjectedLoss', () => {
  it('should sum annual idle cost and speeding risk cost', () => {
    // ($80/month × 12) + $200 = $960 + $200 = $1160
    const annual = calculateAnnualProjectedLoss(80, 200);
    expect(annual).toBe(1160);
  });

  it('should handle zero idle cost', () => {
    const annual = calculateAnnualProjectedLoss(0, 200);
    expect(annual).toBe(200);
  });

  it('should handle zero risk cost', () => {
    // $80/month × 12 = $960
    const annual = calculateAnnualProjectedLoss(80, 0);
    expect(annual).toBe(960);
  });

  it('should handle both zero', () => {
    const annual = calculateAnnualProjectedLoss(0, 0);
    expect(annual).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE COSTS WRAPPER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateVehicleCosts', () => {
  it('should compute all cost fields', () => {
    const metrics = createDerivedMetrics({
      totalIdleTimeMinutes: 60,  // 1 hour
      riskScore: 50,
    });

    const costs = calculateVehicleCosts(metrics, TEST_FINANCIALS);

    expect(costs.vehicleId).toBe('vehicle-001');
    expect(costs.dailyIdleCost).toBe(4.0);  // 1h × 2L/h × $2 = $4
    expect(costs.monthlyProjectedIdleCost).toBe(80.0);  // $4 × 20 days
    expect(costs.speedingRiskCost).toBeCloseTo(200, 2);  // Risk 50: $2000 × 0.10
    expect(costs.annualProjectedLoss).toBeCloseTo(1160, 2);  // ($80 × 12) + $200
  });

  it('should handle zero idle time', () => {
    const metrics = createDerivedMetrics({
      totalIdleTimeMinutes: 0,
      riskScore: 50,
    });

    const costs = calculateVehicleCosts(metrics, TEST_FINANCIALS);

    expect(costs.dailyIdleCost).toBe(0);
    expect(costs.monthlyProjectedIdleCost).toBe(0);
    expect(costs.annualProjectedLoss).toBeCloseTo(200, 2);  // Only risk cost
  });

  it('should handle zero risk score', () => {
    const metrics = createDerivedMetrics({
      totalIdleTimeMinutes: 60,
      riskScore: 0,
    });

    const costs = calculateVehicleCosts(metrics, TEST_FINANCIALS);

    expect(costs.speedingRiskCost).toBe(0);
    expect(costs.annualProjectedLoss).toBe(960);  // Only idle cost
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLEET COSTS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateFleetCosts', () => {
  it('should sum costs across vehicles', () => {
    const vehicleCosts = [
      createVehicleCostEstimation({
        vehicleId: 'v1',
        dailyIdleCost: 5,
        monthlyProjectedIdleCost: 100,
        annualProjectedLoss: 1400,
      }),
      createVehicleCostEstimation({
        vehicleId: 'v2',
        dailyIdleCost: 10,
        monthlyProjectedIdleCost: 200,
        annualProjectedLoss: 2800,
      }),
    ];

    const fleetCosts = calculateFleetCosts(
      vehicleCosts,
      '2024-01-01',
      '2024-01-31'
    );

    expect(fleetCosts.totalDailyIdleCost).toBe(15);
    expect(fleetCosts.totalMonthlyProjectedIdleCost).toBe(300);
    expect(fleetCosts.totalRiskAdjustedAnnualCost).toBe(4200);
  });

  it('should identify highest cost vehicle', () => {
    const vehicleCosts = [
      createVehicleCostEstimation({ vehicleId: 'v1', annualProjectedLoss: 1000 }),
      createVehicleCostEstimation({ vehicleId: 'v2', annualProjectedLoss: 3000 }),
      createVehicleCostEstimation({ vehicleId: 'v3', annualProjectedLoss: 2000 }),
    ];

    const fleetCosts = calculateFleetCosts(vehicleCosts, '2024-01-01', '2024-01-31');

    expect(fleetCosts.highestCostVehicle?.vehicleId).toBe('v2');
  });

  it('should handle empty fleet', () => {
    const fleetCosts = calculateFleetCosts([], '2024-01-01', '2024-01-31');

    expect(fleetCosts.totalDailyIdleCost).toBe(0);
    expect(fleetCosts.totalMonthlyProjectedIdleCost).toBe(0);
    expect(fleetCosts.totalRiskAdjustedAnnualCost).toBe(0);
    expect(fleetCosts.highestCostVehicle).toBeNull();
    expect(fleetCosts.costByVehicle).toHaveLength(0);
  });

  it('should include period information', () => {
    const fleetCosts = calculateFleetCosts([], '2024-01-01', '2024-01-31');

    expect(fleetCosts.periodStart).toBe('2024-01-01');
    expect(fleetCosts.periodEnd).toBe('2024-01-31');
  });
});

describe('findHighestCostVehicle', () => {
  it('should find highest cost', () => {
    const costs = [
      createVehicleCostEstimation({ vehicleId: 'a', annualProjectedLoss: 100 }),
      createVehicleCostEstimation({ vehicleId: 'b', annualProjectedLoss: 500 }),
      createVehicleCostEstimation({ vehicleId: 'c', annualProjectedLoss: 300 }),
    ];

    const highest = findHighestCostVehicle(costs);
    expect(highest?.vehicleId).toBe('b');
  });

  it('should return null for empty array', () => {
    const highest = findHighestCostVehicle([]);
    expect(highest).toBeNull();
  });

  it('should return first if all equal', () => {
    const costs = [
      createVehicleCostEstimation({ vehicleId: 'a', annualProjectedLoss: 100 }),
      createVehicleCostEstimation({ vehicleId: 'b', annualProjectedLoss: 100 }),
    ];

    const highest = findHighestCostVehicle(costs);
    expect(highest?.vehicleId).toBe('a');
  });
});

describe('calculateFleetCostsFromMetrics', () => {
  it('should compute fleet costs from metrics', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', totalIdleTimeMinutes: 60, riskScore: 0 }),
      createDerivedMetrics({ vehicleId: 'v2', totalIdleTimeMinutes: 120, riskScore: 50 }),
    ];

    const fleetCosts = calculateFleetCostsFromMetrics(
      metrics,
      '2024-01-01',
      '2024-01-31',
      TEST_FINANCIALS
    );

    expect(fleetCosts.costByVehicle).toHaveLength(2);
    expect(fleetCosts.totalDailyIdleCost).toBe(12);  // $4 + $8
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateCostPercentage', () => {
  it('should calculate percentage correctly', () => {
    const percentage = calculateCostPercentage(250, 1000);
    expect(percentage).toBe(25);
  });

  it('should handle zero total cost', () => {
    const percentage = calculateCostPercentage(250, 0);
    expect(percentage).toBe(0);
  });
});

describe('calculatePotentialIdleSavings', () => {
  it('should calculate savings correctly', () => {
    // 25% reduction of $2000 = $500
    const savings = calculatePotentialIdleSavings(2000, 25);
    expect(savings).toBe(500);
  });

  it('should clamp percentage to valid range', () => {
    const savings = calculatePotentialIdleSavings(1000, 150);
    expect(savings).toBe(1000);  // Capped at 100%
  });

  it('should handle negative percentage', () => {
    const savings = calculatePotentialIdleSavings(1000, -20);
    expect(savings).toBe(0);
  });
});

describe('calculatePotentialRiskSavings', () => {
  it('should calculate savings from risk reduction', () => {
    // Current: risk 100 = $400, Target: risk 50 = $200, Savings = $200
    const savings = calculatePotentialRiskSavings(100, 50, TEST_FINANCIALS);
    expect(savings).toBeCloseTo(200, 2);
  });

  it('should return 0 if target is higher than current', () => {
    const savings = calculatePotentialRiskSavings(30, 80, TEST_FINANCIALS);
    expect(savings).toBe(0);
  });

  it('should handle reducing to zero', () => {
    const savings = calculatePotentialRiskSavings(50, 0, TEST_FINANCIALS);
    expect(savings).toBeCloseTo(200, 2);  // All $200 saved
  });
});

describe('identifyCostDriver', () => {
  it('should identify idle as primary when higher', () => {
    const costs = createVehicleCostEstimation({
      monthlyProjectedIdleCost: 200,  // $2400/year
      speedingRiskCost: 100,
      annualProjectedLoss: 2500,
    });

    const driver = identifyCostDriver(costs);
    expect(driver.primaryDriver).toBe('idle');
  });

  it('should identify speeding as primary when higher', () => {
    const costs = createVehicleCostEstimation({
      monthlyProjectedIdleCost: 50,  // $600/year
      speedingRiskCost: 800,
      annualProjectedLoss: 1400,
    });

    const driver = identifyCostDriver(costs);
    expect(driver.primaryDriver).toBe('speeding');
  });

  it('should calculate percentages correctly', () => {
    const costs = createVehicleCostEstimation({
      monthlyProjectedIdleCost: 100,  // $1200/year
      speedingRiskCost: 300,
      annualProjectedLoss: 1500,
    });

    const driver = identifyCostDriver(costs);
    expect(driver.idlePercentage).toBe(80);  // 1200/1500
    expect(driver.speedingPercentage).toBe(20);  // 300/1500
  });
});

describe('formatCost', () => {
  it('should format with currency symbol', () => {
    const formatted = formatCost(1234.567, FINANCIAL_DEFAULTS);
    expect(formatted).toBe('$1,234.57');
  });

  it('should handle zero', () => {
    const formatted = formatCost(0, FINANCIAL_DEFAULTS);
    expect(formatted).toBe('$0.00');
  });

  it('should handle custom decimals', () => {
    const formatted = formatCost(1234.5, FINANCIAL_DEFAULTS, 0);
    expect(formatted).toBe('$1,235');
  });
});
