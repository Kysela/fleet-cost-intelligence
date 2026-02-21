/**
 * Analytics Store
 * 
 * Manages fleet and vehicle analytics data.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '../services/api';
import type {
  DateRange,
  FleetMetrics,
  FleetCostEstimation,
  DerivedVehicleMetrics,
  VehicleCostEstimation,
  VehicleRanking,
} from '../types';

export const useAnalyticsStore = defineStore('analytics', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const fleetMetrics = ref<FleetMetrics | null>(null);
  const fleetCosts = ref<FleetCostEstimation | null>(null);
  const vehicleMetrics = ref<DerivedVehicleMetrics[]>([]);
  
  // Individual vehicle analytics (for detail view)
  const selectedVehicleMetrics = ref<DerivedVehicleMetrics | null>(null);
  const selectedVehicleCosts = ref<VehicleCostEstimation | null>(null);

  // Date range (default: last 24 hours)
  const dateRange = ref<DateRange>({
    start: getDefaultStartDate(),
    end: getDefaultEndDate(),
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  function getDefaultEndDate(): string {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  const hasFleetData = computed(() => fleetMetrics.value !== null);

  const fleetHealthScore = computed(() => {
    if (!fleetMetrics.value) return 0;
    return fleetMetrics.value.averageEfficiencyScore;
  });

  const totalAnnualLoss = computed(() => {
    if (!fleetCosts.value) return 0;
    return fleetCosts.value.totalRiskAdjustedAnnualCost;
  });

  const totalDailyIdleCost = computed(() => {
    if (!fleetCosts.value) return 0;
    return fleetCosts.value.totalDailyIdleCost;
  });

  const highestCostVehicle = computed(() => {
    if (!fleetCosts.value) return null;
    return fleetCosts.value.highestCostVehicle;
  });

  const topRiskVehicles = computed((): VehicleRanking[] => {
    if (!fleetMetrics.value) return [];
    return [...fleetMetrics.value.topRiskVehicles];
  });

  const vehiclesByEfficiency = computed((): VehicleRanking[] => {
    if (!fleetMetrics.value) return [];
    return [...fleetMetrics.value.vehiclesByEfficiency];
  });

  const vehiclesByRisk = computed((): VehicleRanking[] => {
    if (!fleetMetrics.value) return [];
    return [...fleetMetrics.value.vehiclesByRisk];
  });

  const totalIdleMinutes = computed(() => {
    if (!fleetMetrics.value) return 0;
    return fleetMetrics.value.totalIdleTimeMinutes;
  });

  const totalMovingMinutes = computed(() => {
    if (!fleetMetrics.value) return 0;
    return fleetMetrics.value.totalMovingTimeMinutes;
  });

  const idleVsMovingRatio = computed(() => {
    const total = totalIdleMinutes.value + totalMovingMinutes.value;
    if (total === 0) return { idle: 0, moving: 0 };
    return {
      idle: (totalIdleMinutes.value / total) * 100,
      moving: (totalMovingMinutes.value / total) * 100,
    };
  });

  const vehicleMetricsById = computed(() => {
    return (id: string) => vehicleMetrics.value.find((m) => m.vehicleId === id) ?? null;
  });

  const vehicleCostsById = computed(() => {
    return (id: string) => fleetCosts.value?.costByVehicle.find((c) => c.vehicleId === id) ?? null;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async function fetchFleetAnalytics() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.getFleetAnalytics(
        dateRange.value.start,
        dateRange.value.end
      );

      fleetMetrics.value = response.fleetMetrics;
      fleetCosts.value = response.fleetCosts;
      vehicleMetrics.value = response.vehicleMetrics;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch fleet analytics';
      console.error('[analyticsStore] fetchFleetAnalytics error:', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchVehicleAnalytics(vehicleId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.getVehicleAnalytics(
        vehicleId,
        dateRange.value.start,
        dateRange.value.end
      );

      selectedVehicleMetrics.value = response.metrics;
      selectedVehicleCosts.value = response.costs;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch vehicle analytics';
      console.error('[analyticsStore] fetchVehicleAnalytics error:', e);
    } finally {
      loading.value = false;
    }
  }

  function setDateRange(start: string, end: string) {
    dateRange.value = { start, end };
  }

  function clearError() {
    error.value = null;
  }

  function clearSelectedVehicle() {
    selectedVehicleMetrics.value = null;
    selectedVehicleCosts.value = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    fleetMetrics,
    fleetCosts,
    vehicleMetrics,
    selectedVehicleMetrics,
    selectedVehicleCosts,
    dateRange,
    loading,
    error,

    // Getters
    hasFleetData,
    fleetHealthScore,
    totalAnnualLoss,
    totalDailyIdleCost,
    highestCostVehicle,
    topRiskVehicles,
    vehiclesByEfficiency,
    vehiclesByRisk,
    totalIdleMinutes,
    totalMovingMinutes,
    idleVsMovingRatio,
    vehicleMetricsById,
    vehicleCostsById,

    // Actions
    fetchFleetAnalytics,
    fetchVehicleAnalytics,
    setDateRange,
    clearError,
    clearSelectedVehicle,
  };
});
