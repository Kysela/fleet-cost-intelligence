/**
 * Fallback Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateFallbackInsights } from '../fallbackGenerator';
import type { AIInsightsRequest, DerivedVehicleMetrics, FleetMetrics, FleetCostEstimation } from '../../types';

describe('Fallback Generator', () => {
  // Test fixtures
  const createMockMetrics = (overrides: Partial<DerivedVehicleMetrics> = {}): DerivedVehicleMetrics => ({
    vehicleId: 'v001',
    periodStart: '2026-02-18T00:00:00Z',
    periodEnd: '2026-02-19T00:00:00Z',
    totalDistanceKm: 100,
    totalMovingTimeMinutes: 300,
    totalIdleTimeMinutes: 60,
    totalTimeMinutes: 480,
    averageSpeedKmh: 20,
    maxSpeedKmh: 80,
    numberOfStops: 10,
    longIdleEvents: [],
    totalPointsAnalyzed: 500,
    idleRatio: 0.25,
    aggressiveDrivingRatio: 0.05,
    timeOverSpeedThresholdMinutes: 15,
    efficiencyScore: 65,
    riskScore: 30,
    ...overrides,
  });

  const createMockFleetMetrics = (vehicles: DerivedVehicleMetrics[]): FleetMetrics => ({
    periodStart: '2026-02-18T00:00:00Z',
    periodEnd: '2026-02-19T00:00:00Z',
    totalVehicles: vehicles.length,
    totalDistanceKm: vehicles.reduce((sum, v) => sum + v.totalDistanceKm, 0),
    totalIdleTimeMinutes: vehicles.reduce((sum, v) => sum + v.totalIdleTimeMinutes, 0),
    totalMovingTimeMinutes: vehicles.reduce((sum, v) => sum + v.totalMovingTimeMinutes, 0),
    averageIdleRatio: vehicles.reduce((sum, v) => sum + v.idleRatio, 0) / vehicles.length,
    averageEfficiencyScore: vehicles.reduce((sum, v) => sum + v.efficiencyScore, 0) / vehicles.length,
    averageRiskScore: vehicles.reduce((sum, v) => sum + v.riskScore, 0) / vehicles.length,
    vehiclesByEfficiency: vehicles.map((v, i) => ({
      vehicleId: v.vehicleId,
      vehicleName: v.vehicleId,
      score: v.efficiencyScore,
      rank: i + 1,
    })),
    vehiclesByRisk: vehicles.map((v, i) => ({
      vehicleId: v.vehicleId,
      vehicleName: v.vehicleId,
      score: v.riskScore,
      rank: i + 1,
    })),
    topRiskVehicles: vehicles.slice(0, 3).map((v, i) => ({
      vehicleId: v.vehicleId,
      vehicleName: v.vehicleId,
      score: v.riskScore,
      rank: i + 1,
    })),
  });

  const createMockFleetCosts = (): FleetCostEstimation => ({
    periodStart: '2026-02-18T00:00:00Z',
    periodEnd: '2026-02-19T00:00:00Z',
    totalDailyIdleCost: 25.50,
    totalMonthlyProjectedIdleCost: 561,
    totalRiskAdjustedAnnualCost: 7500,
    costByVehicle: [
      {
        vehicleId: 'v001',
        dailyIdleCost: 8.50,
        monthlyProjectedIdleCost: 187,
        speedingRiskCost: 100,
        dailyTotalLoss: 8.50,
        monthlyProjectedLoss: 187,
        annualProjectedLoss: 2500,
      },
    ],
    highestCostVehicle: {
      vehicleId: 'v001',
      dailyIdleCost: 8.50,
      monthlyProjectedIdleCost: 187,
      speedingRiskCost: 100,
      dailyTotalLoss: 8.50,
      monthlyProjectedLoss: 187,
      annualProjectedLoss: 2500,
    },
  });

  describe('generateFallbackInsights', () => {
    it('should generate valid insights structure', () => {
      const vehicles = [
        createMockMetrics({ vehicleId: 'v001' }),
        createMockMetrics({ vehicleId: 'v002' }),
      ];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      // Check structure
      expect(result).toHaveProperty('executiveSummary');
      expect(result).toHaveProperty('topRisk');
      expect(result).toHaveProperty('costImpactExplanation');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('fleetHealthScore');
      expect(result).toHaveProperty('priorityScore');
    });

    it('should generate executiveSummary with vehicle count', () => {
      const vehicles = [
        createMockMetrics({ vehicleId: 'v001' }),
        createMockMetrics({ vehicleId: 'v002' }),
        createMockMetrics({ vehicleId: 'v003' }),
      ];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.executiveSummary).toContain('3 vehicles');
    });

    it('should identify IDLE_TIME risk when idle ratio is high', () => {
      const vehicles = [
        createMockMetrics({ vehicleId: 'v001', idleRatio: 0.45 }),
        createMockMetrics({ vehicleId: 'v002', idleRatio: 0.40 }),
      ];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.topRisk.category).toBe('IDLE_TIME');
    });

    it('should identify SPEEDING risk when speeding ratio is high', () => {
      const vehicles = [
        createMockMetrics({ vehicleId: 'v001', aggressiveDrivingRatio: 0.25, idleRatio: 0.1 }),
        createMockMetrics({ vehicleId: 'v002', aggressiveDrivingRatio: 0.20, idleRatio: 0.1 }),
      ];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.topRisk.category).toBe('SPEEDING');
    });

    it('should identify INEFFICIENCY when efficiency is low', () => {
      const vehicles = [
        createMockMetrics({ vehicleId: 'v001', efficiencyScore: 35, idleRatio: 0.2, aggressiveDrivingRatio: 0.05 }),
        createMockMetrics({ vehicleId: 'v002', efficiencyScore: 40, idleRatio: 0.2, aggressiveDrivingRatio: 0.05 }),
      ];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.topRisk.category).toBe('INEFFICIENCY');
    });

    it('should set appropriate severity based on risk score', () => {
      // High risk vehicles
      const highRiskVehicles = [
        createMockMetrics({ vehicleId: 'v001', riskScore: 75 }),
        createMockMetrics({ vehicleId: 'v002', riskScore: 80 }),
      ];

      const highRiskRequest: AIInsightsRequest = {
        vehicleMetrics: highRiskVehicles,
        fleetMetrics: createMockFleetMetrics(highRiskVehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const highResult = generateFallbackInsights(highRiskRequest);
      expect(highResult.topRisk.severity).toBe('CRITICAL');

      // Low risk vehicles
      const lowRiskVehicles = [
        createMockMetrics({ vehicleId: 'v001', riskScore: 15 }),
        createMockMetrics({ vehicleId: 'v002', riskScore: 20 }),
      ];

      const lowRiskRequest: AIInsightsRequest = {
        vehicleMetrics: lowRiskVehicles,
        fleetMetrics: createMockFleetMetrics(lowRiskVehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const lowResult = generateFallbackInsights(lowRiskRequest);
      expect(lowResult.topRisk.severity).toBe('LOW');
    });

    it('should generate 1-5 recommendations', () => {
      const vehicles = [createMockMetrics({ vehicleId: 'v001' })];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should generate recommendations sorted by priority', () => {
      const vehicles = [
        createMockMetrics({ vehicleId: 'v001' }),
        createMockMetrics({ vehicleId: 'v002' }),
      ];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i]!.priority).toBeGreaterThan(
          result.recommendations[i - 1]!.priority
        );
      }
    });

    it('should include highest cost vehicle in recommendations', () => {
      const vehicles = [createMockMetrics({ vehicleId: 'v001' })];
      const costs = createMockFleetCosts();

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: costs,
      };

      const result = generateFallbackInsights(request);

      const hasHighestCostRec = result.recommendations.some((r) =>
        r.action.includes(costs.highestCostVehicle!.vehicleId)
      );
      expect(hasHighestCostRec).toBe(true);
    });

    it('should generate fleetHealthScore between 0-100', () => {
      const vehicles = [createMockMetrics({ vehicleId: 'v001' })];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.fleetHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.fleetHealthScore).toBeLessThanOrEqual(100);
    });

    it('should generate priorityScore between 0-100', () => {
      const vehicles = [createMockMetrics({ vehicleId: 'v001' })];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: createMockFleetCosts(),
      };

      const result = generateFallbackInsights(request);

      expect(result.priorityScore).toBeGreaterThanOrEqual(0);
      expect(result.priorityScore).toBeLessThanOrEqual(100);
    });

    it('should include cost explanation with actual values', () => {
      const costs = createMockFleetCosts();
      const vehicles = [createMockMetrics({ vehicleId: 'v001' })];

      const request: AIInsightsRequest = {
        vehicleMetrics: vehicles,
        fleetMetrics: createMockFleetMetrics(vehicles),
        fleetCosts: costs,
      };

      const result = generateFallbackInsights(request);

      expect(result.costImpactExplanation).toContain(
        costs.totalDailyIdleCost.toFixed(2)
      );
    });
  });
});
