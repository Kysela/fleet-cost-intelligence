<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAnalyticsStore } from '../stores';

const analyticsStore = useAnalyticsStore();

// Format date for input
function formatDateForInput(isoString: string): string {
  return isoString.split('T')[0] ?? '';
}

// Local state
const startDate = ref(formatDateForInput(analyticsStore.dateRange.start));
const endDate = ref(formatDateForInput(analyticsStore.dateRange.end));

// Watch for external changes
watch(
  () => analyticsStore.dateRange,
  (newRange) => {
    startDate.value = formatDateForInput(newRange.start);
    endDate.value = formatDateForInput(newRange.end);
  }
);

function applyDateRange() {
  const start = new Date(startDate.value);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate.value);
  end.setHours(23, 59, 59, 999);
  
  analyticsStore.setDateRange(start.toISOString(), end.toISOString());
}

// Quick presets
function setPreset(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  
  startDate.value = formatDateForInput(start.toISOString());
  endDate.value = formatDateForInput(end.toISOString());
  
  analyticsStore.setDateRange(start.toISOString(), end.toISOString());
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
    <!-- Preset buttons -->
    <div class="flex items-center gap-1">
      <button
        @click="setPreset(1)"
        class="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
      >
        24h
      </button>
      <button
        @click="setPreset(7)"
        class="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
      >
        7d
      </button>
      <button
        @click="setPreset(30)"
        class="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
      >
        30d
      </button>
    </div>

    <!-- Date inputs -->
    <div class="flex items-center gap-1 sm:gap-2 text-sm">
      <input
        v-model="startDate"
        type="date"
        class="flex-1 sm:flex-none w-full sm:w-auto px-2 py-1 text-xs sm:text-sm border border-slate-300 rounded focus:ring-2 focus:ring-fleet-500 focus:border-fleet-500"
      />
      <span class="text-slate-400 text-xs">to</span>
      <input
        v-model="endDate"
        type="date"
        class="flex-1 sm:flex-none w-full sm:w-auto px-2 py-1 text-xs sm:text-sm border border-slate-300 rounded focus:ring-2 focus:ring-fleet-500 focus:border-fleet-500"
      />
      <button
        @click="applyDateRange"
        class="px-2 sm:px-3 py-1 bg-fleet-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-fleet-700 transition-colors flex-shrink-0"
      >
        Apply
      </button>
    </div>
  </div>
</template>
