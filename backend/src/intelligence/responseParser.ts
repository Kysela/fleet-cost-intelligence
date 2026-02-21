/**
 * Response Parser
 * 
 * Parses and validates LLM responses against the expected schema.
 * Handles various response formats and provides detailed validation errors.
 */

import type {
  AIInsightsResponse,
  AIValidationError,
  RiskCategory,
  RiskSeverity,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VALID_RISK_CATEGORIES: readonly RiskCategory[] = [
  'IDLE_TIME',
  'SPEEDING',
  'INEFFICIENCY',
  'COST',
];

const VALID_RISK_SEVERITIES: readonly RiskSeverity[] = [
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL',
];

// ═══════════════════════════════════════════════════════════════════════════
// JSON EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Attempts to extract JSON from various response formats.
 * Handles markdown code blocks, extra whitespace, etc.
 */
export function extractJSON(response: string): string {
  let cleaned = response.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1]?.trim() ?? cleaned;
  }

  // Remove any leading/trailing text before/after JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  return cleaned;
}

/**
 * Safely parses JSON string.
 */
export function parseJSON(jsonString: string): {
  success: true;
  data: unknown;
} | {
  success: false;
  error: string;
} {
  try {
    const extracted = extractJSON(jsonString);
    const parsed = JSON.parse(extracted) as unknown;
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates a string field.
 */
function validateString(
  value: unknown,
  field: string,
  minLength: number = 1,
  maxLength: number = 10000
): AIValidationError | null {
  if (typeof value !== 'string') {
    return {
      field,
      message: `Expected string, got ${typeof value}`,
      received: value,
    };
  }

  if (value.length < minLength) {
    return {
      field,
      message: `String too short (min ${minLength} characters)`,
      received: value,
    };
  }

  if (value.length > maxLength) {
    return {
      field,
      message: `String too long (max ${maxLength} characters)`,
      received: `${value.substring(0, 50)}...`,
    };
  }

  return null;
}

/**
 * Validates a number field within range.
 */
function validateNumber(
  value: unknown,
  field: string,
  min: number,
  max: number
): AIValidationError | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return {
      field,
      message: `Expected number, got ${typeof value}`,
      received: value,
    };
  }

  if (value < min || value > max) {
    return {
      field,
      message: `Number out of range (${min}-${max})`,
      received: value,
    };
  }

  return null;
}

/**
 * Validates an enum field.
 */
function validateEnum<T extends string>(
  value: unknown,
  field: string,
  validValues: readonly T[]
): AIValidationError | null {
  if (typeof value !== 'string' || !validValues.includes(value as T)) {
    return {
      field,
      message: `Must be one of: ${validValues.join(', ')}`,
      received: value,
    };
  }

  return null;
}

/**
 * Validates an array field.
 */
