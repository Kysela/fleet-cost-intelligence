/**
 * AI Routes
 * 
 * Handles AI intelligence endpoints:
 * - POST /api/ai/insights - Generate AI-powered fleet insights
 */

import { Router, Request, Response, NextFunction } from 'express';
import { generateInsights, isAIAvailable } from '../intelligence';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { validationError } from '../middleware/errorHandler';
import type { AIInsightsRequest, DerivedVehicleMetrics, FleetMetrics, FleetCostEstimation } from '../types';

const router = Router();

/**
 * Validates the AI insights request body.
 */
function validateInsightsRequest(body: unknown): {
  valid: true;
  request: AIInsightsRequest;
} | {
  valid: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const data = body as Record<string, unknown>;

  // Validate vehicleMetrics
  if (!Array.isArray(data['vehicleMetrics'])) {
    return { valid: false, error: 'vehicleMetrics must be an array' };
  }

  if (data['vehicleMetrics'].length === 0) {
    return { valid: false, error: 'vehicleMetrics cannot be empty' };
  }

  // Validate fleetMetrics
  if (!data['fleetMetrics'] || typeof data['fleetMetrics'] !== 'object') {
    return { valid: false, error: 'fleetMetrics must be an object' };
  }

  // Validate fleetCosts
  if (!data['fleetCosts'] || typeof data['fleetCosts'] !== 'object') {
    return { valid: false, error: 'fleetCosts must be an object' };
  }

  return {
    valid: true,
    request: {
      vehicleMetrics: data['vehicleMetrics'] as DerivedVehicleMetrics[],
      fleetMetrics: data['fleetMetrics'] as FleetMetrics,
      fleetCosts: data['fleetCosts'] as FleetCostEstimation,
    },
  };
}

/**
 * POST /api/ai/insights
 * Generates AI-powered fleet intelligence insights.
 * 
 * Request body:
 * {
 *   vehicleMetrics: DerivedVehicleMetrics[],
 *   fleetMetrics: FleetMetrics,
 *   fleetCosts: FleetCostEstimation
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     insights: AIInsightsResponse,
 *     source: 'llm' | 'fallback'
 *   }
 * }
 */
router.post(
  '/insights',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validation = validateInsightsRequest(req.body);

      if (!validation.valid) {
        return next(validationError(validation.error));
      }

      // Check query param for fallback behavior
      const useFallbackOnError = req.query['fallback'] !== 'false';

      // Generate insights
      const result = await generateInsights(validation.request, useFallbackOnError);

      if (!result.success) {
        // Return AI error with appropriate status
        const status = result.error.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
        res.status(status).json(errorResponse(
          result.error.code as never,
          result.error.message,
          result.error.details
        ));
        return;
      }

      // Return success
      res.json(successResponse({
        insights: result.data,
        source: result.source,
      }));

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ai/status
 * Returns the AI service status.
 */
router.get(
  '/status',
  (_req: Request, res: Response): void => {
    res.json(successResponse({
      available: isAIAvailable(),
      message: isAIAvailable()
        ? 'AI service is configured and available'
        : 'AI service is not configured. Set AI_API_KEY to enable.',
    }));
  }
);

export default router;
