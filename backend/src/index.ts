/**
 * Fleet Intelligence Backend
 * 
 * Express server entry point.
 * Configures middleware, routes, and error handling.
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { env, validateEnvironment } from './config';
import { initializeRedis, closeRedis } from './config/redis';
import routes from './routes';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
} from './middleware';

/**
 * Creates and configures the Express application.
 */
export function createApp(): Express {
  const app = express();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Compression middleware (gzip/brotli)
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  }));

  // Helmet for security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Allow Railway domains, localhost, and development
      const allowedPatterns = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:4173',
        /\.railway\.app$/,
        /\.up\.railway\.app$/,
      ];

      const isAllowed = allowedPatterns.some((pattern) => {
        if (typeof pattern === 'string') {
          return origin === pattern;
        }
        return pattern.test(origin);
      });

      if (isAllowed || env.isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSING MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGGING MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════
  
  app.use(requestLogger);

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Mount all routes under /api
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Fleet Intelligence API',
      version: '1.0.0',
      documentation: '/api/health',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Starts the server.
 */
async function startServer(): Promise<void> {
  try {
    // Validate environment variables
    validateEnvironment();

    // Initialize Redis (optional, falls back to node-cache)
    await initializeRedis();

    const app = createApp();

    // Start listening
    app.listen(env.port, () => {
      console.log('═══════════════════════════════════════════════════');
      console.log('  Fleet Intelligence API');
      if (env.demoMode) {
        console.log('  🎭 DEMO MODE - Using Mock Data');
      }
      console.log('═══════════════════════════════════════════════════');
      console.log(`  Environment: ${env.nodeEnv}`);
      console.log(`  Port: ${env.port}`);
      console.log(`  GPS API: ${env.gpsApiBaseUrl}`);
      if (env.demoMode) {
        console.log('  Demo Mode: Enabled (no real GPS API key needed)');
      }
      console.log('═══════════════════════════════════════════════════');
      console.log('  Endpoints:');
      console.log('    GET  /api/health');
      console.log('    GET  /api/vehicles');
      console.log('    GET  /api/vehicles/live');
      console.log('    GET  /api/vehicles/:id/tracks?start=&end=');
      console.log('    GET  /api/analytics/vehicle/:id?start=&end=');
      console.log('    GET  /api/analytics/fleet?start=&end=');
      console.log('    POST /api/ai/insights');
      console.log('    GET  /api/ai/status');
      console.log('═══════════════════════════════════════════════════');
      console.log(`  Server ready at http://localhost:${env.port}`);
      console.log('═══════════════════════════════════════════════════');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, closing Redis connection...');
      await closeRedis();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
// Check for direct execution (not imported as a module)
const isMainModule = require.main === module;
if (isMainModule) {
  startServer();
}

export default createApp;
