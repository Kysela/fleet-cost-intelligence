/**
 * AI Routes Integration Tests
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../index';
import type { DerivedVehicleMetrics, FleetMetrics, FleetCostEstimation } from '../../types';

const app = createApp();

describe('AI Routes', () => {
  // Test fixtures
  const createMockMetrics = (id: string): DerivedVehicleMetrics => ({
    vehicleId: id,
    periodStart: '2026-02-18T00:00:00Z',
    periodEnd: '2026-02-19T00:00:00Z',
    totalDistanceKm: 150,
    totalMovingTimeMinutes: 360,
    totalIdleTimeMinutes: 90,
    totalTimeMinutes: 480,
    averageSpeedKmh: 25,
    maxSpeedKmh: 85,
    numberOfStops: 12,
    longIdleEvents: [],
    totalPointsAnalyzed: 500,
    idleRatio: 0.2,
    aggressiveDrivingRatio: 0.08,
    timeOverSpeedThresholdMinutes: 20,
    efficiencyScore: 70,
    riskScore: 25,
  });

  const createMockFleetMetrics = (): FleetMetrics => ({
    periodStart: '2026-02-18T00:00:00Z',
    periodEnd: '2026-02-19T00:00:00Z',
    totalVehicles: 3,
    totalDistanceKm: 450,
    totalIdleTimeMinutes: 270,
    totalMovingTimeMinutes: 1080,
    averageIdleRatio: 0.2,
    averageEfficiencyScore: 70,
    averageRiskScore: 25,
    vehiclesByEfficiency: [
      { vehicleId: 'v001', vehicleName: 'v001', score: 75, rank: 1 },
      { vehicleId: 'v002', vehicleName: 'v002', score: 70, rank: 2 },
      { vehicleId: 'v003', vehicleName: 'v003', score: 65, rank: 3 },
    ],
    vehiclesByRisk: [
      { vehicleId: 'v003', vehicleName: 'v003', score: 30, rank: 1 },
      { vehicleId: 'v002', vehicleName: 'v002', score: 25, rank: 2 },
      { vehicleId: 'v001', vehicleName: 'v001', score: 20, rank: 3 },
    ],
    topRiskVehicles: [
      { vehicleId: 'v003', vehicleName: 'v003', score: 30, rank: 1 },
      { vehicleId: 'v002', vehicleName: 'v002', score: 25, rank: 2 },
    ],
  });

  const createMockFleetCosts = (): FleetCostEstimation => ({
    periodStart: '2026-02-18T00:00:00Z',
    periodEnd: '2026-02-19T00:00:00Z',
    totalDailyIdleCost: 30.00,
    totalMonthlyProjectedIdleCost: 660,
    totalRiskAdjustedAnnualCost: 8500,
    costByVehicle: [],
    highestCostVehicle: {
      vehicleId: 'v003',
      dailyIdleCost: 12.00,
      monthlyProjectedIdleCost: 264,
      speedingRiskCost: 150,
      dailyTotalLoss: 12.00,
      monthlyProjectedLoss: 264,
      annualProjectedLoss: 3200,
    },
  });

  const createValidRequestBody = () => ({
    vehicleMetrics: [
      createMockMetrics('v001'),
      createMockMetrics('v002'),
      createMockMetrics('v003'),
    ],
    fleetMetrics: createMockFleetMetrics(),
    fleetCosts: createMockFleetCosts(),
  });

  describe('POST /api/ai/insights', () => {
    it('should return fallback insights when LLM not configured', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send(createValidRequestBody())
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('insights');
      expect(response.body.data).toHaveProperty('source', 'fallback');
    });

    it('should return insights with valid structure', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send(createValidRequestBody())
        .set('Content-Type', 'application/json');

      const insights = response.body.data.insights;

      expect(insights).toHaveProperty('executiveSummary');
      expect(insights).toHaveProperty('topRisk');
      expect(insights).toHaveProperty('costImpactExplanation');
      expect(insights).toHaveProperty('recommendations');
      expect(insights).toHaveProperty('fleetHealthScore');
      expect(insights).toHaveProperty('priorityScore');
    });

    it('should return topRisk with valid structure', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send(createValidRequestBody())
        .set('Content-Type', 'application/json');

      const topRisk = response.body.data.insights.topRisk;

      expect(topRisk).toHaveProperty('category');
      expect(topRisk).toHaveProperty('severity');
      expect(topRisk).toHaveProperty('description');
      expect(topRisk).toHaveProperty('affectedVehicles');

      expect(['IDLE_TIME', 'SPEEDING', 'INEFFICIENCY', 'COST']).toContain(topRisk.category);
      expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(topRisk.severity);
    });

    it('should return recommendations array', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send(createValidRequestBody())
        .set('Content-Type', 'application/json');

      const recommendations = response.body.data.insights.recommendations;

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThanOrEqual(1);
      expect(recommendations.length).toBeLessThanOrEqual(5);

      const firstRec = recommendations[0];
      expect(firstRec).toHaveProperty('priority');
      expect(firstRec).toHaveProperty('action');
      expect(firstRec).toHaveProperty('expectedImpact');
      expect(firstRec).toHaveProperty('targetVehicles');
    });

    it('should return scores within valid range', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send(createValidRequestBody())
        .set('Content-Type', 'application/json');

      const insights = response.body.data.insights;

      expect(insights.fleetHealthScore).toBeGreaterThanOrEqual(0);
      expect(insights.fleetHealthScore).toBeLessThanOrEqual(100);
      expect(insights.priorityScore).toBeGreaterThanOrEqual(0);
      expect(insights.priorityScore).toBeLessThanOrEqual(100);
    });

    it('should return 400 when vehicleMetrics is missing', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send({
          fleetMetrics: createMockFleetMetrics(),
          fleetCosts: createMockFleetCosts(),
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when vehicleMetrics is empty', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send({
          vehicleMetrics: [],
          fleetMetrics: createMockFleetMetrics(),
          fleetCosts: createMockFleetCosts(),
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when fleetMetrics is missing', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send({
          vehicleMetrics: [createMockMetrics('v001')],
          fleetCosts: createMockFleetCosts(),
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when fleetCosts is missing', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send({
          vehicleMetrics: [createMockMetrics('v001')],
          fleetMetrics: createMockFleetMetrics(),
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty request body', async () => {
      const response = await request(app)
        .post('/api/ai/insights')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ai/status', () => {
    it('should return AI status', async () => {
      const response = await request(app).get('/api/ai/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('message');
      expect(typeof response.body.data.available).toBe('boolean');
    });

    it('should indicate AI is not configured without API key', async () => {
      const response = await request(app).get('/api/ai/status');

      // In test environment without AI_API_KEY, should be not available
      expect(response.body.data.available).toBe(false);
      expect(response.body.data.message).toContain('not configured');
    });
  });
});
