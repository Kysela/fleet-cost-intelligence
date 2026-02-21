/**
 * Prompt Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt, validateRequest, SYSTEM_PROMPT } from '../promptBuilder';
import type { AIInsightsRequest, DerivedVehicleMetrics, FleetMetrics, FleetCostEstimation } from '../../types';

describe('Prompt Builder', () => {
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

  const createValidRequest = (): AIInsightsRequest => ({
    vehicleMetrics: [
      createMockMetrics('v001'),
      createMockMetrics('v002'),
      createMockMetrics('v003'),
    ],
    fleetMetrics: createMockFleetMetrics(),
    fleetCosts: createMockFleetCosts(),
  });

  describe('SYSTEM_PROMPT', () => {
    it('should define the AI role', () => {
      expect(SYSTEM_PROMPT).toContain('fleet operations intelligence analyst');
    });

    it('should mention JSON response format', () => {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain('json');
    });
  });

  describe('buildPrompt', () => {
    it('should include fleet overview section', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('FLEET OVERVIEW');
      expect(prompt).toContain('Total Vehicles: 3');
    });

    it('should include financial impact section', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('FINANCIAL IMPACT');
      expect(prompt).toContain('$30.00');
    });

    it('should include top risk vehicles section', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('TOP RISK VEHICLES');
      expect(prompt).toContain('v003');
    });

    it('should include vehicle metrics table', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('VEHICLE METRICS SUMMARY');
      expect(prompt).toContain('v001');
      expect(prompt).toContain('v002');
    });

    it('should include JSON schema instructions', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('INSTRUCTIONS');
      expect(prompt).toContain('executiveSummary');
      expect(prompt).toContain('topRisk');
      expect(prompt).toContain('recommendations');
    });

    it('should include valid risk categories in schema', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('IDLE_TIME');
      expect(prompt).toContain('SPEEDING');
      expect(prompt).toContain('INEFFICIENCY');
      expect(prompt).toContain('COST');
    });

    it('should include valid severity levels in schema', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('LOW');
      expect(prompt).toContain('MODERATE');
      expect(prompt).toContain('HIGH');
      expect(prompt).toContain('CRITICAL');
    });

    it('should not include raw GPS data', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).not.toContain('latitude');
      expect(prompt).not.toContain('longitude');
      expect(prompt).not.toContain('GPSTrackPoint');
    });

    it('should include average scores', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('70.0/100'); // efficiency
      expect(prompt).toContain('25.0/100'); // risk
    });

    it('should include highest cost vehicle info', () => {
      const prompt = buildPrompt(createValidRequest());
      expect(prompt).toContain('v003');
      expect(prompt).toContain('$3200.00/year');
    });
  });

  describe('validateRequest', () => {
    it('should accept valid request', () => {
      const result = validateRequest(createValidRequest());
      expect(result.valid).toBe(true);
    });

    it('should reject empty vehicleMetrics', () => {
      const request = {
        ...createValidRequest(),
        vehicleMetrics: [],
      };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vehicle metrics');
    });

    it('should reject missing fleetMetrics', () => {
      const request = {
        ...createValidRequest(),
        fleetMetrics: undefined as unknown as FleetMetrics,
      };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('fleet metrics');
    });

    it('should reject missing fleetCosts', () => {
      const request = {
        ...createValidRequest(),
        fleetCosts: undefined as unknown as FleetCostEstimation,
      };
      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('fleet costs');
    });
  });
});
