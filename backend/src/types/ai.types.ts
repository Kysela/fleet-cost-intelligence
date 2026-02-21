/**
 * AI Intelligence Layer Types
 * 
 * Defines the contract for AI insights request and response.
 */

import type {
  DerivedVehicleMetrics,
  FleetMetrics,
  FleetCostEstimation,
} from './index';

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for AI insights generation.
 * Contains pre-computed metrics only — never raw GPS data.
 */
export interface AIInsightsRequest {
  readonly vehicleMetrics: readonly DerivedVehicleMetrics[];
  readonly fleetMetrics: FleetMetrics;
  readonly fleetCosts: FleetCostEstimation;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Risk categories identified by AI.
 */
export type RiskCategory = 'IDLE_TIME' | 'SPEEDING' | 'INEFFICIENCY' | 'COST';

/**
 * Severity levels for risks.
 */
export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

/**
 * Top risk identified in the fleet.
 */
export interface TopRiskAssessment {
  readonly category: RiskCategory;
  readonly severity: RiskSeverity;
  readonly description: string;
  readonly affectedVehicles: readonly string[];
}

/**
 * Single recommendation from AI.
 */
export interface AIRecommendation {
  readonly priority: number;
  readonly action: string;
  readonly expectedImpact: string;
  readonly targetVehicles: readonly string[] | 'ALL';
}

/**
 * Complete AI insights response.
 */
export interface AIInsightsResponse {
  readonly executiveSummary: string;
  readonly topRisk: TopRiskAssessment;
  readonly costImpactExplanation: string;
  readonly recommendations: readonly AIRecommendation[];
  readonly fleetHealthScore: number;
  readonly priorityScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI-specific error codes.
 */
export const AI_ERROR_CODES = {
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  AI_SCHEMA_ERROR: 'AI_SCHEMA_ERROR',
  AI_API_ERROR: 'AI_API_ERROR',
  AI_EMPTY_RESPONSE: 'AI_EMPTY_RESPONSE',
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
} as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

/**
 * AI error response structure.
 */
export interface AIErrorResponse {
  readonly code: AIErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * Validation error detail for schema failures.
 */
export interface AIValidationError {
  readonly field: string;
  readonly message: string;
  readonly received?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// LLM CLIENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for LLM client.
 */
export interface LLMClientConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly timeout: number;
}

/**
 * LLM API response structure (OpenAI-compatible).
 */
export interface LLMAPIResponse {
  readonly id: string;
  readonly choices: readonly {
    readonly message: {
      readonly content: string;
    };
    readonly finish_reason: string;
  }[];
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
}
