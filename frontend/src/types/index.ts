/**
 * Frontend Type Definitions
 * 
 * Mirrors backend types for type safety across the stack.
 */

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GPSVehicle {
  readonly id: string;
  readonly name: string;
  readonly licensePlate: string;
  readonly vehicleType: string;
  readonly groupId?: string;
}

export interface GPSPosition {
  readonly vehicleId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly speed: number;
  readonly heading: number;
  readonly timestamp: string;
  readonly ignitionOn: boolean;
}

export interface GPSTrackPoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly speed: number;
  readonly timestamp: string;
  readonly ignitionOn: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IdleEvent {
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes: number;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

export interface DerivedVehicleMetrics {
  readonly vehicleId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalDistanceKm: number;
  readonly totalMovingTimeMinutes: number;
  readonly totalIdleTimeMinutes: number;
  readonly totalTimeMinutes: number;
  readonly averageSpeedKmh: number;
  readonly maxSpeedKmh: number;
  readonly numberOfStops: number;
  readonly longIdleEvents: readonly IdleEvent[];
  readonly totalPointsAnalyzed: number;
  readonly idleRatio: number;
  readonly aggressiveDrivingRatio: number;
  readonly timeOverSpeedThresholdMinutes: number;
  readonly efficiencyScore: number;
  readonly riskScore: number;
}

export interface VehicleRanking {
  readonly vehicleId: string;
  readonly vehicleName: string;
  readonly score: number;
  readonly rank: number;
}

export interface FleetMetrics {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalVehicles: number;
  readonly totalDistanceKm: number;
  readonly totalIdleTimeMinutes: number;
  readonly totalMovingTimeMinutes: number;
  readonly averageIdleRatio: number;
  readonly averageEfficiencyScore: number;
  readonly averageRiskScore: number;
  readonly vehiclesByEfficiency: readonly VehicleRanking[];
  readonly vehiclesByRisk: readonly VehicleRanking[];
  readonly topRiskVehicles: readonly VehicleRanking[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface VehicleCostEstimation {
  readonly vehicleId: string;
  readonly dailyIdleCost: number;
  readonly monthlyProjectedIdleCost: number;
  readonly speedingRiskCost: number;
  readonly dailyTotalLoss: number;
  readonly monthlyProjectedLoss: number;
  readonly annualProjectedLoss: number;
}

export interface FleetCostEstimation {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalDailyIdleCost: number;
  readonly totalMonthlyProjectedIdleCost: number;
  readonly totalRiskAdjustedAnnualCost: number;
  readonly costByVehicle: readonly VehicleCostEstimation[];
  readonly highestCostVehicle: VehicleCostEstimation | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type RiskCategory = 'IDLE_TIME' | 'SPEEDING' | 'INEFFICIENCY' | 'COST';
export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface TopRiskAssessment {
  readonly category: RiskCategory;
  readonly severity: RiskSeverity;
  readonly description: string;
  readonly affectedVehicles: readonly string[];
}

export interface AIRecommendation {
  readonly priority: number;
  readonly action: string;
  readonly expectedImpact: string;
  readonly targetVehicles: readonly string[] | 'ALL';
}

export interface AIInsightsResponse {
  readonly executiveSummary: string;
  readonly topRisk: TopRiskAssessment;
  readonly costImpactExplanation: string;
  readonly recommendations: readonly AIRecommendation[];
  readonly fleetHealthScore: number;
  readonly priorityScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: string;
}

export interface ApiErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ═══════════════════════════════════════════════════════════════════════════
// DATE RANGE
// ═══════════════════════════════════════════════════════════════════════════

export interface DateRange {
  start: string;
  end: string;
}
