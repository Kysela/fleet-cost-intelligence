/**
 * Analytics Types
 * 
 * Interfaces for computed metrics derived from GPS track data.
 * All scores use 0-100 scale unless otherwise noted.
 */

/**
 * Geographic coordinate pair.
 */
export interface GeoLocation {
  readonly lat: number;
  readonly lng: number;
}

/**
 * An idle event where the vehicle was stationary with engine running.
 * Only events exceeding the configured threshold are captured.
 */
export interface IdleEvent {
  /** Start time of idle period (ISO 8601) */
  readonly startTime: string;
  
  /** End time of idle period (ISO 8601) */
  readonly endTime: string;
  
  /** Duration of idle event in minutes */
  readonly durationMinutes: number;
  
  /** Location where idle occurred */
  readonly location: GeoLocation;
}

/**
 * Base metrics computed directly from GPS track data.
 * These are the raw, deterministic values before any scoring.
 */
export interface BaseVehicleMetrics {
  /** Vehicle identifier */
  readonly vehicleId: string;
  
  /** Start of analysis period (ISO 8601) */
  readonly periodStart: string;
  
  /** End of analysis period (ISO 8601) */
  readonly periodEnd: string;
  
  /** Total distance traveled in kilometers */
  readonly totalDistanceKm: number;
  
  /** Total time spent moving (speed > idle threshold) in minutes */
  readonly totalMovingTimeMinutes: number;
  
  /** Total time spent idle (speed < threshold, ignition on) in minutes */
  readonly totalIdleTimeMinutes: number;
  
  /** Total tracked time in minutes (moving + idle + off) */
  readonly totalTimeMinutes: number;
  
  /** Average speed during movement in km/h */
  readonly averageSpeedKmh: number;
  
  /** Maximum recorded speed in km/h */
  readonly maxSpeedKmh: number;
  
  /** Number of distinct stops (transitions from moving to idle/off) */
  readonly numberOfStops: number;
  
  /** Idle events exceeding the long idle threshold */
  readonly longIdleEvents: readonly IdleEvent[];
  
  /** Total number of GPS track points analyzed */
  readonly totalPointsAnalyzed: number;
}

/**
 * Derived metrics calculated from base metrics.
 * Includes ratios and scores.
 */
export interface DerivedVehicleMetrics extends BaseVehicleMetrics {
  /** 
   * Ratio of idle time to total operational time (0-1).
   * Operational time = moving time + idle time (excludes ignition off).
   */
  readonly idleRatio: number;
  
  /** 
   * Ratio of time spent over speed threshold to total moving time (0-1).
   * Higher values indicate more aggressive/risky driving.
   */
  readonly aggressiveDrivingRatio: number;
  
  /** 
   * Time spent over speed threshold in minutes.
   */
  readonly timeOverSpeedThresholdMinutes: number;
  
  /** 
   * Efficiency score (0-100, higher = better).
   * Based on idle ratio, utilization, and operational patterns.
   */
  readonly efficiencyScore: number;
  
  /** 
   * Risk score (0-100, higher = more risk).
   * Based on speeding behavior, idle patterns, and driving consistency.
   */
  readonly riskScore: number;
}

/**
 * Ranking entry for a vehicle in fleet comparisons.
 */
export interface VehicleRanking {
  readonly vehicleId: string;
  readonly vehicleName: string;
  readonly score: number;
  readonly rank: number;
}

/**
 * Aggregated metrics for the entire fleet.
 */
export interface FleetMetrics {
  /** Start of analysis period (ISO 8601) */
  readonly periodStart: string;
  
  /** End of analysis period (ISO 8601) */
  readonly periodEnd: string;
  
  /** Number of vehicles analyzed */
  readonly totalVehicles: number;
  
  /** Sum of all vehicle distances in km */
  readonly totalDistanceKm: number;
  
  /** Sum of all idle time in minutes */
  readonly totalIdleTimeMinutes: number;
  
  /** Sum of all moving time in minutes */
  readonly totalMovingTimeMinutes: number;
  
  /** Fleet-wide average idle ratio (0-1) */
  readonly averageIdleRatio: number;
  
  /** Fleet-wide average efficiency score (0-100) */
  readonly averageEfficiencyScore: number;
  
  /** Fleet-wide average risk score (0-100) */
  readonly averageRiskScore: number;
  
  /** Vehicles ranked by efficiency (best first) */
  readonly vehiclesByEfficiency: readonly VehicleRanking[];
  
  /** Vehicles ranked by risk (highest risk first) */
  readonly vehiclesByRisk: readonly VehicleRanking[];
  
  /** Top 3 highest risk vehicles */
  readonly topRiskVehicles: readonly VehicleRanking[];
}

/**
 * Configuration for analytics calculations.
 * All thresholds are configurable to allow tuning.
 */
export interface AnalyticsConfig {
  /** Speed below which vehicle is considered idle (km/h). Default: 2 */
  readonly idleSpeedThresholdKmh: number;
  
  /** Speed above which driving is considered aggressive/risky (km/h). Default: 110 */
  readonly speedingThresholdKmh: number;
  
  /** Minimum duration for an idle event to be flagged (minutes). Default: 10 */
  readonly longIdleThresholdMinutes: number;
  
  /** Expected km per hour of operation for efficiency baseline */
  readonly expectedKmPerHour: number;
  
  /** Penalty factor for stops per km in efficiency calculation */
  readonly stopPenaltyFactor: number;
  
  /** Factor for converting idle frequency to risk score */
  readonly idleRiskFactor: number;
  
  /** Factor for speed variance in erratic driving detection */
  readonly varianceFactor: number;
}

/**
 * Weight configuration for efficiency score calculation.
 * All weights should sum to 1.0.
 */
export interface EfficiencyWeights {
  /** Weight for idle ratio component (lower idle = higher score) */
  readonly idleRatio: number;
  
  /** Weight for utilization rate component */
  readonly utilizationRate: number;
  
  /** Weight for distance efficiency component */
  readonly distanceEfficiency: number;
  
  /** Weight for stop efficiency component */
  readonly stopEfficiency: number;
}

/**
 * Weight configuration for risk score calculation.
 * All weights should sum to 1.0.
 */
export interface RiskWeights {
  /** Weight for speeding ratio component */
  readonly speedingRatio: number;
  
  /** Weight for long idle frequency component */
  readonly longIdleFrequency: number;
  
  /** Weight for max speed severity component */
  readonly maxSpeedSeverity: number;
  
  /** Weight for erratic driving pattern component */
  readonly erraticPattern: number;
}
