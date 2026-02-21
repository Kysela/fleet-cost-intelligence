<script setup lang="ts">
import type { RiskCategory, RiskSeverity } from '../../types';
import StatusBadge from '../ui/StatusBadge.vue';

defineProps<{
  category: RiskCategory | null;
  severity: RiskSeverity | null;
  loading?: boolean;
}>();

const categoryLabels: Record<RiskCategory, string> = {
  IDLE_TIME: 'Idle Time',
  SPEEDING: 'Speeding',
  INEFFICIENCY: 'Inefficiency',
  COST: 'Cost Overrun',
};

const categoryIcons: Record<RiskCategory, string> = {
  IDLE_TIME: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  SPEEDING: 'M13 10V3L4 14h7v7l9-11h-7z',
  INEFFICIENCY: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  COST: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};
</script>

<template>
  <div class="kpi-card">
    <p class="kpi-label">Top Risk Factor</p>
    
    <div v-if="loading" class="mt-2">
      <div class="h-8 w-24 sm:w-28 skeleton"></div>
      <div class="h-6 w-16 sm:w-20 skeleton mt-2"></div>
    </div>
    
    <div v-else-if="category && severity" class="mt-2">
      <div class="flex items-center gap-2 sm:gap-3">
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="categoryIcons[category]" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-lg sm:text-xl font-bold text-slate-900 truncate">
            {{ categoryLabels[category] }}
          </p>
          <StatusBadge :severity="severity" size="sm" />
        </div>
      </div>
    </div>
    
    <div v-else class="mt-2 text-sm text-slate-500">
      No risks detected
    </div>
  </div>
</template>
