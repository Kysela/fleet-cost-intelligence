/**
 * Vehicle Store
 * 
 * Manages vehicle list and live positions.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '../services/api';
import type { GPSVehicle, GPSPosition } from '../types';

export const useVehicleStore = defineStore('vehicle', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const vehicles = ref<GPSVehicle[]>([]);
  const livePositions = ref<GPSPosition[]>([]);
  const selectedVehicleId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastPositionUpdate = ref<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  const vehicleCount = computed(() => vehicles.value.length);

  const selectedVehicle = computed(() => {
    if (!selectedVehicleId.value) return null;
    return vehicles.value.find((v) => v.id === selectedVehicleId.value) ?? null;
  });

  const vehicleById = computed(() => {
    return (id: string) => vehicles.value.find((v) => v.id === id) ?? null;
  });

  const positionByVehicleId = computed(() => {
    return (id: string) => livePositions.value.find((p) => p.vehicleId === id) ?? null;
  });

  const vehiclesWithPositions = computed(() => {
    return vehicles.value.map((vehicle) => ({
      vehicle,
      position: livePositions.value.find((p) => p.vehicleId === vehicle.id) ?? null,
    }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async function fetchVehicles() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.getVehicles();
      vehicles.value = response.vehicles;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch vehicles';
      console.error('[vehicleStore] fetchVehicles error:', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchLivePositions() {
    try {
      const response = await api.getLivePositions();
      livePositions.value = response.positions;
      lastPositionUpdate.value = response.timestamp;
    } catch (e) {
      console.error('[vehicleStore] fetchLivePositions error:', e);
    }
  }

  function selectVehicle(id: string | null) {
    selectedVehicleId.value = id;
  }

  function clearError() {
    error.value = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    vehicles,
    livePositions,
    selectedVehicleId,
    loading,
    error,
    lastPositionUpdate,

    // Getters
    vehicleCount,
    selectedVehicle,
    vehicleById,
    positionByVehicleId,
    vehiclesWithPositions,

    // Actions
    fetchVehicles,
    fetchLivePositions,
    selectVehicle,
    clearError,
  };
});
