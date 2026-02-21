/**
 * Routes Barrel Export
 * 
 * Mounts all API routes under /api prefix.
 */

import { Router } from 'express';
import vehiclesRouter from './vehicles.routes';
import analyticsRouter from './analytics.routes';
import aiRouter from './ai.routes';

const router = Router();

// Mount route modules
router.use('/vehicles', vehiclesRouter);
router.use('/analytics', analyticsRouter);
router.use('/ai', aiRouter);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
