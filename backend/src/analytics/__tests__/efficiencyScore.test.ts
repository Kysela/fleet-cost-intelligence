/**
 * Efficiency Score Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { BaseVehicleMetrics } from '../../types';
import {
  calculateEfficiencyScore,
  computeEfficiencyComponents,
  calculateIdleScore,
  calculateUtilizationScore,
  calculateDistanceScore,
  calculateStopScore,
  getEfficiencyBreakdown,
} from '../efficiencyScore';
import { ANALYTICS_CONFIG, EFFICIENCY_WEIGHTS } from '../../config/constants';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORY
// ═══════════════════════════════════════════════════════════════════════════

function createBaseMetrics(overrides: Partial<BaseVehicleMetrics> = {}): BaseVehicleMetrics {
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
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// IDLE SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateIdleScore', () => {
  it('should return 100 when no idle time', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 0,
      totalMovingTimeMinutes: 60,
    });
    expect(calculateIdleScore(metrics)).toBe(100);
  });

  it('should return 0 when all time is idle', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 60,
      totalMovingTimeMinutes: 0,
    });
    expect(calculateIdleScore(metrics)).toBe(0);
  });

  it('should return 75 when 25% idle', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 15,
      totalMovingTimeMinutes: 45,
    });
    // idleRatio = 15/60 = 0.25, score = (1 - 0.25) × 100 = 75
    expect(calculateIdleScore(metrics)).toBe(75);
  });

  it('should handle zero operational time', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 0,
      totalMovingTimeMinutes: 0,
    });
    // safeDivide returns 0, so (1 - 0) × 100 = 100
    expect(calculateIdleScore(metrics)).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILIZATION SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateUtilizationScore', () => {
  it('should return 100 when all time is moving', () => {
    const metrics = createBaseMetrics({
      totalMovingTimeMinutes: 60,
      totalTimeMinutes: 60,
    });
    expect(calculateUtilizationScore(metrics)).toBe(100);
  });

  it('should return 0 when no moving time', () => {
    const metrics = createBaseMetrics({
      totalMovingTimeMinutes: 0,
      totalTimeMinutes: 60,
    });
    expect(calculateUtilizationScore(metrics)).toBe(0);
  });

  it('should return 75 when 75% utilization', () => {
    const metrics = createBaseMetrics({
      totalMovingTimeMinutes: 45,
      totalTimeMinutes: 60,
    });
    expect(calculateUtilizationScore(metrics)).toBe(75);
  });

  it('should handle zero total time', () => {
    const metrics = createBaseMetrics({
      totalMovingTimeMinutes: 30,
      totalTimeMinutes: 0,
    });
    // safeDivide returns 0
    expect(calculateUtilizationScore(metrics)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateDistanceScore', () => {
  it('should return 100 when km/h equals expected', () => {
    // expectedKmPerHour = 35 (from config)
    // If 35 km in 1 hour → score = 100
    const metrics = createBaseMetrics({
      totalDistanceKm: 35,
      totalTimeMinutes: 60,
    });
    expect(calculateDistanceScore(metrics, 35)).toBe(100);
  });

  it('should cap at 100 when exceeding expected', () => {
    const metrics = createBaseMetrics({
      totalDistanceKm: 70, // Double the expected
      totalTimeMinutes: 60,
    });
    // 70 km/h vs 35 expected = 200%, but capped at 100
    expect(calculateDistanceScore(metrics, 35)).toBe(100);
  });

  it('should return 50 when half of expected', () => {
    const metrics = createBaseMetrics({
      totalDistanceKm: 17.5, // Half of 35
      totalTimeMinutes: 60,
    });
    expect(calculateDistanceScore(metrics, 35)).toBeCloseTo(50, 1);
  });

  it('should return 0 when no distance', () => {
    const metrics = createBaseMetrics({
      totalDistanceKm: 0,
      totalTimeMinutes: 60,
    });
    expect(calculateDistanceScore(metrics, 35)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STOP SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateStopScore', () => {
  it('should return 100 when no stops', () => {
    const metrics = createBaseMetrics({
      numberOfStops: 0,
      totalDistanceKm: 50,
    });
    expect(calculateStopScore(metrics, 50)).toBe(100);
  });

  it('should decrease with more stops per km', () => {
    const metrics = createBaseMetrics({
      numberOfStops: 10,
      totalDistanceKm: 50, // 0.2 stops/km
    });
    // 0.2 × 50 penalty = 10 penalty, score = 90
    expect(calculateStopScore(metrics, 50)).toBe(90);
  });

  it('should clamp at 0 for excessive stops', () => {
    const metrics = createBaseMetrics({
      numberOfStops: 100,
      totalDistanceKm: 10, // 10 stops/km
    });
    // 10 × 50 = 500 penalty, score = 100 - 500 = -400 → clamped to 0
    expect(calculateStopScore(metrics, 50)).toBe(0);
  });

  it('should handle zero distance (use 1 as minimum)', () => {
    const metrics = createBaseMetrics({
      numberOfStops: 2,
      totalDistanceKm: 0,
    });
    // stopsPerKm = 2/1 = 2, penalty = 2 × 50 = 100, score = 0
    expect(calculateStopScore(metrics, 50)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateEfficiencyScore', () => {
  it('should return weighted sum of components', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 15,
      totalMovingTimeMinutes: 45,
      totalTimeMinutes: 60,
      totalDistanceKm: 35, // Equals expected
      numberOfStops: 0,
    });

    // Components:
    // idleScore = 75 (25% idle)
    // utilizationScore = 75 (45/60)
    // distanceScore = 100 (35 km/h = expected)
    // stopScore = 100 (no stops)
    
    // Weighted: 75×0.4 + 75×0.3 + 100×0.2 + 100×0.1
    //         = 30 + 22.5 + 20 + 10 = 82.5

    const score = calculateEfficiencyScore(metrics);
    expect(score).toBeCloseTo(82.5, 1);
  });

  it('should return 0 for zero total time', () => {
    const metrics = createBaseMetrics({
      totalTimeMinutes: 0,
    });
    expect(calculateEfficiencyScore(metrics)).toBe(0);
  });

  it('should clamp between 0 and 100', () => {
    // Perfect metrics should not exceed 100
    const perfectMetrics = createBaseMetrics({
      totalIdleTimeMinutes: 0,
      totalMovingTimeMinutes: 60,
      totalTimeMinutes: 60,
      totalDistanceKm: 100, // Way above expected
      numberOfStops: 0,
    });
    
    const score = calculateEfficiencyScore(perfectMetrics);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('computeEfficiencyComponents', () => {
  it('should return all four components', () => {
    const metrics = createBaseMetrics();
    const components = computeEfficiencyComponents(metrics);

    expect(components).toHaveProperty('idleScore');
    expect(components).toHaveProperty('utilizationScore');
    expect(components).toHaveProperty('distanceScore');
    expect(components).toHaveProperty('stopScore');

    // All should be in 0-100 range
    expect(components.idleScore).toBeGreaterThanOrEqual(0);
    expect(components.idleScore).toBeLessThanOrEqual(100);
  });
});

describe('getEfficiencyBreakdown', () => {
  it('should return complete breakdown', () => {
    const metrics = createBaseMetrics();
    const breakdown = getEfficiencyBreakdown(metrics);

    expect(breakdown).toHaveProperty('components');
    expect(breakdown).toHaveProperty('weights');
    expect(breakdown).toHaveProperty('contributions');
    expect(breakdown).toHaveProperty('finalScore');

    // Contributions should sum to final score (approximately)
    const contributionSum =
      breakdown.contributions.idle +
      breakdown.contributions.utilization +
      breakdown.contributions.distance +
      breakdown.contributions.stop;

    expect(contributionSum).toBeCloseTo(breakdown.finalScore, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WEIGHTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Efficiency weights', () => {
  it('should sum to 1.0', () => {
    const sum =
      EFFICIENCY_WEIGHTS.idleRatio +
      EFFICIENCY_WEIGHTS.utilizationRate +
      EFFICIENCY_WEIGHTS.distanceEfficiency +
      EFFICIENCY_WEIGHTS.stopEfficiency;

    expect(sum).toBeCloseTo(1.0, 5);
  });
});
