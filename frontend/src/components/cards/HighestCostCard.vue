<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { VehicleCostEstimation } from '../../types';

const props = defineProps<{
  vehicle: VehicleCostEstimation | null;
  loading?: boolean;
}>();

const router = useRouter();

const formattedAnnualCost = computed(() => {
  if (!props.vehicle) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(props.vehicle.annualProjectedLoss);
});

const formattedMonthlyCost = computed(() => {
  if (!props.vehicle) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(props.vehicle.monthlyProjectedIdleCost);
});

function viewVehicle() {
  if (props.vehicle) {
    router.push({ name: 'vehicle-detail', params: { id: props.vehicle.vehicleId } });
  }
}
</script>

<template>
  <div class="kpi-card">
    <p class="kpi-label">Highest Cost Vehicle</p>
    
    <div v-if="loading" class="mt-2">
      <div class="h-8 w-16 sm:w-20 skeleton"></div>
      <div class="h-6 w-20 sm:w-24 skeleton mt-2"></div>
    </div>
    
    <div v-else-if="vehicle" class="mt-2">
      <p class="text-xl sm:text-2xl font-bold text-slate-900 truncate">
        {{ vehicle.vehicleId }}
      </p>
      <p class="text-base sm:text-lg font-semibold text-amber-600">
        {{ formattedAnnualCost }}<span class="text-xs sm:text-sm font-normal text-slate-500">/year</span>
      </p>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">
        {{ formattedMonthlyCost }}/month idle
      </p>
      
      <button
        @click="viewVehicle"
        class="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-fleet-600 hover:text-fleet-800 flex items-center gap-1"
      >
        View Details
        <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
    
    <div v-else class="mt-2 text-sm text-slate-500">
      No data available
    </div>
  </div>
</template>
