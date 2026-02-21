/**
 * Fleet Aggregator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { DerivedVehicleMetrics, VehicleCostEstimation } from '../../types';
import {
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
} from '../fleetAggregator';

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

function createVehicleCost(
  overrides: Partial<VehicleCostEstimation> = {}
): VehicleCostEstimation {
  return {
    vehicleId: 'vehicle-001',
    dailyIdleCost: 10,
    monthlyProjectedIdleCost: 220,
    speedingRiskCost: 100,
    dailyTotalLoss: 10,
    monthlyProjectedLoss: 220,
    annualProjectedLoss: 2740,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RANKING TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('rankByEfficiency', () => {
  it('should rank vehicles by efficiency (highest first)', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 60 }),
      createDerivedMetrics({ vehicleId: 'v2', efficiencyScore: 90 }),
      createDerivedMetrics({ vehicleId: 'v3', efficiencyScore: 75 }),
    ];

    const rankings = rankByEfficiency(metrics);

    expect(rankings[0]?.vehicleId).toBe('v2');
    expect(rankings[0]?.score).toBe(90);
    expect(rankings[0]?.rank).toBe(1);

    expect(rankings[1]?.vehicleId).toBe('v3');
    expect(rankings[1]?.rank).toBe(2);

    expect(rankings[2]?.vehicleId).toBe('v1');
    expect(rankings[2]?.rank).toBe(3);
  });

  it('should use vehicleId as tie-breaker (alphabetical)', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'charlie', efficiencyScore: 80 }),
      createDerivedMetrics({ vehicleId: 'alpha', efficiencyScore: 80 }),
      createDerivedMetrics({ vehicleId: 'bravo', efficiencyScore: 80 }),
    ];

    const rankings = rankByEfficiency(metrics);

    // Same score, sorted by vehicleId alphabetically
    expect(rankings[0]?.vehicleId).toBe('alpha');
    expect(rankings[1]?.vehicleId).toBe('bravo');
    expect(rankings[2]?.vehicleId).toBe('charlie');
  });

  it('should return empty array for empty input', () => {
    const rankings = rankByEfficiency([]);
    expect(rankings).toHaveLength(0);
  });

  it('should assign sequential ranks', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 50 }),
      createDerivedMetrics({ vehicleId: 'v2', efficiencyScore: 50 }),
      createDerivedMetrics({ vehicleId: 'v3', efficiencyScore: 50 }),
    ];

    const rankings = rankByEfficiency(metrics);

    expect(rankings[0]?.rank).toBe(1);
    expect(rankings[1]?.rank).toBe(2);
    expect(rankings[2]?.rank).toBe(3);
  });
});

describe('rankByRisk', () => {
  it('should rank vehicles by risk (highest first)', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', riskScore: 20 }),
      createDerivedMetrics({ vehicleId: 'v2', riskScore: 80 }),
      createDerivedMetrics({ vehicleId: 'v3', riskScore: 50 }),
    ];

    const rankings = rankByRisk(metrics);

    expect(rankings[0]?.vehicleId).toBe('v2');
    expect(rankings[0]?.score).toBe(80);
    expect(rankings[0]?.rank).toBe(1);

    expect(rankings[1]?.vehicleId).toBe('v3');
    expect(rankings[2]?.vehicleId).toBe('v1');
  });

  it('should return empty array for empty input', () => {
    const rankings = rankByRisk([]);
    expect(rankings).toHaveLength(0);
  });
});

describe('getTopRiskVehicles', () => {
  it('should return top 3 by default', () => {
    const rankings = [
      { vehicleId: 'v1', vehicleName: 'v1', score: 90, rank: 1 },
      { vehicleId: 'v2', vehicleName: 'v2', score: 80, rank: 2 },
      { vehicleId: 'v3', vehicleName: 'v3', score: 70, rank: 3 },
      { vehicleId: 'v4', vehicleName: 'v4', score: 60, rank: 4 },
      { vehicleId: 'v5', vehicleName: 'v5', score: 50, rank: 5 },
    ];

    const top = getTopRiskVehicles(rankings);

    expect(top).toHaveLength(3);
    expect(top[0]?.vehicleId).toBe('v1');
    expect(top[2]?.vehicleId).toBe('v3');
  });

  it('should return custom count', () => {
    const rankings = [
      { vehicleId: 'v1', vehicleName: 'v1', score: 90, rank: 1 },
      { vehicleId: 'v2', vehicleName: 'v2', score: 80, rank: 2 },
    ];

    const top = getTopRiskVehicles(rankings, 1);
    expect(top).toHaveLength(1);
  });

  it('should handle fewer vehicles than requested', () => {
    const rankings = [
      { vehicleId: 'v1', vehicleName: 'v1', score: 90, rank: 1 },
    ];

    const top = getTopRiskVehicles(rankings, 5);
    expect(top).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLEET METRICS AGGREGATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('aggregateFleetMetrics', () => {
  it('should compute totals correctly', () => {
    const metrics = [
      createDerivedMetrics({
        vehicleId: 'v1',
        totalDistanceKm: 100,
        totalIdleTimeMinutes: 30,
        totalMovingTimeMinutes: 90,
      }),
      createDerivedMetrics({
        vehicleId: 'v2',
        totalDistanceKm: 150,
        totalIdleTimeMinutes: 20,
        totalMovingTimeMinutes: 100,
      }),
    ];

    const fleet = aggregateFleetMetrics(metrics, '2024-01-01', '2024-01-31');

    expect(fleet.totalVehicles).toBe(2);
    expect(fleet.totalDistanceKm).toBe(250);
    expect(fleet.totalIdleTimeMinutes).toBe(50);
    expect(fleet.totalMovingTimeMinutes).toBe(190);
  });

  it('should compute averages correctly (simple mean)', () => {
    const metrics = [
      createDerivedMetrics({
        vehicleId: 'v1',
        idleRatio: 0.2,
        efficiencyScore: 80,
        riskScore: 20,
      }),
      createDerivedMetrics({
        vehicleId: 'v2',
        idleRatio: 0.4,
        efficiencyScore: 60,
        riskScore: 40,
      }),
    ];

    const fleet = aggregateFleetMetrics(metrics, '2024-01-01', '2024-01-31');

    expect(fleet.averageIdleRatio).toBeCloseTo(0.3, 5);  // (0.2 + 0.4) / 2
    expect(fleet.averageEfficiencyScore).toBe(70);  // (80 + 60) / 2
    expect(fleet.averageRiskScore).toBe(30);  // (20 + 40) / 2
  });

  it('should include rankings', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 60, riskScore: 40 }),
      createDerivedMetrics({ vehicleId: 'v2', efficiencyScore: 80, riskScore: 20 }),
    ];

    const fleet = aggregateFleetMetrics(metrics, '2024-01-01', '2024-01-31');

    expect(fleet.vehiclesByEfficiency).toHaveLength(2);
    expect(fleet.vehiclesByEfficiency[0]?.vehicleId).toBe('v2');  // Higher efficiency

    expect(fleet.vehiclesByRisk).toHaveLength(2);
    expect(fleet.vehiclesByRisk[0]?.vehicleId).toBe('v1');  // Higher risk
  });

  it('should include top 3 risk vehicles', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', riskScore: 30 }),
      createDerivedMetrics({ vehicleId: 'v2', riskScore: 80 }),
      createDerivedMetrics({ vehicleId: 'v3', riskScore: 60 }),
      createDerivedMetrics({ vehicleId: 'v4', riskScore: 40 }),
    ];

    const fleet = aggregateFleetMetrics(metrics, '2024-01-01', '2024-01-31');

    expect(fleet.topRiskVehicles).toHaveLength(3);
    expect(fleet.topRiskVehicles[0]?.vehicleId).toBe('v2');  // 80
    expect(fleet.topRiskVehicles[1]?.vehicleId).toBe('v3');  // 60
    expect(fleet.topRiskVehicles[2]?.vehicleId).toBe('v4');  // 40
  });

  it('should handle empty fleet', () => {
    const fleet = aggregateFleetMetrics([], '2024-01-01', '2024-01-31');

    expect(fleet.totalVehicles).toBe(0);
    expect(fleet.totalDistanceKm).toBe(0);
    expect(fleet.averageEfficiencyScore).toBe(0);
    expect(fleet.vehiclesByEfficiency).toHaveLength(0);
    expect(fleet.topRiskVehicles).toHaveLength(0);
  });

  it('should include period dates', () => {
    const fleet = aggregateFleetMetrics([], '2024-01-01', '2024-01-31');

    expect(fleet.periodStart).toBe('2024-01-01');
    expect(fleet.periodEnd).toBe('2024-01-31');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLEET COST AGGREGATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('aggregateFleetCosts', () => {
  it('should compute totals correctly', () => {
    const costs = [
      createVehicleCost({
        vehicleId: 'v1',
        dailyIdleCost: 10,
        monthlyProjectedIdleCost: 220,
        annualProjectedLoss: 2740,
      }),
      createVehicleCost({
        vehicleId: 'v2',
        dailyIdleCost: 15,
        monthlyProjectedIdleCost: 330,
        annualProjectedLoss: 4060,
      }),
    ];

    const fleet = aggregateFleetCosts(costs, '2024-01-01', '2024-01-31');

    expect(fleet.totalDailyIdleCost).toBe(25);
    expect(fleet.totalMonthlyProjectedIdleCost).toBe(550);
    expect(fleet.totalRiskAdjustedAnnualCost).toBe(6800);
  });

  it('should identify highest cost vehicle', () => {
    const costs = [
      createVehicleCost({ vehicleId: 'v1', annualProjectedLoss: 2000 }),
      createVehicleCost({ vehicleId: 'v2', annualProjectedLoss: 5000 }),
      createVehicleCost({ vehicleId: 'v3', annualProjectedLoss: 3000 }),
    ];

    const fleet = aggregateFleetCosts(costs, '2024-01-01', '2024-01-31');

    expect(fleet.highestCostVehicle?.vehicleId).toBe('v2');
  });

  it('should include costByVehicle array', () => {
    const costs = [
      createVehicleCost({ vehicleId: 'v1' }),
      createVehicleCost({ vehicleId: 'v2' }),
    ];

    const fleet = aggregateFleetCosts(costs, '2024-01-01', '2024-01-31');

    expect(fleet.costByVehicle).toHaveLength(2);
  });

  it('should handle empty fleet', () => {
    const fleet = aggregateFleetCosts([], '2024-01-01', '2024-01-31');

    expect(fleet.totalDailyIdleCost).toBe(0);
    expect(fleet.totalMonthlyProjectedIdleCost).toBe(0);
    expect(fleet.totalRiskAdjustedAnnualCost).toBe(0);
    expect(fleet.costByVehicle).toHaveLength(0);
    expect(fleet.highestCostVehicle).toBeNull();
  });
});

describe('findHighestCostVehicle', () => {
  it('should find the highest cost', () => {
    const costs = [
      createVehicleCost({ vehicleId: 'a', annualProjectedLoss: 100 }),
      createVehicleCost({ vehicleId: 'b', annualProjectedLoss: 500 }),
      createVehicleCost({ vehicleId: 'c', annualProjectedLoss: 300 }),
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
      createVehicleCost({ vehicleId: 'a', annualProjectedLoss: 100 }),
      createVehicleCost({ vehicleId: 'b', annualProjectedLoss: 100 }),
    ];

    const highest = findHighestCostVehicle(costs);
    expect(highest?.vehicleId).toBe('a');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED AGGREGATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('aggregateFleet', () => {
  it('should aggregate both metrics and costs', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', totalDistanceKm: 100 }),
    ];
    const costs = [
      createVehicleCost({ vehicleId: 'v1', dailyIdleCost: 10 }),
    ];

    const result = aggregateFleet(metrics, costs, '2024-01-01', '2024-01-31');

    expect(result.metrics.totalVehicles).toBe(1);
    expect(result.metrics.totalDistanceKm).toBe(100);
    expect(result.costs.totalDailyIdleCost).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('getFleetHealthStatus', () => {
  it('should return "excellent" for scores >= 80', () => {
    expect(getFleetHealthStatus(80)).toBe('excellent');
    expect(getFleetHealthStatus(95)).toBe('excellent');
  });

  it('should return "good" for scores 60-79', () => {
    expect(getFleetHealthStatus(60)).toBe('good');
    expect(getFleetHealthStatus(79)).toBe('good');
  });

  it('should return "fair" for scores 40-59', () => {
    expect(getFleetHealthStatus(40)).toBe('fair');
    expect(getFleetHealthStatus(59)).toBe('fair');
  });

  it('should return "poor" for scores 20-39', () => {
    expect(getFleetHealthStatus(20)).toBe('poor');
    expect(getFleetHealthStatus(39)).toBe('poor');
  });

  it('should return "critical" for scores < 20', () => {
    expect(getFleetHealthStatus(19)).toBe('critical');
    expect(getFleetHealthStatus(0)).toBe('critical');
  });
});

describe('getFleetRiskStatus', () => {
  it('should return "low" for scores <= 20', () => {
    expect(getFleetRiskStatus(0)).toBe('low');
    expect(getFleetRiskStatus(20)).toBe('low');
  });

  it('should return "moderate" for scores 21-40', () => {
    expect(getFleetRiskStatus(21)).toBe('moderate');
    expect(getFleetRiskStatus(40)).toBe('moderate');
  });

  it('should return "elevated" for scores 41-60', () => {
    expect(getFleetRiskStatus(41)).toBe('elevated');
    expect(getFleetRiskStatus(60)).toBe('elevated');
  });

  it('should return "high" for scores 61-80', () => {
    expect(getFleetRiskStatus(61)).toBe('high');
    expect(getFleetRiskStatus(80)).toBe('high');
  });

  it('should return "critical" for scores > 80', () => {
    expect(getFleetRiskStatus(81)).toBe('critical');
    expect(getFleetRiskStatus(100)).toBe('critical');
  });
});

describe('calculateHighRiskPercentage', () => {
  it('should calculate percentage correctly', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', riskScore: 70 }),  // High risk
      createDerivedMetrics({ vehicleId: 'v2', riskScore: 30 }),  // Not high risk
      createDerivedMetrics({ vehicleId: 'v3', riskScore: 80 }),  // High risk
      createDerivedMetrics({ vehicleId: 'v4', riskScore: 50 }),  // Not high risk
    ];

    // Default threshold is 60, so 2/4 = 50%
    const percentage = calculateHighRiskPercentage(metrics);
    expect(percentage).toBe(50);
  });

  it('should use custom threshold', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', riskScore: 50 }),
      createDerivedMetrics({ vehicleId: 'v2', riskScore: 30 }),
    ];

    // Threshold 40: 1/2 = 50%
    const percentage = calculateHighRiskPercentage(metrics, 40);
    expect(percentage).toBe(50);
  });

  it('should return 0 for empty fleet', () => {
    const percentage = calculateHighRiskPercentage([]);
    expect(percentage).toBe(0);
  });
});

describe('getVehiclesNeedingAttention', () => {
  it('should identify low efficiency vehicles', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 40, riskScore: 20 }),
      createDerivedMetrics({ vehicleId: 'v2', efficiencyScore: 70, riskScore: 20 }),
    ];

    const attention = getVehiclesNeedingAttention(metrics);
    expect(attention).toContain('v1');
    expect(attention).not.toContain('v2');
  });

  it('should identify high risk vehicles', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 70, riskScore: 70 }),
      createDerivedMetrics({ vehicleId: 'v2', efficiencyScore: 70, riskScore: 30 }),
    ];

    const attention = getVehiclesNeedingAttention(metrics);
    expect(attention).toContain('v1');
    expect(attention).not.toContain('v2');
  });

  it('should use custom thresholds', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 55, riskScore: 45 }),
    ];

    // Default thresholds (efficiency < 50, risk >= 60): v1 is fine
    expect(getVehiclesNeedingAttention(metrics)).not.toContain('v1');

    // Custom thresholds (efficiency < 60, risk >= 40): v1 needs attention
    expect(getVehiclesNeedingAttention(metrics, 60, 40)).toContain('v1');
  });

  it('should return empty array for healthy fleet', () => {
    const metrics = [
      createDerivedMetrics({ vehicleId: 'v1', efficiencyScore: 80, riskScore: 20 }),
      createDerivedMetrics({ vehicleId: 'v2', efficiencyScore: 75, riskScore: 25 }),
    ];

    const attention = getVehiclesNeedingAttention(metrics);
    expect(attention).toHaveLength(0);
  });
});
