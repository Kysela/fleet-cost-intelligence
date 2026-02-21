/**
 * Response Parser Tests
 */

import { describe, it, expect } from 'vitest';
import {
  extractJSON,
  parseJSON,
  validateSchema,
  parseResponse,
} from '../responseParser';

describe('Response Parser', () => {
  describe('extractJSON', () => {
    it('should extract clean JSON', () => {
      const input = '{"key": "value"}';
      expect(extractJSON(input)).toBe('{"key": "value"}');
    });

    it('should extract JSON from markdown code blocks', () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(extractJSON(input)).toBe('{"key": "value"}');
    });

    it('should extract JSON from unmarked code blocks', () => {
      const input = '```\n{"key": "value"}\n```';
      expect(extractJSON(input)).toBe('{"key": "value"}');
    });

    it('should extract JSON with leading/trailing text', () => {
      const input = 'Here is the response: {"key": "value"} End of response.';
      expect(extractJSON(input)).toBe('{"key": "value"}');
    });

    it('should handle whitespace', () => {
      const input = '  \n  {"key": "value"}  \n  ';
      expect(extractJSON(input)).toBe('{"key": "value"}');
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      const result = parseJSON('{"key": "value"}');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ key: 'value' });
      }
    });

    it('should fail on invalid JSON', () => {
      const result = parseJSON('not json');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should extract and parse JSON from markdown', () => {
      const result = parseJSON('```json\n{"key": "value"}\n```');
      expect(result.success).toBe(true);
    });
  });

  describe('validateSchema', () => {
    const validResponse = {
      executiveSummary: 'Fleet of 5 vehicles analyzed. Primary concern is idle time.',
      topRisk: {
        category: 'IDLE_TIME',
        severity: 'MODERATE',
        description: 'Average idle ratio is 30%, above optimal levels.',
        affectedVehicles: ['v001', 'v002'],
      },
      costImpactExplanation: 'The fleet incurs $50 daily in idle costs.',
      recommendations: [
        {
          priority: 1,
          action: 'Implement idle reduction program.',
          expectedImpact: 'Save $15/day',
          targetVehicles: ['v001'],
        },
      ],
      fleetHealthScore: 65,
      priorityScore: 40,
    };

    it('should validate correct response', () => {
      const result = validateSchema(validResponse);
      expect(result.valid).toBe(true);
    });

    it('should reject missing executiveSummary', () => {
      const invalid = { ...validResponse, executiveSummary: undefined };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'executiveSummary')).toBe(true);
      }
    });

    it('should reject short executiveSummary', () => {
      const invalid = { ...validResponse, executiveSummary: 'Short' };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid risk category', () => {
      const invalid = {
        ...validResponse,
        topRisk: { ...validResponse.topRisk, category: 'INVALID' },
      };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'topRisk.category')).toBe(true);
      }
    });

    it('should reject invalid risk severity', () => {
      const invalid = {
        ...validResponse,
        topRisk: { ...validResponse.topRisk, severity: 'VERY_HIGH' },
      };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject empty recommendations', () => {
      const invalid = { ...validResponse, recommendations: [] };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.field === 'recommendations')).toBe(true);
      }
    });

    it('should reject too many recommendations', () => {
      const manyRecs = Array.from({ length: 10 }, (_, i) => ({
        priority: i + 1,
        action: 'Do something specific here.',
        expectedImpact: 'Some impact',
        targetVehicles: 'ALL',
      }));
      const invalid = { ...validResponse, recommendations: manyRecs };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject fleetHealthScore out of range', () => {
      const invalid = { ...validResponse, fleetHealthScore: 150 };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject negative priorityScore', () => {
      const invalid = { ...validResponse, priorityScore: -10 };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
    });

    it('should accept targetVehicles as "ALL"', () => {
      const withAll = {
        ...validResponse,
        recommendations: [
          {
            priority: 1,
            action: 'Fleet-wide improvement needed.',
            expectedImpact: 'Save $100/month',
            targetVehicles: 'ALL',
          },
        ],
      };
      const result = validateSchema(withAll);
      expect(result.valid).toBe(true);
    });

    it('should accept targetVehicles as array', () => {
      const withArray = {
        ...validResponse,
        recommendations: [
          {
            priority: 1,
            action: 'Focus on specific vehicles.',
            expectedImpact: 'Save $50/month',
            targetVehicles: ['v001', 'v002'],
          },
        ],
      };
      const result = validateSchema(withArray);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid targetVehicles', () => {
      const invalid = {
        ...validResponse,
        recommendations: [
          {
            priority: 1,
            action: 'Do something specific here.',
            expectedImpact: 'Impact',
            targetVehicles: 'SOME',
          },
        ],
      };
      const result = validateSchema(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe('parseResponse', () => {
    it('should parse valid LLM response', () => {
      const validJSON = JSON.stringify({
        executiveSummary: 'Fleet analysis complete with moderate health.',
        topRisk: {
          category: 'IDLE_TIME',
          severity: 'LOW',
          description: 'Idle time is slightly above optimal.',
          affectedVehicles: ['v001'],
        },
        costImpactExplanation: 'Moderate costs from idle time.',
        recommendations: [
          {
            priority: 1,
            action: 'Monitor idle time patterns.',
            expectedImpact: 'Identify improvement areas',
            targetVehicles: 'ALL',
          },
        ],
        fleetHealthScore: 75,
        priorityScore: 25,
      });

      const result = parseResponse(validJSON);
      expect(result.success).toBe(true);
    });

    it('should fail on invalid JSON', () => {
      const result = parseResponse('not valid json at all');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_JSON');
      }
    });

    it('should fail on schema error', () => {
      const invalidSchema = JSON.stringify({
        executiveSummary: 'Valid',
        // Missing other required fields
      });

      const result = parseResponse(invalidSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SCHEMA_ERROR');
        expect(result.details).toBeDefined();
      }
    });
  });
});
