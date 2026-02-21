/**
 * Vehicle Routes Integration Tests
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../index';

const app = createApp();

describe('Vehicle Routes', () => {
  describe('GET /api/vehicles', () => {
    it('should return list of vehicles', async () => {
      const response = await request(app).get('/api/vehicles');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vehicles');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.vehicles)).toBe(true);
      expect(response.body.data.count).toBeGreaterThan(0);
    });

    it('should have timestamp in response', async () => {
      const response = await request(app).get('/api/vehicles');

      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should return vehicles with expected structure', async () => {
      const response = await request(app).get('/api/vehicles');
      const vehicle = response.body.data.vehicles[0];

      expect(vehicle).toHaveProperty('id');
      expect(vehicle).toHaveProperty('name');
      expect(vehicle).toHaveProperty('licensePlate');
      expect(vehicle).toHaveProperty('vehicleType');
    });
  });

  describe('GET /api/vehicles/live', () => {
    it('should return live positions', async () => {
      const response = await request(app).get('/api/vehicles/live');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('positions');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should return positions with expected structure', async () => {
      const response = await request(app).get('/api/vehicles/live');
      const position = response.body.data.positions[0];

      expect(position).toHaveProperty('vehicleId');
      expect(position).toHaveProperty('latitude');
      expect(position).toHaveProperty('longitude');
      expect(position).toHaveProperty('speed');
      expect(position).toHaveProperty('timestamp');
      expect(position).toHaveProperty('ignitionOn');
    });
  });

  describe('GET /api/vehicles/:id/tracks', () => {
    const validStart = '2026-02-18T00:00:00Z';
    const validEnd = '2026-02-19T00:00:00Z';

    it('should return track data for valid vehicle and date range', async () => {
      const response = await request(app)
        .get('/api/vehicles/v001/tracks')
        .query({ start: validStart, end: validEnd });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('vehicleId', 'v001');
      expect(response.body.data).toHaveProperty('track');
      expect(response.body.data).toHaveProperty('pointCount');
    });

    it('should return 400 when start parameter is missing', async () => {
      const response = await request(app)
        .get('/api/vehicles/v001/tracks')
        .query({ end: validEnd });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when end parameter is missing', async () => {
      const response = await request(app)
        .get('/api/vehicles/v001/tracks')
        .query({ start: validStart });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when start is after end', async () => {
      const response = await request(app)
        .get('/api/vehicles/v001/tracks')
        .query({
          start: '2026-02-20T00:00:00Z',
          end: '2026-02-18T00:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/vehicles/v001/tracks')
        .query({
          start: 'not-a-date',
          end: validEnd,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/vehicles/non-existent/tracks')
        .query({ start: validStart, end: validEnd });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
