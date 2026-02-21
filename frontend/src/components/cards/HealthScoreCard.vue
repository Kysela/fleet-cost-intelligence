<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  score: number;
  loading?: boolean;
}>();

// Color bands: 80-100 green, 60-79 yellow, 40-59 orange, <40 red
const scoreConfig = computed(() => {
  const s = props.score;
  if (s >= 80) return { color: '#22c55e', textClass: 'text-green-500', label: 'Excellent' };
  if (s >= 60) return { color: '#eab308', textClass: 'text-yellow-500', label: 'Good' };
  if (s >= 40) return { color: '#f97316', textClass: 'text-orange-500', label: 'Needs Attention' };
  return { color: '#ef4444', textClass: 'text-red-500', label: 'Critical' };
});

// Gauge percentage (for arc)
const gaugePercentage = computed(() => {
  return Math.min(100, Math.max(0, props.score));
});

// SVG arc calculation (270 degree arc)
const arcPath = computed(() => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (gaugePercentage.value / 100) * circumference * 0.75;
  return dashLength;
});
</script>

<template>
  <div class="kpi-card flex flex-col items-center">
    <p class="kpi-label mb-3 sm:mb-4">Fleet Health</p>
    
    <div v-if="loading" class="w-24 h-24 sm:w-32 sm:h-32 skeleton rounded-full"></div>
    
    <div v-else class="relative w-24 h-24 sm:w-32 sm:h-32">
      <!-- Background arc -->
      <svg class="w-full h-full -rotate-[135deg]" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e2e8f0"
          stroke-width="8"
          stroke-dasharray="212.06 282.74"
          stroke-linecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          :stroke="scoreConfig.color"
          stroke-width="8"
          :stroke-dasharray="`${arcPath} 282.74`"
          stroke-linecap="round"
          class="transition-all duration-500"
        />
      </svg>
      
      <!-- Score value -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span :class="['text-2xl sm:text-4xl font-bold', scoreConfig.textClass]">
          {{ Math.round(score) }}
        </span>
        <span class="text-xs sm:text-sm text-slate-500">/100</span>
      </div>
    </div>
    
    <p :class="['mt-2 text-xs sm:text-sm font-medium', scoreConfig.textClass]">
      {{ scoreConfig.label }}
    </p>
  </div>
</template>
