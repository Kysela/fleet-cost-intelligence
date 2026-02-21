<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAnalyticsStore } from '../stores';

const router = useRouter();
const analyticsStore = useAnalyticsStore();

function viewVehicle(vehicleId: string) {
  router.push({ name: 'vehicle-detail', params: { id: vehicleId } });
}

function getRiskColor(score: number): string {
  if (score >= 70) return 'text-red-600';
  if (score >= 50) return 'text-orange-600';
  if (score >= 30) return 'text-yellow-600';
  return 'text-green-600';
}

function getRiskBgColor(score: number): string {
  if (score >= 70) return 'bg-red-50 hover:bg-red-100';
  if (score >= 50) return 'bg-orange-50 hover:bg-orange-100';
  if (score >= 30) return 'bg-yellow-50 hover:bg-yellow-100';
  return 'bg-green-50 hover:bg-green-100';
}
</script>

<template>
  <div class="kpi-card">
    <div class="flex items-center justify-between mb-3 sm:mb-4">
      <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">
        Top Risk Vehicles
      </h3>
      <span class="text-xs text-slate-500">
        By risk score
      </span>
    </div>

    <div v-if="analyticsStore.topRiskVehicles.length === 0" class="text-slate-500 text-sm py-4">
      No data available
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="vehicle in analyticsStore.topRiskVehicles"
        :key="vehicle.vehicleId"
        @click="viewVehicle(vehicle.vehicleId)"
        :class="[
          'flex items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer transition-colors',
          getRiskBgColor(vehicle.score)
        ]"
      >
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <span class="text-xs sm:text-sm font-bold text-slate-400 flex-shrink-0">
            {{ vehicle.rank }}.
          </span>
          <span class="text-xs sm:text-sm font-medium text-slate-700 truncate">
            {{ vehicle.vehicleId }}
          </span>
        </div>
        <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span :class="['text-xs sm:text-sm font-semibold', getRiskColor(vehicle.score)]">
            Risk: {{ vehicle.score.toFixed(0) }}
          </span>
          <svg class="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
