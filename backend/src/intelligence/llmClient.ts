/**
 * LLM Client
 * 
 * Handles communication with the LLM API (OpenAI-compatible).
 * Includes timeout protection and error handling.
 */

import axios, { AxiosError } from 'axios';
import { env } from '../config/environment';
import type { LLMAPIResponse, LLMClientConfig } from '../types';
import { SYSTEM_PROMPT } from './promptBuilder';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LLM-specific error with categorization.
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'TIMEOUT'
      | 'API_ERROR'
      | 'NOT_CONFIGURED'
      | 'EMPTY_RESPONSE'
      | 'RATE_LIMITED',
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets the LLM client configuration from environment.
 */
export function getLLMConfig(): LLMClientConfig {
  return {
    apiKey: env.aiApiKey,
    baseUrl: env.aiApiBaseUrl,
    model: env.aiModel,
    temperature: env.aiTemperature,
    maxTokens: env.aiMaxTokens,
    timeout: env.aiTimeout,
  };
}

/**
 * Checks if the LLM is configured.
 */
export function isLLMConfigured(): boolean {
  return env.aiConfigured;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CALL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calls the LLM API with the given prompt.
 * 
 * @param prompt - The user prompt to send
 * @param config - Optional config override
 * @returns The raw response content from the LLM
 * @throws LLMError on failure
 */
export async function callLLM(
  prompt: string,
  config?: Partial<LLMClientConfig>
): Promise<string> {
  const effectiveConfig = {
    ...getLLMConfig(),
    ...config,
  };

  // Check if API is configured
  if (!effectiveConfig.apiKey || effectiveConfig.apiKey === 'your-openai-api-key-here') {
    throw new LLMError(
      'AI API key not configured',
      'NOT_CONFIGURED'
    );
  }

  const endpoint = `${effectiveConfig.baseUrl}/chat/completions`;

  try {
    const response = await axios.post<LLMAPIResponse>(
      endpoint,
      {
        model: effectiveConfig.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: effectiveConfig.temperature,
        max_tokens: effectiveConfig.maxTokens,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveConfig.apiKey}`,
        },
        timeout: effectiveConfig.timeout,
      }
    );

    // Extract content from response
    const content = response.data.choices[0]?.message?.content;

    if (!content || content.trim() === '') {
      throw new LLMError(
        'LLM returned empty response',
        'EMPTY_RESPONSE'
      );
    }

    return content;
  } catch (error) {
    // Handle known error types
    if (error instanceof LLMError) {
      throw error;
    }

    if (error instanceof AxiosError) {
      // Timeout
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new LLMError(
          'LLM request timed out',
          'TIMEOUT'
        );
      }

      // Rate limiting
      if (error.response?.status === 429) {
        throw new LLMError(
          'LLM rate limit exceeded',
          'RATE_LIMITED',
          429
        );
      }

      // Other API errors
      if (error.response) {
        const message = error.response.data?.error?.message ?? error.message;
        throw new LLMError(
          `LLM API error: ${message}`,
          'API_ERROR',
          error.response.status
        );
      }

      // Network errors
      throw new LLMError(
        `LLM request failed: ${error.message}`,
        'API_ERROR'
      );
    }

    // Unknown errors
    throw new LLMError(
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      'API_ERROR'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE INFO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extracts token usage from an LLM response.
 * Useful for monitoring costs.
 */
export function extractUsage(response: LLMAPIResponse): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null {
  if (!response.usage) {
    return null;
  }

  return {
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    totalTokens: response.usage.total_tokens,
  };
}
