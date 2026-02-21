/**
 * Risk Score Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { DerivedVehicleMetrics, IdleEvent } from '../../types';
import {
  calculateRiskScore,
  computeRiskComponents,
  calculateSpeedingScore,
  calculateLongIdleFrequencyScore,
  calculateMaxSpeedSeverityScore,
  calculateErraticPatternScore,
  getRiskBreakdown,
  getRiskLevel,
  getPrimaryRiskFactor,
} from '../riskScore';
import { RISK_WEIGHTS } from '../../config/constants';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORY
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
    efficiencyScore: 0,
    riskScore: 0,
    ...overrides,
  };
}

function createIdleEvent(durationMinutes: number): IdleEvent {
  return {
    startTime: '2024-01-15T09:00:00Z',
    endTime: '2024-01-15T09:15:00Z',
    durationMinutes,
    location: { lat: 40.7128, lng: -74.006 },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEEDING SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateSpeedingScore', () => {
  it('should return 0 when no speeding', () => {
    const metrics = createDerivedMetrics({ aggressiveDrivingRatio: 0 });
    expect(calculateSpeedingScore(metrics)).toBe(0);
  });

  it('should return 100 when always speeding', () => {
    const metrics = createDerivedMetrics({ aggressiveDrivingRatio: 1.0 });
    expect(calculateSpeedingScore(metrics)).toBe(100);
  });

  it('should scale linearly with ratio', () => {
    const metrics = createDerivedMetrics({ aggressiveDrivingRatio: 0.25 });
    expect(calculateSpeedingScore(metrics)).toBe(25);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LONG IDLE FREQUENCY SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateLongIdleFrequencyScore', () => {
  it('should return 0 when no long idle events', () => {
    const metrics = createDerivedMetrics({ longIdleEvents: [] });
    expect(calculateLongIdleFrequencyScore(metrics, 15)).toBe(0);
  });

  it('should increase with more long idles per day', () => {
    // 1440 minutes = 1 day, 3 long idles = 3 per day
    // Score = 3 × 15 (idleRiskFactor) = 45
    const metrics = createDerivedMetrics({
      totalTimeMinutes: 1440, // 1 day
      longIdleEvents: [
        createIdleEvent(15),
        createIdleEvent(20),
        createIdleEvent(12),
      ],
    });
    expect(calculateLongIdleFrequencyScore(metrics, 15)).toBe(45);
  });

  it('should cap at 100 for excessive long idles', () => {
    const manyIdleEvents = Array(20).fill(null).map(() => createIdleEvent(15));
    const metrics = createDerivedMetrics({
      totalTimeMinutes: 1440, // 1 day
      longIdleEvents: manyIdleEvents, // 20 per day
    });
    // 20 × 15 = 300, capped at 100
    expect(calculateLongIdleFrequencyScore(metrics, 15)).toBe(100);
  });

  it('should normalize by days not absolute time', () => {
    // 2880 minutes = 2 days, 4 long idles = 2 per day
    // Score = 2 × 15 = 30
    const metrics = createDerivedMetrics({
      totalTimeMinutes: 2880, // 2 days
      longIdleEvents: [
        createIdleEvent(15),
        createIdleEvent(20),
        createIdleEvent(12),
        createIdleEvent(18),
      ],
    });
    expect(calculateLongIdleFrequencyScore(metrics, 15)).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MAX SPEED SEVERITY SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateMaxSpeedSeverityScore', () => {
  it('should return 0 when max speed is below threshold', () => {
    const metrics = createDerivedMetrics({ maxSpeedKmh: 100 });
    expect(calculateMaxSpeedSeverityScore(metrics, 110)).toBe(0);
  });

  it('should return 0 when max speed equals threshold', () => {
    const metrics = createDerivedMetrics({ maxSpeedKmh: 110 });
    expect(calculateMaxSpeedSeverityScore(metrics, 110)).toBe(0);
  });

  it('should return 50 when 20 km/h over threshold', () => {
    const metrics = createDerivedMetrics({ maxSpeedKmh: 130 });
    // Excess = 20, reference = 40, score = 20/40 × 100 = 50
    expect(calculateMaxSpeedSeverityScore(metrics, 110)).toBe(50);
  });

  it('should return 100 when 40 km/h over threshold', () => {
    const metrics = createDerivedMetrics({ maxSpeedKmh: 150 });
    expect(calculateMaxSpeedSeverityScore(metrics, 110)).toBe(100);
  });

  it('should cap at 100 for extreme speeds', () => {
    const metrics = createDerivedMetrics({ maxSpeedKmh: 200 });
    // Excess = 90, but capped at 100
    expect(calculateMaxSpeedSeverityScore(metrics, 110)).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ERRATIC PATTERN SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateErraticPatternScore', () => {
  it('should return 0 when max equals average (consistent)', () => {
    const metrics = createDerivedMetrics({
      maxSpeedKmh: 60,
      averageSpeedKmh: 60,
    });
    // Ratio = 1.0, score = (1 - 1) × 100 = 0
    expect(calculateErraticPatternScore(metrics)).toBe(0);
  });

  it('should return 50 when max is 1.5x average', () => {
    const metrics = createDerivedMetrics({
      maxSpeedKmh: 90,
      averageSpeedKmh: 60,
    });
    // Ratio = 1.5, score = (1.5 - 1) × 100 = 50
    expect(calculateErraticPatternScore(metrics)).toBe(50);
  });

  it('should return 100 when max is 2x average', () => {
    const metrics = createDerivedMetrics({
      maxSpeedKmh: 120,
      averageSpeedKmh: 60,
    });
    // Ratio = 2.0, score = (2 - 1) × 100 = 100
    expect(calculateErraticPatternScore(metrics)).toBe(100);
  });

  it('should cap at 100 for extreme variance', () => {
    const metrics = createDerivedMetrics({
      maxSpeedKmh: 200,
      averageSpeedKmh: 50,
    });
    // Ratio = 4.0, score = (4 - 1) × 100 = 300, capped at 100
    expect(calculateErraticPatternScore(metrics)).toBe(100);
  });

  it('should handle zero average speed', () => {
    const metrics = createDerivedMetrics({
      maxSpeedKmh: 60,
      averageSpeedKmh: 0,
    });
    // Special case: returns 50 if there was max speed but no average
    expect(calculateErraticPatternScore(metrics)).toBe(50);
  });

  it('should return 0 when no movement at all', () => {
    const metrics = createDerivedMetrics({
      maxSpeedKmh: 0,
      averageSpeedKmh: 0,
    });
    expect(calculateErraticPatternScore(metrics)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateRiskScore', () => {
  it('should return 0 for perfect metrics', () => {
    const metrics = createDerivedMetrics({
      aggressiveDrivingRatio: 0,
      maxSpeedKmh: 90,  // Below threshold
      averageSpeedKmh: 90,  // Consistent
      longIdleEvents: [],
    });

    const score = calculateRiskScore(metrics);
    expect(score).toBe(0);
  });

  it('should return weighted sum of components', () => {
    const metrics = createDerivedMetrics({
      aggressiveDrivingRatio: 0.2,  // 20 speeding score
      maxSpeedKmh: 130,  // 20 km/h over = 50 severity score
      averageSpeedKmh: 100,  // ratio 1.3 = 30 erratic score
      longIdleEvents: [createIdleEvent(15)],  // 1 per day (if 1 day) × 15 = 15 idle score
      totalTimeMinutes: 1440,
    });

    // Components:
    // speedingScore = 20
    // longIdleFrequencyScore = 15
    // maxSpeedSeverityScore = 50
    // erraticPatternScore = 30

    // Weighted: 20×0.45 + 15×0.25 + 50×0.20 + 30×0.10
    //         = 9 + 3.75 + 10 + 3 = 25.75

    const score = calculateRiskScore(metrics);
    expect(score).toBeCloseTo(25.75, 1);
  });

  it('should return 0 for zero total time', () => {
    const metrics = createDerivedMetrics({ totalTimeMinutes: 0 });
    expect(calculateRiskScore(metrics)).toBe(0);
  });

  it('should clamp between 0 and 100', () => {
    // Worst case metrics
    const badMetrics = createDerivedMetrics({
      aggressiveDrivingRatio: 1.0,  // Always speeding
      maxSpeedKmh: 200,  // Extreme speed
      averageSpeedKmh: 50,  // Very erratic
      longIdleEvents: Array(20).fill(null).map(() => createIdleEvent(15)),
      totalTimeMinutes: 1440,
    });

    const score = calculateRiskScore(badMetrics);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('computeRiskComponents', () => {
  it('should return all four components', () => {
    const metrics = createDerivedMetrics();
    const components = computeRiskComponents(metrics);

    expect(components).toHaveProperty('speedingScore');
    expect(components).toHaveProperty('longIdleFrequencyScore');
    expect(components).toHaveProperty('maxSpeedSeverityScore');
    expect(components).toHaveProperty('erraticPatternScore');

    // All should be in 0-100 range
    Object.values(components).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RISK LEVEL TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('getRiskLevel', () => {
  it('should return "low" for scores 0-20', () => {
    expect(getRiskLevel(0)).toBe('low');
    expect(getRiskLevel(10)).toBe('low');
    expect(getRiskLevel(20)).toBe('low');
  });

  it('should return "moderate" for scores 21-40', () => {
    expect(getRiskLevel(21)).toBe('moderate');
    expect(getRiskLevel(30)).toBe('moderate');
    expect(getRiskLevel(40)).toBe('moderate');
  });

  it('should return "elevated" for scores 41-60', () => {
    expect(getRiskLevel(41)).toBe('elevated');
    expect(getRiskLevel(50)).toBe('elevated');
    expect(getRiskLevel(60)).toBe('elevated');
  });

  it('should return "high" for scores 61-80', () => {
    expect(getRiskLevel(61)).toBe('high');
    expect(getRiskLevel(70)).toBe('high');
    expect(getRiskLevel(80)).toBe('high');
  });

  it('should return "critical" for scores 81-100', () => {
    expect(getRiskLevel(81)).toBe('critical');
    expect(getRiskLevel(90)).toBe('critical');
    expect(getRiskLevel(100)).toBe('critical');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY RISK FACTOR TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('getPrimaryRiskFactor', () => {
  it('should identify speeding as primary factor', () => {
    const metrics = createDerivedMetrics({
      aggressiveDrivingRatio: 0.8,  // High speeding
      maxSpeedKmh: 100,  // Below threshold
      averageSpeedKmh: 100,
      longIdleEvents: [],
    });

    expect(getPrimaryRiskFactor(metrics)).toBe('speeding');
  });

  it('should identify maxSpeedSeverity as primary factor', () => {
    const metrics = createDerivedMetrics({
      aggressiveDrivingRatio: 0.05,  // Low speeding
      maxSpeedKmh: 180,  // Very high max speed
      averageSpeedKmh: 90,
      longIdleEvents: [],
    });

    expect(getPrimaryRiskFactor(metrics)).toBe('maxSpeedSeverity');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BREAKDOWN TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('getRiskBreakdown', () => {
  it('should return complete breakdown', () => {
    const metrics = createDerivedMetrics();
    const breakdown = getRiskBreakdown(metrics);

    expect(breakdown).toHaveProperty('components');
    expect(breakdown).toHaveProperty('weights');
    expect(breakdown).toHaveProperty('contributions');
    expect(breakdown).toHaveProperty('finalScore');

    // Contributions should sum to final score
    const contributionSum =
      breakdown.contributions.speeding +
      breakdown.contributions.longIdleFrequency +
      breakdown.contributions.maxSpeedSeverity +
      breakdown.contributions.erraticPattern;

    expect(contributionSum).toBeCloseTo(breakdown.finalScore, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WEIGHTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Risk weights', () => {
  it('should sum to 1.0', () => {
    const sum =
      RISK_WEIGHTS.speedingRatio +
      RISK_WEIGHTS.longIdleFrequency +
      RISK_WEIGHTS.maxSpeedSeverity +
      RISK_WEIGHTS.erraticPattern;

    expect(sum).toBeCloseTo(1.0, 5);
  });
});
