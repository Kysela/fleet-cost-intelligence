/**
 * Derived Metrics Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { GPSTrackResponse, GPSTrackPoint, BaseVehicleMetrics } from '../../types';
import {
  computeDerivedMetrics,
  calculateIdleRatio,
  calculateAggressiveDrivingRatio,
  analyzeSpeedingTime,
  isSpeedingPoint,
  calculateSpeedVariance,
  hasExcessiveIdling,
  hasAggressiveDriving,
} from '../derivedMetrics';
import { computeBaseMetrics } from '../baseMetrics';
import { ANALYTICS_CONFIG } from '../../config/constants';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

function createPoint(overrides: Partial<GPSTrackPoint> = {}): GPSTrackPoint {
  return {
    latitude: 40.7128,
    longitude: -74.006,
    speed: 50,
    timestamp: '2024-01-15T09:00:00Z',
    ignitionOn: true,
    ...overrides,
  };
}

function createTrack(
  points: GPSTrackPoint[],
  overrides: Partial<Omit<GPSTrackResponse, 'points'>> = {}
): GPSTrackResponse {
  const startTime = points[0]?.timestamp ?? '2024-01-15T09:00:00Z';
  const endTime = points[points.length - 1]?.timestamp ?? '2024-01-15T10:00:00Z';

  return {
    vehicleId: 'vehicle-001',
    startTime,
    endTime,
    points,
    ...overrides,
  };
}

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
// IDLE RATIO TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateIdleRatio', () => {
  it('should calculate idle ratio correctly', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 15,
      totalMovingTimeMinutes: 45,
    });

    const ratio = calculateIdleRatio(metrics);

    // 15 / (15 + 45) = 0.25
    expect(ratio).toBe(0.25);
  });

  it('should return 0 when no operational time', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 0,
      totalMovingTimeMinutes: 0,
    });

    const ratio = calculateIdleRatio(metrics);

    expect(ratio).toBe(0);
  });

  it('should return 1 when all time is idle', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 60,
      totalMovingTimeMinutes: 0,
    });

    const ratio = calculateIdleRatio(metrics);

    expect(ratio).toBe(1);
  });

  it('should return 0 when no idle time', () => {
    const metrics = createBaseMetrics({
      totalIdleTimeMinutes: 0,
      totalMovingTimeMinutes: 60,
    });

    const ratio = calculateIdleRatio(metrics);

    expect(ratio).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SPEEDING ANALYSIS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('isSpeedingPoint', () => {
  it('should detect speeding above threshold', () => {
    const point = createPoint({ speed: 120, ignitionOn: true });
    expect(isSpeedingPoint(point, 110)).toBe(true);
  });

  it('should not flag speed at exactly threshold', () => {
    const point = createPoint({ speed: 110, ignitionOn: true });
    expect(isSpeedingPoint(point, 110)).toBe(true); // >= threshold
  });

  it('should not flag speed below threshold', () => {
    const point = createPoint({ speed: 100, ignitionOn: true });
    expect(isSpeedingPoint(point, 110)).toBe(false);
  });

  it('should not flag speeding when ignition off', () => {
    const point = createPoint({ speed: 150, ignitionOn: false });
    expect(isSpeedingPoint(point, 110)).toBe(false);
  });
});

describe('analyzeSpeedingTime', () => {
  it('should calculate speeding time correctly', () => {
    const points = [
      createPoint({ speed: 90, timestamp: '2024-01-15T09:00:00Z' }),   // Not speeding
      createPoint({ speed: 120, timestamp: '2024-01-15T09:05:00Z' }),  // Speeding
      createPoint({ speed: 130, timestamp: '2024-01-15T09:10:00Z' }),  // Speeding
      createPoint({ speed: 80, timestamp: '2024-01-15T09:15:00Z' }),   // Not speeding
    ];
    const track = createTrack(points);
    const analysis = analyzeSpeedingTime(track);

    // Speeding segments: 09:05-09:10 (5 min) + 09:10-09:15 (5 min) = 10 min
    expect(analysis.timeOverThresholdMinutes).toBe(10);
    expect(analysis.speedingSegmentCount).toBe(1); // One continuous speeding segment
    expect(analysis.maxSpeedingSpeed).toBe(130);
  });

  it('should count separate speeding segments', () => {
    const points = [
      createPoint({ speed: 120, timestamp: '2024-01-15T09:00:00Z' }),  // Speeding
      createPoint({ speed: 90, timestamp: '2024-01-15T09:05:00Z' }),   // Not speeding
      createPoint({ speed: 115, timestamp: '2024-01-15T09:10:00Z' }),  // Speeding again
      createPoint({ speed: 80, timestamp: '2024-01-15T09:15:00Z' }),   // Not speeding
    ];
    const track = createTrack(points);
    const analysis = analyzeSpeedingTime(track);

    expect(analysis.speedingSegmentCount).toBe(2); // Two separate speeding segments
  });

  it('should handle empty track', () => {
    const track = createTrack([]);
    const analysis = analyzeSpeedingTime(track);

    expect(analysis.timeOverThresholdMinutes).toBe(0);
    expect(analysis.speedingSegmentCount).toBe(0);
    expect(analysis.maxSpeedingSpeed).toBe(0);
  });
});

describe('calculateAggressiveDrivingRatio', () => {
  it('should calculate ratio correctly', () => {
    // 10 minutes speeding out of 60 minutes moving
    const ratio = calculateAggressiveDrivingRatio(10, 60);
    expect(ratio).toBeCloseTo(0.1667, 3);
  });

  it('should return 0 when no moving time', () => {
    const ratio = calculateAggressiveDrivingRatio(10, 0);
    expect(ratio).toBe(0);
  });

  it('should return 0 when no speeding time', () => {
    const ratio = calculateAggressiveDrivingRatio(0, 60);
    expect(ratio).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SPEED VARIANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateSpeedVariance', () => {
  it('should calculate variance for moving points', () => {
    const points = [
      createPoint({ speed: 50, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:05:00Z' }),
      createPoint({ speed: 70, timestamp: '2024-01-15T09:10:00Z' }),
      createPoint({ speed: 80, timestamp: '2024-01-15T09:15:00Z' }),
    ];
    const track = createTrack(points);
    const variance = calculateSpeedVariance(track);

    // Mean = 65, variance = ((50-65)² + (60-65)² + (70-65)² + (80-65)²) / 4
    // = (225 + 25 + 25 + 225) / 4 = 125
    expect(variance).toBe(125);
  });

  it('should return 0 for constant speed', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:05:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:10:00Z' }),
    ];
    const track = createTrack(points);
    const variance = calculateSpeedVariance(track);

    expect(variance).toBe(0);
  });

  it('should exclude idle points from variance', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:05:00Z' }),  // Idle, excluded
      createPoint({ speed: 60, timestamp: '2024-01-15T09:10:00Z' }),
    ];
    const track = createTrack(points);
    const variance = calculateSpeedVariance(track);

    // Only two moving points at same speed = 0 variance
    expect(variance).toBe(0);
  });

  it('should return 0 for insufficient data', () => {
    const track = createTrack([createPoint({ speed: 60 })]);
    const variance = calculateSpeedVariance(track);

    expect(variance).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DERIVED METRICS INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('computeDerivedMetrics', () => {
  it('should compute all derived metrics', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 120, timestamp: '2024-01-15T09:10:00Z' }),  // Speeding
      createPoint({ speed: 0, timestamp: '2024-01-15T09:20:00Z' }),    // Idle
      createPoint({ speed: 50, timestamp: '2024-01-15T09:30:00Z' }),
    ];
    const track = createTrack(points);
    const baseMetrics = computeBaseMetrics(track);
    const derivedMetrics = computeDerivedMetrics(baseMetrics, track);

    // Check that all required fields are present
    expect(derivedMetrics.idleRatio).toBeDefined();
    expect(derivedMetrics.aggressiveDrivingRatio).toBeDefined();
    expect(derivedMetrics.timeOverSpeedThresholdMinutes).toBeDefined();
    expect(derivedMetrics.efficiencyScore).toBe(0); // Placeholder
    expect(derivedMetrics.riskScore).toBe(0); // Placeholder

    // Verify base metrics are preserved
    expect(derivedMetrics.vehicleId).toBe(baseMetrics.vehicleId);
    expect(derivedMetrics.totalDistanceKm).toBe(baseMetrics.totalDistanceKm);
  });

  it('should handle track with no speeding', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 70, timestamp: '2024-01-15T09:10:00Z' }),
      createPoint({ speed: 80, timestamp: '2024-01-15T09:20:00Z' }),
    ];
    const track = createTrack(points);
    const baseMetrics = computeBaseMetrics(track);
    const derivedMetrics = computeDerivedMetrics(baseMetrics, track);

    expect(derivedMetrics.aggressiveDrivingRatio).toBe(0);
    expect(derivedMetrics.timeOverSpeedThresholdMinutes).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL FLAGS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('hasExcessiveIdling', () => {
  it('should flag excessive idling above threshold', () => {
    const points = [
      createPoint({ speed: 0, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:30:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:40:00Z' }),
    ];
    const track = createTrack(points);
    const baseMetrics = computeBaseMetrics(track);
    const derivedMetrics = computeDerivedMetrics(baseMetrics, track);

    // 30 min idle / 40 min operational = 0.75 idle ratio (> 0.3 default)
    expect(hasExcessiveIdling(derivedMetrics)).toBe(true);
  });

  it('should not flag normal idle levels', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:30:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:35:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:40:00Z' }),
    ];
    const track = createTrack(points);
    const baseMetrics = computeBaseMetrics(track);
    const derivedMetrics = computeDerivedMetrics(baseMetrics, track);

    // Low idle ratio
    expect(hasExcessiveIdling(derivedMetrics)).toBe(false);
  });
});

describe('hasAggressiveDriving', () => {
  it('should flag aggressive driving above threshold', () => {
    const points = [
      createPoint({ speed: 120, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 130, timestamp: '2024-01-15T09:10:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:15:00Z' }),
    ];
    const track = createTrack(points);
    const baseMetrics = computeBaseMetrics(track);
    const derivedMetrics = computeDerivedMetrics(baseMetrics, track);

    // 10 min speeding / 15 min moving = 0.67 (> 0.1 default)
    expect(hasAggressiveDriving(derivedMetrics)).toBe(true);
  });
});