function validateArray(
  value: unknown,
  field: string,
  minItems: number = 0,
  maxItems: number = 100
): AIValidationError | null {
  if (!Array.isArray(value)) {
    return {
      field,
      message: `Expected array, got ${typeof value}`,
      received: value,
    };
  }

  if (value.length < minItems) {
    return {
      field,
      message: `Array too short (min ${minItems} items)`,
      received: value,
    };
  }

  if (value.length > maxItems) {
    return {
      field,
      message: `Array too long (max ${maxItems} items)`,
      received: `[${value.length} items]`,
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates the topRisk object.
 */
function validateTopRisk(data: unknown): AIValidationError[] {
  const errors: AIValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({
      field: 'topRisk',
      message: 'Expected object',
      received: data,
    });
    return errors;
  }

  const risk = data as Record<string, unknown>;

  const categoryError = validateEnum(
    risk['category'],
    'topRisk.category',
    VALID_RISK_CATEGORIES
  );
  if (categoryError) errors.push(categoryError);

  const severityError = validateEnum(
    risk['severity'],
    'topRisk.severity',
    VALID_RISK_SEVERITIES
  );
  if (severityError) errors.push(severityError);

  const descError = validateString(risk['description'], 'topRisk.description', 10);
  if (descError) errors.push(descError);

  const vehiclesError = validateArray(risk['affectedVehicles'], 'topRisk.affectedVehicles');
  if (vehiclesError) errors.push(vehiclesError);

  return errors;
}

/**
 * Validates a single recommendation.
 */
function validateRecommendation(
  rec: unknown,
  index: number
): AIValidationError[] {
  const errors: AIValidationError[] = [];
  const prefix = `recommendations[${index}]`;

  if (!rec || typeof rec !== 'object') {
    errors.push({
      field: prefix,
      message: 'Expected object',
      received: rec,
    });
    return errors;
  }

  const r = rec as Record<string, unknown>;

  const priorityError = validateNumber(r['priority'], `${prefix}.priority`, 1, 10);
  if (priorityError) errors.push(priorityError);

  const actionError = validateString(r['action'], `${prefix}.action`, 10);
  if (actionError) errors.push(actionError);

  const impactError = validateString(r['expectedImpact'], `${prefix}.expectedImpact`, 5);
  if (impactError) errors.push(impactError);

  // targetVehicles can be array or "ALL"
  const targets = r['targetVehicles'];
  if (targets !== 'ALL' && !Array.isArray(targets)) {
    errors.push({
      field: `${prefix}.targetVehicles`,
      message: 'Must be array of vehicle IDs or "ALL"',
      received: targets,
    });
  }

  return errors;
}

/**
 * Validates the recommendations array.
 */
function validateRecommendations(data: unknown): AIValidationError[] {
  const errors: AIValidationError[] = [];

  const arrayError = validateArray(data, 'recommendations', 1, 5);
  if (arrayError) {
    errors.push(arrayError);
    return errors;
  }

  const recs = data as unknown[];
  for (let i = 0; i < recs.length; i++) {
    errors.push(...validateRecommendation(recs[i], i));
  }

  return errors;
}

/**
 * Validates the complete AIInsightsResponse schema.
 */
export function validateSchema(data: unknown): {
  valid: true;
  response: AIInsightsResponse;
} | {
  valid: false;
  errors: AIValidationError[];
} {
  const errors: AIValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Expected object', received: data }],
    };
  }

  const obj = data as Record<string, unknown>;

  // Validate executiveSummary
  const summaryError = validateString(obj['executiveSummary'], 'executiveSummary', 10, 500);
  if (summaryError) errors.push(summaryError);

  // Validate topRisk
  errors.push(...validateTopRisk(obj['topRisk']));

  // Validate costImpactExplanation
  const costError = validateString(
    obj['costImpactExplanation'],
    'costImpactExplanation',
    10,
    1000
  );
  if (costError) errors.push(costError);

  // Validate recommendations
  errors.push(...validateRecommendations(obj['recommendations']));

  // Validate fleetHealthScore
  const healthError = validateNumber(obj['fleetHealthScore'], 'fleetHealthScore', 0, 100);
  if (healthError) errors.push(healthError);

  // Validate priorityScore
  const priorityError = validateNumber(obj['priorityScore'], 'priorityScore', 0, 100);
  if (priorityError) errors.push(priorityError);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    response: obj as unknown as AIInsightsResponse,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse result type.
 */
export type ParseResult =
  | { success: true; data: AIInsightsResponse }
  | { success: false; code: 'INVALID_JSON' | 'SCHEMA_ERROR'; error: string; details?: AIValidationError[] };

/**
 * Parses and validates an LLM response.
 * 
 * @param rawResponse - Raw string response from LLM
 * @returns Validated AIInsightsResponse or error
 */
export function parseResponse(rawResponse: string): ParseResult {
  // Step 1: Parse JSON
  const jsonResult = parseJSON(rawResponse);

  if (!jsonResult.success) {
    return {
      success: false,
      code: 'INVALID_JSON',
      error: `Failed to parse JSON: ${jsonResult.error}`,
    };
  }

  // Step 2: Validate schema
  const schemaResult = validateSchema(jsonResult.data);

  if (!schemaResult.valid) {
    return {
      success: false,
      code: 'SCHEMA_ERROR',
      error: `Response failed schema validation: ${schemaResult.errors.length} error(s)`,
      details: schemaResult.errors,
    };
  }

  return {
    success: true,
    data: schemaResult.response,
  };
}
