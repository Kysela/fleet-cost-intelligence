/**
 * Type Definitions Barrel Export
 * 
 * Central export point for all type definitions used across the application.
 */

// GPS API types
export type {
  GPSTrackPoint,
  GPSTrackResponse,
  GPSVehicle,
  GPSPosition,
} from './gps.types';

// Analytics types
export type {
  GeoLocation,
  IdleEvent,
  BaseVehicleMetrics,
  DerivedVehicleMetrics,
  VehicleRanking,
  FleetMetrics,
  AnalyticsConfig,
  EfficiencyWeights,
  RiskWeights,
} from './analytics.types';

// Financial types
export type {
  FinancialConstants,
  VehicleCostEstimation,
  FleetCostEstimation,
  FinancialSummary,
} from './financial.types';

// API types
export type {
  ApiResponse,
  ApiErrorResponse,
  ApiResult,
  VehiclesListResponse,
  VehiclesLiveResponse,
  VehicleTracksQuery,
  VehicleTracksResponse,
  AnalyticsQuery,
  VehicleAnalyticsResponse,
  FleetAnalyticsResponse,
  ValidationErrorDetail,
  ValidationResult,
} from './api.types';

export { ERROR_CODES } from './api.types';
export type { ErrorCode } from './api.types';

// AI types
export type {
  AIInsightsRequest,
  AIInsightsResponse,
  TopRiskAssessment,
  AIRecommendation,
  RiskCategory,
  RiskSeverity,
  AIErrorResponse,
  AIValidationError,
  LLMClientConfig,
  LLMAPIResponse,
} from './ai.types';

export { AI_ERROR_CODES } from './ai.types';
export type { AIErrorCode } from './ai.types';
