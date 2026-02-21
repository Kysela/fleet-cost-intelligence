/**
 * Base Metrics Computation
 * 
 * Computes deterministic metrics directly from GPS track data.
 * All functions are pure and do not mutate input data.
 * 
 * Core principle: Each time segment between consecutive points is
 * attributed to exactly one state (moving, idle, or off) based on
 * the starting point's state. This prevents double-counting.
 */

import type {
  GPSTrackResponse,
  GPSTrackPoint,
  BaseVehicleMetrics,
  IdleEvent,
  GeoLocation,
  AnalyticsConfig,
} from '../types';

import { ANALYTICS_CONFIG } from '../config/constants';

import {
  haversineDistance,
  calculateCentroid,
} from '../utils/geoCalculations';

import {
  getDurationMinutes,
  getPointDurationMinutes,
  safeDivide,
} from '../utils/timeUtils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vehicle state at a point in time.
 */
type VehicleState = 'moving' | 'idle' | 'off';

/**
 * Internal tracking for idle event detection.
 */
interface IdleEventTracker {
  isInIdleState: boolean;
  idleStartTime: string | null;
  idleStartLocation: GeoLocation | null;
  accumulatedIdleMinutes: number;
  idlePoints: GPSTrackPoint[];
}

/**
 * Accumulator for metrics during track iteration.
 */
