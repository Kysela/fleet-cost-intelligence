<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useAnalyticsStore, useIntelligenceStore, useVehicleStore } from '../stores';

// Components
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import ErrorAlert from '../components/ui/ErrorAlert.vue';
import HealthScoreCard from '../components/cards/HealthScoreCard.vue';
import AnnualLossCard from '../components/cards/AnnualLossCard.vue';
import TopRiskCard from '../components/cards/TopRiskCard.vue';
import HighestCostCard from '../components/cards/HighestCostCard.vue';
import AIExecutiveSummary from '../components/AIExecutiveSummary.vue';
import EfficiencyRanking from '../components/EfficiencyRanking.vue';
import TopRiskList from '../components/TopRiskList.vue';
import CostBarChart from '../components/charts/CostBarChart.vue';
import TimeUtilizationDonut from '../components/charts/TimeUtilizationDonut.vue';
import SavingsSimulator from '../components/SavingsSimulator.vue';

const vehicleStore = useVehicleStore();
const analyticsStore = useAnalyticsStore();
const intelligenceStore = useIntelligenceStore();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Load data on mount
onMounted(async () => {
  await loadAllData();
});

// Reload when date range changes (with debouncing)
watch(
  () => analyticsStore.dateRange,
  () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      await loadAllData();
    }, 500); // 500ms debounce
  }
);

async function loadAllData() {
  try {
    // Load vehicles and fleet analytics in parallel
    await Promise.all([
      vehicleStore.fetchVehicles(),
      analyticsStore.fetchFleetAnalytics(),
    ]);
    
    // Load AI insights after analytics (dependent)
    if (analyticsStore.hasFleetData) {
      await intelligenceStore.fetchInsights();
    }
  } catch (error) {
    console.error('[FleetOverview] Error loading data:', error);
  }
}

function handleRetry() {
  analyticsStore.clearError();
  loadAllData();
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Page Title -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900">Fleet Intelligence Overview</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
          Executive decision interface · {{ vehicleStore.vehicleCount }} vehicles
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="analyticsStore.loading && !analyticsStore.hasFleetData" class="flex items-center justify-center py-12 sm:py-20">
      <div class="text-center">
        <LoadingSpinner size="lg" />
        <p class="mt-4 text-sm text-slate-500">Loading fleet analytics...</p>
      </div>
    </div>

    <!-- Error State -->
    <ErrorAlert
      v-else-if="analyticsStore.error"
      :message="analyticsStore.error"
      @retry="handleRetry"
      @dismiss="analyticsStore.clearError"
    />

    <!-- Main Content -->
    <template v-else>
      <!-- KPI Grid: 1 col mobile, 2 cols tablet, 4 cols desktop -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <HealthScoreCard
          :score="intelligenceStore.hasInsights ? intelligenceStore.aiHealthScore : analyticsStore.fleetHealthScore"
          :loading="analyticsStore.loading"
        />
        <AnnualLossCard
          :amount="analyticsStore.totalAnnualLoss"
          :daily-amount="analyticsStore.totalDailyIdleCost"
          :loading="analyticsStore.loading"
        />
        <TopRiskCard
          :category="intelligenceStore.topRisk?.category ?? null"
          :severity="intelligenceStore.topRisk?.severity ?? null"
          :loading="intelligenceStore.loading"
        />
        <HighestCostCard
          :vehicle="analyticsStore.highestCostVehicle"
          :loading="analyticsStore.loading"
        />
      </div>

      <SavingsSimulator
        :fleet-costs="analyticsStore.fleetCosts"
        :fleet-metrics="analyticsStore.fleetMetrics"
        :loading="analyticsStore.loading"
      />

      <!-- AI Executive Summary (full width) -->
      <AIExecutiveSummary />

      <!-- Secondary Grid: 1 col mobile, 2 cols tablet+ -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <EfficiencyRanking />
        <CostBarChart />
      </div>

      <!-- Tertiary Grid: 1 col mobile, 2 cols tablet+ -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <TimeUtilizationDonut />
        <TopRiskList />
      </div>
    </template>
  </div>
</template>
