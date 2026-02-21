<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAnalyticsStore } from '../stores';

const router = useRouter();
const analyticsStore = useAnalyticsStore();

const rankings = computed(() => analyticsStore.vehiclesByEfficiency);

const maxScore = computed(() => {
  if (rankings.value.length === 0) return 100;
  return Math.max(...rankings.value.map((r) => r.score), 100);
});

function getBarWidth(score: number): string {
  return `${Math.max(5, (score / maxScore.value) * 100)}%`;
}

// Color bands: ≥70 green, 50-69 yellow, 30-49 orange, <30 red
function getBarColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 30) return 'text-orange-600';
  return 'text-red-600';
}

function viewVehicle(vehicleId: string) {
  router.push({ name: 'vehicle-detail', params: { id: vehicleId } });
}
</script>

<template>
  <div class="kpi-card">
    <div class="flex items-center justify-between mb-3 sm:mb-4">
      <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">
        Efficiency Ranking
      </h3>
      <span class="text-xs text-slate-500">
        {{ rankings.length }} vehicles
      </span>
    </div>

    <div v-if="rankings.length === 0" class="text-slate-500 text-sm py-4">
      No data available
    </div>

    <div v-else class="space-y-2 sm:space-y-3">
      <div
        v-for="vehicle in rankings"
        :key="vehicle.vehicleId"
        @click="viewVehicle(vehicle.vehicleId)"
        class="group cursor-pointer"
      >
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1 sm:gap-2 min-w-0">
            <span class="text-xs font-bold text-slate-400 w-4 sm:w-5 flex-shrink-0">
              #{{ vehicle.rank }}
            </span>
            <span class="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-fleet-600 transition-colors truncate">
              {{ vehicle.vehicleId }}
            </span>
          </div>
          <span :class="['text-xs sm:text-sm font-semibold flex-shrink-0 ml-2', getScoreTextColor(vehicle.score)]">
            {{ vehicle.score.toFixed(1) }}
          </span>
        </div>
        <div class="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            :class="['h-full rounded-full transition-all duration-300', getBarColor(vehicle.score)]"
            :style="{ width: getBarWidth(vehicle.score) }"
          />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-3 sm:mt-4 pt-3 border-t border-slate-100">
      <div class="flex flex-wrap gap-2 sm:gap-3 text-xs text-slate-500">
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          ≥70
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
          50-69
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          30-49
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          &lt;30
        </span>
      </div>
    </div>
  </div>
</template>