interface MetricsAccumulator {
  totalDistanceKm: number;
  totalMovingTimeMinutes: number;
  totalIdleTimeMinutes: number;
  maxSpeedKmh: number;
  numberOfStops: number;
  speedSamples: number[];
  longIdleEvents: IdleEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determines the vehicle state at a given GPS point.
 * 
 * @param point - GPS track point
 * @param config - Analytics configuration
 * @returns Vehicle state classification
 */
export function classifyPointState(
  point: GPSTrackPoint,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): VehicleState {
  // Ignition off = not operational
  if (!point.ignitionOn) {
    return 'off';
  }

  // Speed below threshold with ignition on = idle
  if (point.speed < config.idleSpeedThresholdKmh) {
    return 'idle';
  }

  // Speed at or above threshold with ignition on = moving
  return 'moving';
}

/**
 * Checks if a state transition represents a stop (moving → idle or moving → off).
 * 
 * @param previousState - State of the previous point
 * @param currentState - State of the current point
 * @returns True if this transition counts as a stop
 */
export function isStopTransition(
  previousState: VehicleState,
  currentState: VehicleState
): boolean {
  return previousState === 'moving' && (currentState === 'idle' || currentState === 'off');
}

// ═══════════════════════════════════════════════════════════════════════════
// IDLE EVENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a fresh idle event tracker.
 */
function createIdleTracker(): IdleEventTracker {
  return {
    isInIdleState: false,
    idleStartTime: null,
    idleStartLocation: null,
    accumulatedIdleMinutes: 0,
    idlePoints: [],
  };
}

/**
 * Handles entering an idle state.
 * Returns a new tracker without mutating the input.
 */
function enterIdleState(
  tracker: IdleEventTracker,
  point: GPSTrackPoint
): IdleEventTracker {
  return {
    ...tracker,
    isInIdleState: true,
    idleStartTime: point.timestamp,
    idleStartLocation: { lat: point.latitude, lng: point.longitude },
    accumulatedIdleMinutes: 0,
    idlePoints: [point],
  };
}

/**
 * Handles accumulating time while in idle state.
 * Returns a new tracker without mutating the input.
 */
function accumulateIdleTime(
  tracker: IdleEventTracker,
  point: GPSTrackPoint,
  durationMinutes: number
): IdleEventTracker {
  return {
    ...tracker,
    accumulatedIdleMinutes: tracker.accumulatedIdleMinutes + durationMinutes,
    idlePoints: [...tracker.idlePoints, point],
  };
}

/**
 * Handles exiting an idle state.
 * Returns a new tracker and optionally a completed idle event.
 */
function exitIdleState(
  tracker: IdleEventTracker,
  endTime: string,
  longIdleThresholdMinutes: number
): { tracker: IdleEventTracker; event: IdleEvent | null } {
  // Determine if this idle event qualifies as "long"
  let event: IdleEvent | null = null;

  if (
    tracker.accumulatedIdleMinutes >= longIdleThresholdMinutes &&
    tracker.idleStartTime !== null
  ) {
    // Calculate centroid of idle points for location
    const centroid = calculateCentroid(tracker.idlePoints);
    const location: GeoLocation = centroid ?? 
      tracker.idleStartLocation ?? 
      { lat: 0, lng: 0 };

    event = {
      startTime: tracker.idleStartTime,
      endTime: endTime,
      durationMinutes: tracker.accumulatedIdleMinutes,
      location,
    };
  }

  // Reset tracker
  const newTracker = createIdleTracker();

  return { tracker: newTracker, event };
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates distance for a segment, only counting when vehicle is moving.
 * 
 * @param prevPoint - Starting point of segment
 * @param currPoint - Ending point of segment
 * @param prevState - State at starting point
 * @returns Distance in km (0 if not moving)
 */
function calculateSegmentDistance(
  prevPoint: GPSTrackPoint,
  currPoint: GPSTrackPoint,
  prevState: VehicleState
): number {
  // Only count distance when moving
  if (prevState !== 'moving') {
    return 0;
  }

  return haversineDistance(
    prevPoint.latitude,
    prevPoint.longitude,
    currPoint.latitude,
    currPoint.longitude
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a zeroed BaseVehicleMetrics object.
 * Used for empty tracks or error cases.
 */
function createEmptyMetrics(
  vehicleId: string,
  periodStart: string,
  periodEnd: string,
  totalTimeMinutes: number = 0
): BaseVehicleMetrics {
  return {
    vehicleId,
    periodStart,
    periodEnd,
    totalDistanceKm: 0,
    totalMovingTimeMinutes: 0,
    totalIdleTimeMinutes: 0,
    totalTimeMinutes,
    averageSpeedKmh: 0,
    maxSpeedKmh: 0,
    numberOfStops: 0,
    longIdleEvents: [],
    totalPointsAnalyzed: 0,
  };
}

/**
 * Computes base metrics from a GPS track response.
 * 
 * This is the primary function for extracting deterministic metrics
 * from raw GPS data. All calculations use actual timestamps, not
 * array indices or assumed intervals.
 * 
 * @param track - GPS track response containing vehicle positions over time
 * @param config - Analytics configuration (optional, uses defaults)
 * @returns Computed base metrics for the vehicle
 * 
 * @example
 * const track = await gpsApi.getTrack(vehicleId, startDate, endDate);
 * const metrics = computeBaseMetrics(track);
 * console.log(`Vehicle traveled ${metrics.totalDistanceKm} km`);
 */
export function computeBaseMetrics(
  track: GPSTrackResponse,
  config: AnalyticsConfig = ANALYTICS_CONFIG
): BaseVehicleMetrics {
  const { vehicleId, startTime, endTime, points } = track;

  // Calculate total time from track bounds (not operational time)
  const totalTimeMinutes = getDurationMinutes(startTime, endTime);

  // Handle empty track
  if (points.length === 0) {
    return createEmptyMetrics(vehicleId, startTime, endTime, totalTimeMinutes);
  }

  // Handle single-point track (no segments to process)
  if (points.length === 1) {
    const singlePoint = points[0];
    if (!singlePoint) {
      return createEmptyMetrics(vehicleId, startTime, endTime, totalTimeMinutes);
    }
    
    return {
      ...createEmptyMetrics(vehicleId, startTime, endTime, totalTimeMinutes),
      maxSpeedKmh: singlePoint.ignitionOn ? singlePoint.speed : 0,
      totalPointsAnalyzed: 1,
    };
  }

  // Initialize accumulator
  let accumulator: MetricsAccumulator = {
    totalDistanceKm: 0,
    totalMovingTimeMinutes: 0,
    totalIdleTimeMinutes: 0,
    maxSpeedKmh: 0,
    numberOfStops: 0,
    speedSamples: [],
    longIdleEvents: [],
  };

  let idleTracker = createIdleTracker();
  let previousState: VehicleState | null = null;

  // Process each consecutive pair of points
  for (let i = 0; i < points.length; i++) {
    const currentPoint = points[i];
    
    // Safety check for strict index access
    if (!currentPoint) {
      continue;
    }

    const currentState = classifyPointState(currentPoint, config);

    // Track max speed (only when ignition is on)
    if (currentPoint.ignitionOn && currentPoint.speed > accumulator.maxSpeedKmh) {
      accumulator = {
        ...accumulator,
        maxSpeedKmh: currentPoint.speed,
      };
    }

    // Collect speed samples for moving points (for average calculation)
    if (currentState === 'moving') {
      accumulator = {
        ...accumulator,
        speedSamples: [...accumulator.speedSamples, currentPoint.speed],
      };
    }

    // Process segment from previous point to current point
    if (i > 0 && previousState !== null) {
      const prevPoint = points[i - 1];
      
      if (prevPoint) {
        const segmentDuration = getPointDurationMinutes(prevPoint, currentPoint);

        // Attribute time to previous point's state
        if (previousState === 'moving') {
          // Calculate distance for moving segment
          const segmentDistance = calculateSegmentDistance(
            prevPoint,
            currentPoint,
            previousState
          );

          accumulator = {
            ...accumulator,
            totalDistanceKm: accumulator.totalDistanceKm + segmentDistance,
            totalMovingTimeMinutes: accumulator.totalMovingTimeMinutes + segmentDuration,
          };
        } else if (previousState === 'idle') {
          accumulator = {
            ...accumulator,
            totalIdleTimeMinutes: accumulator.totalIdleTimeMinutes + segmentDuration,
          };

          // Accumulate idle time in tracker
          idleTracker = accumulateIdleTime(idleTracker, currentPoint, segmentDuration);
        }
        // 'off' state: time not counted in operational time

        // Detect stop transition
        if (isStopTransition(previousState, currentState)) {
          accumulator = {
            ...accumulator,
            numberOfStops: accumulator.numberOfStops + 1,
          };
        }
      }
    }

    // Handle idle state transitions
    if (currentState === 'idle' && previousState !== 'idle') {
      // Entering idle state
      idleTracker = enterIdleState(idleTracker, currentPoint);
    } else if (currentState !== 'idle' && previousState === 'idle') {
      // Exiting idle state
      const result = exitIdleState(
        idleTracker,
        currentPoint.timestamp,
        config.longIdleThresholdMinutes
      );
      idleTracker = result.tracker;

      if (result.event) {
        accumulator = {
          ...accumulator,
          longIdleEvents: [...accumulator.longIdleEvents, result.event],
        };
      }
    }

    previousState = currentState;
  }

  // Handle case where track ends in idle state
  if (idleTracker.isInIdleState) {
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
      const result = exitIdleState(
        idleTracker,
        lastPoint.timestamp,
        config.longIdleThresholdMinutes
      );

      if (result.event) {
        accumulator = {
          ...accumulator,
          longIdleEvents: [...accumulator.longIdleEvents, result.event],
        };
      }
    }
  }

  // Calculate average speed from moving segments
  // Using time-weighted average would be more accurate, but we use
  // distance/time for simplicity and consistency
  const averageSpeedKmh = safeDivide(
    accumulator.totalDistanceKm,
    accumulator.totalMovingTimeMinutes / 60 // Convert minutes to hours
  );

  return {
    vehicleId,
    periodStart: startTime,
    periodEnd: endTime,
    totalDistanceKm: accumulator.totalDistanceKm,
    totalMovingTimeMinutes: accumulator.totalMovingTimeMinutes,
    totalIdleTimeMinutes: accumulator.totalIdleTimeMinutes,
    totalTimeMinutes,
    averageSpeedKmh,
    maxSpeedKmh: accumulator.maxSpeedKmh,
    numberOfStops: accumulator.numberOfStops,
    longIdleEvents: accumulator.longIdleEvents,
    totalPointsAnalyzed: points.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates that a track has sufficient data for meaningful analysis.
 * 
 * @param track - GPS track response
 * @returns Object with validation result and reason
 */
export function validateTrack(
  track: GPSTrackResponse
): { valid: boolean; reason: string } {
  if (!track.vehicleId) {
    return { valid: false, reason: 'Missing vehicleId' };
  }

  if (!track.startTime || !track.endTime) {
    return { valid: false, reason: 'Missing time bounds' };
  }

  if (track.points.length === 0) {
    return { valid: false, reason: 'Empty track (no points)' };
  }

  if (track.points.length < 2) {
    return { valid: false, reason: 'Insufficient points (need at least 2 for segment analysis)' };
  }

  return { valid: true, reason: 'Track is valid' };
}

/**
 * Gets the operational time (moving + idle) as a ratio of total time.
 * Useful for understanding how much of the period had the ignition on.
 * 
 * @param metrics - Computed base metrics
 * @returns Operational ratio (0-1)
 */
export function getOperationalRatio(metrics: BaseVehicleMetrics): number {
  const operationalTime = metrics.totalMovingTimeMinutes + metrics.totalIdleTimeMinutes;
  return safeDivide(operationalTime, metrics.totalTimeMinutes);
}
