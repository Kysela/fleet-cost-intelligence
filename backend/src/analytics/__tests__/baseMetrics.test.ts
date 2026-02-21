/**
 * Base Metrics Unit Tests
 * 
 * Tests for the analytics engine using mock GPS data.
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import type { GPSTrackResponse, GPSTrackPoint } from '../../types';
import {
  computeBaseMetrics,
  classifyPointState,
  isStopTransition,
  validateTrack,
} from '../baseMetrics';
import { ANALYTICS_CONFIG } from '../../config/constants';

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a GPS track point with defaults.
 */
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

/**
 * Creates a GPS track response with defaults.
 */
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

/**
 * Generates a series of points simulating movement.
 */
function generateMovingPoints(
  count: number,
  startTime: Date,
  intervalMinutes: number = 1,
  speed: number = 60
): GPSTrackPoint[] {
  const points: GPSTrackPoint[] = [];
  let lat = 40.7128;
  let lon = -74.006;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    points.push(
      createPoint({
        latitude: lat,
        longitude: lon,
        speed,
        timestamp: timestamp.toISOString(),
        ignitionOn: true,
      })
    );
    // Move slightly north-east
    lat += 0.001;
    lon += 0.001;
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE CLASSIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('classifyPointState', () => {
  it('should classify high speed with ignition on as moving', () => {
    const point = createPoint({ speed: 60, ignitionOn: true });
    expect(classifyPointState(point)).toBe('moving');
  });

  it('should classify low speed with ignition on as idle', () => {
    const point = createPoint({ speed: 1, ignitionOn: true });
    expect(classifyPointState(point)).toBe('idle');
  });

  it('should classify zero speed with ignition on as idle', () => {
    const point = createPoint({ speed: 0, ignitionOn: true });
    expect(classifyPointState(point)).toBe('idle');
  });

  it('should classify ignition off as off regardless of speed', () => {
    const point = createPoint({ speed: 60, ignitionOn: false });
    expect(classifyPointState(point)).toBe('off');
  });

  it('should use configurable idle threshold', () => {
    const point = createPoint({ speed: 5, ignitionOn: true });
    
    // Default threshold is 2 km/h, so 5 km/h should be moving
    expect(classifyPointState(point)).toBe('moving');

    // With custom threshold of 10 km/h, 5 km/h should be idle
    const customConfig = { ...ANALYTICS_CONFIG, idleSpeedThresholdKmh: 10 };
    expect(classifyPointState(point, customConfig)).toBe('idle');
  });
});

describe('isStopTransition', () => {
  it('should detect moving to idle as a stop', () => {
    expect(isStopTransition('moving', 'idle')).toBe(true);
  });

  it('should detect moving to off as a stop', () => {
    expect(isStopTransition('moving', 'off')).toBe(true);
  });

  it('should not count idle to idle as a stop', () => {
    expect(isStopTransition('idle', 'idle')).toBe(false);
  });

  it('should not count idle to moving as a stop', () => {
    expect(isStopTransition('idle', 'moving')).toBe(false);
  });

  it('should not count off to moving as a stop', () => {
    expect(isStopTransition('off', 'moving')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY/EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('computeBaseMetrics - edge cases', () => {
  it('should handle empty track', () => {
    const track = createTrack([]);
    const metrics = computeBaseMetrics(track);

    expect(metrics.vehicleId).toBe('vehicle-001');
    expect(metrics.totalDistanceKm).toBe(0);
    expect(metrics.totalMovingTimeMinutes).toBe(0);
    expect(metrics.totalIdleTimeMinutes).toBe(0);
    expect(metrics.averageSpeedKmh).toBe(0);
    expect(metrics.numberOfStops).toBe(0);
    expect(metrics.totalPointsAnalyzed).toBe(0);
  });

  it('should handle single-point track', () => {
    const points = [createPoint({ speed: 50 })];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    expect(metrics.totalPointsAnalyzed).toBe(1);
    expect(metrics.totalDistanceKm).toBe(0);
    expect(metrics.maxSpeedKmh).toBe(50);
  });

  it('should handle track with all ignition off', () => {
    const points = [
      createPoint({ speed: 0, ignitionOn: false, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 0, ignitionOn: false, timestamp: '2024-01-15T09:30:00Z' }),
      createPoint({ speed: 0, ignitionOn: false, timestamp: '2024-01-15T10:00:00Z' }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    // No operational time (all ignition off)
    expect(metrics.totalMovingTimeMinutes).toBe(0);
    expect(metrics.totalIdleTimeMinutes).toBe(0);
    expect(metrics.maxSpeedKmh).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CORE METRICS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('computeBaseMetrics - core calculations', () => {
  it('should calculate moving time correctly', () => {
    const points = generateMovingPoints(11, new Date('2024-01-15T09:00:00Z'), 1, 60);
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    // 10 segments × 1 minute each = 10 minutes moving
    expect(metrics.totalMovingTimeMinutes).toBe(10);
  });

  it('should calculate idle time correctly', () => {
    const points = [
      createPoint({ speed: 0, timestamp: '2024-01-15T09:00:00Z', ignitionOn: true }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:05:00Z', ignitionOn: true }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:10:00Z', ignitionOn: true }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    // 10 minutes of idling (2 segments × 5 minutes)
    expect(metrics.totalIdleTimeMinutes).toBe(10);
    expect(metrics.totalMovingTimeMinutes).toBe(0);
  });

  it('should count stops correctly', () => {
    const points = [
      // Moving segment
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:05:00Z' }),
      // Stop 1: transition to idle
      createPoint({ speed: 0, timestamp: '2024-01-15T09:10:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:15:00Z' }),
      // Resume moving
      createPoint({ speed: 50, timestamp: '2024-01-15T09:20:00Z' }),
      createPoint({ speed: 50, timestamp: '2024-01-15T09:25:00Z' }),
      // Stop 2: transition to idle
      createPoint({ speed: 0, timestamp: '2024-01-15T09:30:00Z' }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    expect(metrics.numberOfStops).toBe(2);
  });

  it('should detect long idle events', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      // Start idle (will be 15 minutes, exceeds 10 min threshold)
      createPoint({ speed: 0, timestamp: '2024-01-15T09:05:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:10:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:15:00Z' }),
      createPoint({ speed: 0, timestamp: '2024-01-15T09:20:00Z' }),
      // Resume moving
      createPoint({ speed: 60, timestamp: '2024-01-15T09:25:00Z' }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    expect(metrics.longIdleEvents.length).toBe(1);
    expect(metrics.longIdleEvents[0]?.durationMinutes).toBe(20); // 4 segments × 5 min
  });

  it('should not count short idle as long idle event', () => {
    const points = [
      createPoint({ speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      // Short idle (8 minutes, below 10 min threshold)
      createPoint({ speed: 0, timestamp: '2024-01-15T09:05:00Z' }),
      // Resume moving (only 8 minutes of idle: 09:05 -> 09:13)
      createPoint({ speed: 60, timestamp: '2024-01-15T09:13:00Z' }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    expect(metrics.longIdleEvents.length).toBe(0);
    expect(metrics.totalIdleTimeMinutes).toBe(8); // Still counted as idle time
  });

  it('should track max speed', () => {
    const points = [
      createPoint({ speed: 50, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ speed: 80, timestamp: '2024-01-15T09:05:00Z' }),
      createPoint({ speed: 120, timestamp: '2024-01-15T09:10:00Z' }),
      createPoint({ speed: 60, timestamp: '2024-01-15T09:15:00Z' }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    expect(metrics.maxSpeedKmh).toBe(120);
  });

  it('should calculate average speed from distance and moving time', () => {
    // Create a simple track with known distance
    const points = [
      createPoint({ latitude: 40.0, longitude: -74.0, speed: 60, timestamp: '2024-01-15T09:00:00Z' }),
      createPoint({ latitude: 40.1, longitude: -74.0, speed: 60, timestamp: '2024-01-15T09:10:00Z' }),
    ];
    const track = createTrack(points);
    const metrics = computeBaseMetrics(track);

    // Distance should be ~11.1 km (0.1 degree latitude ≈ 11.1 km)
    expect(metrics.totalDistanceKm).toBeGreaterThan(10);
    expect(metrics.totalDistanceKm).toBeLessThan(12);

    // Average speed = distance / (moving time in hours)
    // ~11.1 km / (10 min / 60) = ~66.6 km/h
    expect(metrics.averageSpeedKmh).toBeGreaterThan(60);
    expect(metrics.averageSpeedKmh).toBeLessThan(75);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('validateTrack', () => {
  it('should validate a proper track', () => {
    const points = generateMovingPoints(5, new Date());
    const track = createTrack(points);
    const result = validateTrack(track);

    expect(result.valid).toBe(true);
  });

  it('should reject empty track', () => {
    const track = createTrack([]);
    const result = validateTrack(track);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Empty');
  });

  it('should reject single-point track', () => {
    const track = createTrack([createPoint()]);
    const result = validateTrack(track);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Insufficient');
  });
});
