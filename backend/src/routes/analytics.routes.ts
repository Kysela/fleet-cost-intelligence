/**
 * Analytics Routes
 * 
 * Handles analytics-related endpoints:
 * - GET /api/analytics/vehicle/:id - Vehicle analytics
 * - GET /api/analytics/fleet - Fleet-wide analytics
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  getVehicleAnalytics,
  getFleetAnalytics,
} from '../services/analyticsService';
import { successResponse } from '../utils/apiResponse';
import {
  validateDateRange,
  requireRouteParam,
} from '../middleware/validateRequest';

const router = Router();

/**
 * GET /api/analytics/vehicle/:id
 * Returns computed analytics for a specific vehicle.
 * 
 * Query parameters:
 * - start: ISO 8601 date string (required)
 * - end: ISO 8601 date string (required)
 * 
 * Response includes:
 * - Base metrics (distance, time, speed, stops)
 * - Derived metrics (idle ratio, aggressive driving ratio)
 * - Efficiency score
 * - Risk score
 * - Cost estimations
 */
router.get(
  '/vehicle/:id',
  requireRouteParam('id'),
  validateDateRange,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { start, end } = req.query;

      const data = await getVehicleAnalytics(
        id as string,
        start as string,
        end as string
      );

      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/fleet
 * Returns computed analytics for the entire fleet.
 * 
 * Query parameters:
 * - start: ISO 8601 date string (required)
 * - end: ISO 8601 date string (required)
 * 
 * Response includes:
 * - Fleet-wide aggregated metrics
 * - Vehicle efficiency rankings
 * - Vehicle risk rankings
 * - Top risk vehicles
 * - Fleet cost totals
 * - Individual vehicle metrics array
 */
router.get(
  '/fleet',
  validateDateRange,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { start, end } = req.query;

      const data = await getFleetAnalytics(
        start as string,
        end as string
      );

      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
