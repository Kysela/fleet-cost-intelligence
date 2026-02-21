/**
 * Vehicle Routes
 * 
 * Handles vehicle-related endpoints:
 * - GET /api/vehicles - List all vehicles
 * - GET /api/vehicles/live - Get live positions
 * - GET /api/vehicles/:id/tracks - Get historical tracks
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  fetchVehiclesList,
  fetchLivePositions,
  fetchVehicleTrack,
} from '../services/vehicleService';
import { successResponse } from '../utils/apiResponse';
import {
  validateDateRange,
  requireRouteParam,
} from '../middleware/validateRequest';

const router = Router();

/**
 * GET /api/vehicles
 * Returns list of all vehicles in the fleet.
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await fetchVehiclesList();
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/vehicles/live
 * Returns current positions of all vehicles.
 */
router.get(
  '/live',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await fetchLivePositions();
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/vehicles/:id/tracks
 * Returns historical track data for a specific vehicle.
 * 
 * Query parameters:
 * - start: ISO 8601 date string (required)
 * - end: ISO 8601 date string (required)
 */
router.get(
  '/:id/tracks',
  requireRouteParam('id'),
  validateDateRange,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { start, end } = req.query;

      const data = await fetchVehicleTrack(
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

export default router;
