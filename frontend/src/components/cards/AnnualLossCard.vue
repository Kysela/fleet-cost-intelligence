<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  amount: number;
  dailyAmount?: number;
  loading?: boolean;
}>();

const formattedAmount = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(props.amount);
});

const formattedDaily = computed(() => {
  if (!props.dailyAmount) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(props.dailyAmount);
});

// Show trend icon if there's a loss
const hasLoss = computed(() => props.amount > 0);
</script>

<template>
  <div class="kpi-card">
    <p class="kpi-label">Annual Projected Loss</p>
    
    <div v-if="loading" class="mt-2">
      <div class="h-10 w-28 sm:w-32 skeleton"></div>
    </div>
    
    <div v-else class="mt-2">
      <!-- Main amount - dominant typography -->
      <div class="flex items-baseline gap-2">
        <p class="text-3xl sm:text-4xl lg:text-5xl font-bold text-red-600 tracking-tight truncate">
          {{ formattedAmount }}
        </p>
        <svg 
          v-if="hasLoss" 
          class="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      
      <!-- Daily breakdown -->
      <p v-if="formattedDaily" class="text-xs sm:text-sm text-slate-600 mt-1">
        <span class="font-medium text-amber-600">{{ formattedDaily }}</span>/day in idle costs
      </p>
    </div>
    
    <!-- Subtitle -->
    <p class="mt-3 sm:mt-4 text-xs text-slate-500 leading-relaxed">
      At current operational behavior
    </p>
  </div>
</template>
