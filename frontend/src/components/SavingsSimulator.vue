<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FleetCostEstimation, FleetMetrics } from '../types';
import { simulateFleetIdleReduction } from '../services/costModel';

const props = defineProps<{
  fleetCosts: FleetCostEstimation | null;
  fleetMetrics: FleetMetrics | null;
  loading?: boolean;
}>();

const reductionPercent = ref(10);

const simulation = computed(() => {
  if (!props.fleetCosts) {
    return null;
  }

  return simulateFleetIdleReduction(props.fleetCosts, reductionPercent.value);
});

const adjustedIdleMinutes = computed(() => {
  if (!props.fleetMetrics) {
    return null;
  }

  const reductionFraction = reductionPercent.value / 100;
  return props.fleetMetrics.totalIdleTimeMinutes * (1 - reductionFraction);
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMinutes(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<template>
  <div class="kpi-card w-full min-w-0">
    <div class="flex flex-col gap-1">
      <p class="kpi-label">Savings Opportunity Simulator</p>
      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Simulate idle time reduction and see projected annual loss impact.
      </p>
    </div>

    <div v-if="loading" class="mt-3 sm:mt-4 space-y-3">
      <div class="h-2.5 w-full skeleton"></div>
      <div class="h-24 w-full skeleton"></div>
    </div>

    <template v-else-if="simulation">
      <div class="mt-3 sm:mt-4">
        <div class="flex items-center justify-between gap-3">
          <label for="idle-reduction-slider" class="text-xs sm:text-sm font-medium text-slate-700">
            Idle reduction target
          </label>
          <span class="text-sm sm:text-base font-semibold text-fleet-700">
            {{ reductionPercent }}%
          </span>
        </div>

        <input
          id="idle-reduction-slider"
          v-model.number="reductionPercent"
          type="range"
          min="0"
          max="30"
          step="1"
          class="mt-2 w-full accent-fleet-600 cursor-pointer"
        />

        <div class="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
          <span>0%</span>
          <span>30%</span>
        </div>
      </div>

      <div class="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 min-w-0">
          <p class="text-[11px] sm:text-xs uppercase tracking-wide text-slate-500">Original Annual Loss</p>
          <p class="mt-1 text-lg sm:text-xl font-bold text-red-600 break-words">
            {{ formatCurrency(simulation.originalAnnualLoss) }}
          </p>
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 min-w-0">
          <p class="text-[11px] sm:text-xs uppercase tracking-wide text-slate-500">Adjusted Annual Loss</p>
          <p class="mt-1 text-lg sm:text-xl font-bold text-amber-600 break-words">
            {{ formatCurrency(simulation.adjustedAnnualLoss) }}
          </p>
        </div>

        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 min-w-0">
          <p class="text-[11px] sm:text-xs uppercase tracking-wide text-emerald-700">Estimated Savings</p>
          <p class="mt-1 text-lg sm:text-xl font-bold text-emerald-700 break-words">
            {{ formatCurrency(simulation.estimatedSavings) }}
          </p>
        </div>
      </div>

      <p
        v-if="fleetMetrics && adjustedIdleMinutes !== null"
        class="mt-2.5 text-xs sm:text-sm text-slate-600 break-words"
      >
        Idle minutes in period:
        <span class="font-semibold text-slate-900">
          {{ formatMinutes(fleetMetrics.totalIdleTimeMinutes) }}
        </span>
        →
        <span class="font-semibold text-fleet-700">
          {{ formatMinutes(adjustedIdleMinutes) }}
        </span>
      </p>
    </template>

    <p v-else class="mt-4 text-sm text-slate-500">No cost data available for simulation.</p>
  </div>
</template>
