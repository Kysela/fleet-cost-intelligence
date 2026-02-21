/**
 * GPS API Response Types
 * 
 * These interfaces represent the data structures returned by the GPS tracking API.
 * All types are strictly defined - never assume undocumented fields.
 */

/**
 * A single GPS track point representing vehicle state at a moment in time.
 */
export interface GPSTrackPoint {
  /** Latitude in decimal degrees (-90 to 90) */
  readonly latitude: number;
  
  /** Longitude in decimal degrees (-180 to 180) */
  readonly longitude: number;
  
  /** Current speed in km/h (0 when stationary) */
  readonly speed: number;
  
  /** ISO 8601 timestamp (e.g., "2024-01-15T09:30:00Z") */
  readonly timestamp: string;
  
  /** True if engine/ignition is on */
  readonly ignitionOn: boolean;
}

/**
 * Historical track data for a vehicle over a time period.
 * Points are expected to be chronologically ordered (oldest first).
 */
export interface GPSTrackResponse {
  /** Unique vehicle identifier */
  readonly vehicleId: string;
  
  /** Start of the track period (ISO 8601) */
  readonly startTime: string;
  
  /** End of the track period (ISO 8601) */
  readonly endTime: string;
  
  /** Array of track points, chronologically ordered */
  readonly points: readonly GPSTrackPoint[];
}

/**
 * Vehicle metadata from the GPS system.
 */
export interface GPSVehicle {
  /** Unique vehicle identifier */
  readonly id: string;
  
  /** Human-readable vehicle name/label */
  readonly name: string;
  
  /** Vehicle license plate number */
  readonly licensePlate: string;
  
  /** Type of vehicle (e.g., "truck", "van", "car") */
  readonly vehicleType: string;
  
  /** Optional group/fleet identifier */
  readonly groupId?: string;
}

/**
 * Real-time position data for a vehicle.
 */
export interface GPSPosition {
  /** Unique vehicle identifier */
  readonly vehicleId: string;
  
  /** Current latitude in decimal degrees */
  readonly latitude: number;
  
  /** Current longitude in decimal degrees */
  readonly longitude: number;
  
  /** Current speed in km/h */
  readonly speed: number;
  
  /** Heading/direction in degrees (0-360, 0 = North) */
  readonly heading: number;
  
  /** ISO 8601 timestamp of this position reading */
  readonly timestamp: string;
  
  /** True if engine/ignition is currently on */
  readonly ignitionOn: boolean;
}
