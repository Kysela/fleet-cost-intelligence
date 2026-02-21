<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAnalyticsStore, useVehicleStore } from '../stores';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import ErrorAlert from '../components/ui/ErrorAlert.vue';

const route = useRoute();
const router = useRouter();
const vehicleStore = useVehicleStore();
const analyticsStore = useAnalyticsStore();

const vehicleId = computed(() => route.params.id as string);

const vehicle = computed(() => vehicleStore.vehicleById(vehicleId.value));
const metrics = computed(() => analyticsStore.selectedVehicleMetrics);
const costs = computed(() => analyticsStore.selectedVehicleCosts);

// Load data
onMounted(async () => {
  await loadData();
});

watch(vehicleId, async () => {
  await loadData();
});

async function loadData() {
  if (!vehicleId.value) return;
  
  // Ensure vehicles are loaded
  if (vehicleStore.vehicles.length === 0) {
    await vehicleStore.fetchVehicles();
  }
  
  // Load vehicle analytics
  await analyticsStore.fetchVehicleAnalytics(vehicleId.value);
}

function goBack() {
  router.push({ name: 'overview' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

// Score colors
function getEfficiencyColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 30) return 'text-orange-600';
  return 'text-red-600';
}

function getRiskColor(score: number): string {
  if (score < 30) return 'text-green-600';
  if (score < 50) return 'text-yellow-600';
  if (score < 70) return 'text-orange-600';
  return 'text-red-600';
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2 sm:gap-4">
      <button
        @click="goBack"
        class="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="min-w-0">
        <h1 class="text-lg sm:text-2xl font-bold text-slate-900 truncate">
          Vehicle {{ vehicleId }}
        </h1>
        <p v-if="vehicle" class="text-xs sm:text-sm text-slate-500 truncate">
          {{ vehicle.name }} · {{ vehicle.licensePlate }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="analyticsStore.loading" class="flex items-center justify-center py-12 sm:py-20">
      <div class="text-center">
        <LoadingSpinner size="lg" />
        <p class="mt-4 text-sm text-slate-500">Loading vehicle data...</p>
      </div>
    </div>

    <!-- Error State -->
    <ErrorAlert
      v-else-if="analyticsStore.error"
      :message="analyticsStore.error"
      @retry="loadData"
      @dismiss="analyticsStore.clearError"
    />

    <!-- Content -->
    <template v-else-if="metrics && costs">
      <!-- KPI Cards: 2x2 on mobile, 4 on desktop -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <div class="kpi-card">
          <p class="kpi-label text-xs">Efficiency Score</p>
          <p :class="['text-2xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2', getEfficiencyColor(metrics.efficiencyScore)]">
            {{ formatNumber(metrics.efficiencyScore, 1) }}
          </p>
          <p class="text-xs text-slate-500">/100</p>
        </div>

        <div class="kpi-card">
          <p class="kpi-label text-xs">Risk Score</p>
          <p :class="['text-2xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2', getRiskColor(metrics.riskScore)]">
            {{ formatNumber(metrics.riskScore, 1) }}
          </p>
          <p class="text-xs text-slate-500">/100</p>
        </div>

        <div class="kpi-card">
          <p class="kpi-label text-xs">Daily Loss</p>
          <p class="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2 text-amber-600 truncate">
            {{ formatCurrency(costs.dailyIdleCost) }}
          </p>
          <p class="text-xs text-slate-500">idle cost</p>
        </div>

        <div class="kpi-card">
          <p class="kpi-label text-xs">Annual Loss</p>
          <p class="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2 text-red-600 truncate">
            {{ formatCurrency(costs.annualProjectedLoss) }}
          </p>
          <p class="text-xs text-slate-500">projected</p>
        </div>
      </div>

      <!-- Metrics Breakdown: Stack on mobile -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <!-- Operational Metrics -->
        <div class="kpi-card">
          <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">
            Operational Metrics
          </h3>
          <div class="space-y-2 sm:space-y-3">
            <div class="flex justify-between py-1.5 sm:py-2 border-b border-slate-100">
              <span class="text-xs sm:text-sm text-slate-600">Total Distance</span>
              <span class="text-xs sm:text-sm font-semibold">{{ formatNumber(metrics.totalDistanceKm) }} km</span>
            </div>
            <div class="flex justify-between py-1.5 sm:py-2 border-b border-slate-100">
              <span class="text-xs sm:text-sm text-slate-600">Moving Time</span>
              <span class="text-xs sm:text-sm font-semibold">{{ formatNumber(metrics.totalMovingTimeMinutes, 0) }} min</span>
            </div>
            <div class="flex justify-between py-1.5 sm:py-2 border-b border-slate-100">
              <span class="text-xs sm:text-sm text-slate-600">Idle Time</span>
              <span class="text-xs sm:text-sm font-semibold text-amber-600">{{ formatNumber(metrics.totalIdleTimeMinutes, 0) }} min</span>
            </div>
            <div class="flex justify-between py-1.5 sm:py-2 border-b border-slate-100">
              <span class="text-xs sm:text-sm text-slate-600">Number of Stops</span>
              <span class="text-xs sm:text-sm font-semibold">{{ metrics.numberOfStops }}</span>
            </div>
            <div class="flex justify-between py-1.5 sm:py-2 border-b border-slate-100">
              <span class="text-xs sm:text-sm text-slate-600">Average Speed</span>
              <span class="text-xs sm:text-sm font-semibold">{{ formatNumber(metrics.averageSpeedKmh) }} km/h</span>
            </div>
            <div class="flex justify-between py-1.5 sm:py-2">
              <span class="text-xs sm:text-sm text-slate-600">Max Speed</span>
              <span class="text-xs sm:text-sm font-semibold">{{ formatNumber(metrics.maxSpeedKmh, 0) }} km/h</span>
            </div>
          </div>
        </div>

        <!-- Performance Ratios -->
        <div class="kpi-card">
          <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">
            Performance Ratios
          </h3>
          <div class="space-y-3 sm:space-y-4">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-xs sm:text-sm text-slate-600">Idle Ratio</span>
                <span class="text-xs sm:text-sm font-semibold">{{ formatNumber(metrics.idleRatio * 100) }}%</span>
              </div>
              <div class="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-amber-500 rounded-full"
                  :style="{ width: `${Math.min(100, metrics.idleRatio * 100)}%` }"
                />
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-xs sm:text-sm text-slate-600">Aggressive Driving</span>
                <span class="text-xs sm:text-sm font-semibold">{{ formatNumber(metrics.aggressiveDrivingRatio * 100) }}%</span>
              </div>
              <div class="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-red-500 rounded-full"
                  :style="{ width: `${Math.min(100, metrics.aggressiveDrivingRatio * 100)}%` }"
                />
              </div>
            </div>

            <div class="pt-3 sm:pt-4 border-t border-slate-200">
              <p class="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Long Idle Events</p>
              <p class="text-xl sm:text-2xl font-bold">
                {{ metrics.longIdleEvents.length }}
                <span class="text-xs sm:text-sm font-normal text-slate-500">(>10 min)</span>
              </p>
            </div>

            <div class="pt-3 sm:pt-4 border-t border-slate-200">
              <p class="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Data Points Analyzed</p>
              <p class="text-xl sm:text-2xl font-bold">
                {{ metrics.totalPointsAnalyzed.toLocaleString() }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Cost Breakdown -->
      <div class="kpi-card">
        <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">
          Cost Breakdown
        </h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div class="text-center p-2 sm:p-4 bg-slate-50 rounded-lg">
            <p class="text-xs text-slate-600">Daily Idle</p>
            <p class="text-sm sm:text-xl font-bold text-amber-600 mt-1 truncate">{{ formatCurrency(costs.dailyIdleCost) }}</p>
          </div>
          <div class="text-center p-2 sm:p-4 bg-slate-50 rounded-lg">
            <p class="text-xs text-slate-600">Monthly Idle</p>
            <p class="text-sm sm:text-xl font-bold text-amber-600 mt-1 truncate">{{ formatCurrency(costs.monthlyProjectedIdleCost) }}</p>
          </div>
          <div class="text-center p-2 sm:p-4 bg-slate-50 rounded-lg">
            <p class="text-xs text-slate-600">Speed Risk</p>
            <p class="text-sm sm:text-xl font-bold text-orange-600 mt-1 truncate">{{ formatCurrency(costs.speedingRiskCost) }}</p>
          </div>
          <div class="text-center p-2 sm:p-4 bg-red-50 rounded-lg">
            <p class="text-xs text-slate-600">Annual Total</p>
            <p class="text-sm sm:text-xl font-bold text-red-600 mt-1 truncate">{{ formatCurrency(costs.annualProjectedLoss) }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- No Data -->
    <div v-else class="text-center py-12 sm:py-20 text-slate-500">
      <p>No data available for this vehicle.</p>
    </div>
  </div>
</template>
