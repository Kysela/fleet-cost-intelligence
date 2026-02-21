/**
 * Intelligence Module
 * 
 * Main entry point for AI-powered fleet insights.
 * Orchestrates prompt building, LLM calls, and response parsing.
 */

import { buildPrompt, validateRequest } from './promptBuilder';
import { callLLM, isLLMConfigured, LLMError } from './llmClient';
import { parseResponse } from './responseParser';
import { generateFallbackInsights } from './fallbackGenerator';
import type {
  AIInsightsRequest,
  AIInsightsResponse,
  AIErrorResponse,
  AI_ERROR_CODES,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of AI insights generation.
 */
export type InsightsResult =
  | { success: true; data: AIInsightsResponse; source: 'llm' | 'fallback' }
  | { success: false; error: AIErrorResponse };

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates AI-powered insights from fleet metrics.
 * 
 * Flow:
 * 1. Validate request
 * 2. Build prompt from metrics
 * 3. Call LLM
 * 4. Parse and validate response
 * 5. Return validated insights or fallback
 * 
 * @param request - Pre-computed fleet metrics (never raw GPS data)
 * @param useFallbackOnError - If true, returns fallback insights on LLM failure
 * @returns AI insights or error
 */
export async function generateInsights(
  request: AIInsightsRequest,
  useFallbackOnError: boolean = true
): Promise<InsightsResult> {
  // Step 1: Validate request
  const validation = validateRequest(request);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'AI_SCHEMA_ERROR',
        message: validation.error ?? 'Invalid request',
      },
    };
  }

  // Step 2: Check if LLM is configured
  if (!isLLMConfigured()) {
    if (useFallbackOnError) {
      console.warn('[AI] LLM not configured, using fallback insights');
      return {
        success: true,
        data: generateFallbackInsights(request),
        source: 'fallback',
      };
    }

    return {
      success: false,
      error: {
        code: 'AI_NOT_CONFIGURED',
        message: 'AI API key not configured. Set AI_API_KEY in environment.',
      },
    };
  }

  try {
    // Step 3: Build prompt
    const prompt = buildPrompt(request);

    // Step 4: Call LLM
    const rawResponse = await callLLM(prompt);

    // Step 5: Parse and validate response
    const parseResult = parseResponse(rawResponse);

    if (!parseResult.success) {
      console.error(`[AI] Parse error: ${parseResult.error}`, parseResult.details);

      if (useFallbackOnError) {
        console.warn('[AI] Using fallback due to parse error');
        return {
          success: true,
          data: generateFallbackInsights(request),
          source: 'fallback',
        };
      }

      const errorCode = parseResult.code === 'INVALID_JSON'
        ? 'AI_INVALID_RESPONSE'
        : 'AI_SCHEMA_ERROR';

      return {
        success: false,
        error: {
          code: errorCode,
          message: parseResult.error,
          details: parseResult.details,
        },
      };
    }

    // Success!
    return {
      success: true,
      data: parseResult.data,
      source: 'llm',
    };

  } catch (error) {
    // Handle LLM errors
    console.error('[AI] LLM error:', error);

    if (useFallbackOnError) {
      console.warn('[AI] Using fallback due to LLM error');
      return {
        success: true,
        data: generateFallbackInsights(request),
        source: 'fallback',
      };
    }

    if (error instanceof LLMError) {
      const codeMap: Record<string, typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES]> = {
        TIMEOUT: 'AI_TIMEOUT',
        NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
        EMPTY_RESPONSE: 'AI_EMPTY_RESPONSE',
        API_ERROR: 'AI_API_ERROR',
        RATE_LIMITED: 'AI_API_ERROR',
      };

      return {
        success: false,
        error: {
          code: codeMap[error.code] ?? 'AI_API_ERROR',
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'AI_API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Generates insights using only the fallback generator (no LLM).
 * Useful for testing or when LLM is intentionally bypassed.
 */
export function generateFallback(request: AIInsightsRequest): InsightsResult {
  const validation = validateRequest(request);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'AI_SCHEMA_ERROR',
        message: validation.error ?? 'Invalid request',
      },
    };
  }

  return {
    success: true,
    data: generateFallbackInsights(request),
    source: 'fallback',
  };
}

/**
 * Checks if the AI service is available.
 */
export function isAIAvailable(): boolean {
  return isLLMConfigured();
}

// Re-export types and utilities
export { buildPrompt, validateRequest } from './promptBuilder';
export { callLLM, isLLMConfigured, LLMError } from './llmClient';
export { parseResponse, extractJSON, validateSchema } from './responseParser';
export { generateFallbackInsights } from './fallbackGenerator';
