/**
 * Analytics Routes Integration Tests
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../index';

const app = createApp();

describe('Analytics Routes', () => {
  const validStart = '2026-02-18T00:00:00Z';
  const validEnd = '2026-02-19T00:00:00Z';

  describe('GET /api/analytics/vehicle/:id', () => {
    it('should return analytics for valid vehicle and date range', async () => {
      const response = await request(app)
        .get('/api/analytics/vehicle/v001')
        .query({ start: validStart, end: validEnd });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vehicleId', 'v001');
      expect(response.body.data).toHaveProperty('periodStart', validStart);
      expect(response.body.data).toHaveProperty('periodEnd', validEnd);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('costs');
    });

    it('should return metrics with expected structure', async () => {
      const response = await request(app)
        .get('/api/analytics/vehicle/v001')
        .query({ start: validStart, end: validEnd });

      const metrics = response.body.data.metrics;

      // Base metrics
      expect(metrics).toHaveProperty('totalDistanceKm');
      expect(metrics).toHaveProperty('totalMovingTimeMinutes');
      expect(metrics).toHaveProperty('totalIdleTimeMinutes');
      expect(metrics).toHaveProperty('averageSpeedKmh');
      expect(metrics).toHaveProperty('maxSpeedKmh');
      expect(metrics).toHaveProperty('numberOfStops');

      // Derived metrics
      expect(metrics).toHaveProperty('idleRatio');
      expect(metrics).toHaveProperty('aggressiveDrivingRatio');

      // Scores
      expect(metrics).toHaveProperty('efficiencyScore');
      expect(metrics).toHaveProperty('riskScore');
    });

    it('should return costs with expected structure', async () => {
      const response = await request(app)
        .get('/api/analytics/vehicle/v001')
        .query({ start: validStart, end: validEnd });

      const costs = response.body.data.costs;

      expect(costs).toHaveProperty('vehicleId', 'v001');
      expect(costs).toHaveProperty('dailyIdleCost');
      expect(costs).toHaveProperty('monthlyProjectedIdleCost');
      expect(costs).toHaveProperty('speedingRiskCost');
      expect(costs).toHaveProperty('annualProjectedLoss');
    });

    it('should return valid numeric values', async () => {
      const response = await request(app)
        .get('/api/analytics/vehicle/v001')
        .query({ start: validStart, end: validEnd });

      const metrics = response.body.data.metrics;

      // Efficiency score should be 0-100
      expect(metrics.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(metrics.efficiencyScore).toBeLessThanOrEqual(100);

      // Risk score should be 0-100
      expect(metrics.riskScore).toBeGreaterThanOrEqual(0);
      expect(metrics.riskScore).toBeLessThanOrEqual(100);

      // Idle ratio should be 0-1
      expect(metrics.idleRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.idleRatio).toBeLessThanOrEqual(1);

      // Costs should be non-negative
      expect(response.body.data.costs.dailyIdleCost).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 when date parameters are missing', async () => {
      const response = await request(app)
        .get('/api/analytics/vehicle/v001');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/analytics/vehicle/non-existent')
        .query({ start: validStart, end: validEnd });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/analytics/fleet', () => {
    it('should return fleet analytics for valid date range', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({ start: validStart, end: validEnd });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('periodStart', validStart);
      expect(response.body.data).toHaveProperty('periodEnd', validEnd);
      expect(response.body.data).toHaveProperty('fleetMetrics');
      expect(response.body.data).toHaveProperty('fleetCosts');
      expect(response.body.data).toHaveProperty('vehicleMetrics');
    });

    it('should return fleet metrics with expected structure', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({ start: validStart, end: validEnd });

      const fleetMetrics = response.body.data.fleetMetrics;

      expect(fleetMetrics).toHaveProperty('totalVehicles');
      expect(fleetMetrics).toHaveProperty('totalDistanceKm');
      expect(fleetMetrics).toHaveProperty('totalIdleTimeMinutes');
      expect(fleetMetrics).toHaveProperty('totalMovingTimeMinutes');
      expect(fleetMetrics).toHaveProperty('averageIdleRatio');
      expect(fleetMetrics).toHaveProperty('averageEfficiencyScore');
      expect(fleetMetrics).toHaveProperty('averageRiskScore');
      expect(fleetMetrics).toHaveProperty('vehiclesByEfficiency');
      expect(fleetMetrics).toHaveProperty('vehiclesByRisk');
      expect(fleetMetrics).toHaveProperty('topRiskVehicles');
    });

    it('should return fleet costs with expected structure', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({ start: validStart, end: validEnd });

      const fleetCosts = response.body.data.fleetCosts;

      expect(fleetCosts).toHaveProperty('totalDailyIdleCost');
      expect(fleetCosts).toHaveProperty('totalMonthlyProjectedIdleCost');
      expect(fleetCosts).toHaveProperty('totalRiskAdjustedAnnualCost');
      expect(fleetCosts).toHaveProperty('costByVehicle');
      expect(fleetCosts).toHaveProperty('highestCostVehicle');
    });

    it('should return vehicle rankings sorted correctly', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({ start: validStart, end: validEnd });

      const rankings = response.body.data.fleetMetrics.vehiclesByEfficiency;

      // Check rankings are numbered correctly
      for (let i = 0; i < rankings.length; i++) {
        expect(rankings[i].rank).toBe(i + 1);
      }

      // Check rankings are sorted by score descending
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i - 1].score).toBeGreaterThanOrEqual(rankings[i].score);
      }
    });

    it('should return top 3 risk vehicles', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({ start: validStart, end: validEnd });

      const topRisk = response.body.data.fleetMetrics.topRiskVehicles;

      expect(topRisk.length).toBeLessThanOrEqual(3);
      expect(topRisk.length).toBeGreaterThan(0);
    });

    it('should return vehicleMetrics array matching fleet count', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({ start: validStart, end: validEnd });

      const vehicleMetrics = response.body.data.vehicleMetrics;
      const totalVehicles = response.body.data.fleetMetrics.totalVehicles;

      expect(vehicleMetrics.length).toBe(totalVehicles);
    });

    it('should return 400 when date parameters are missing', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for date range exceeding 31 days', async () => {
      const response = await request(app)
        .get('/api/analytics/fleet')
        .query({
          start: '2026-01-01T00:00:00Z',
          end: '2026-02-15T00:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
