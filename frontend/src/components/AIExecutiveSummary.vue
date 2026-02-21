<script setup lang="ts">
import { computed } from 'vue';
import { useIntelligenceStore } from '../stores';
import StatusBadge from './ui/StatusBadge.vue';
import LoadingSpinner from './ui/LoadingSpinner.vue';

const intelligenceStore = useIntelligenceStore();

const sourceLabel = computed(() => {
  return intelligenceStore.isFromLLM ? 'AI-Powered Analysis' : 'Automated Analysis';
});

// Format the severity for display
const severityLabel = computed(() => {
  const risk = intelligenceStore.topRisk;
  if (!risk) return null;
  return {
    LOW: 'Low Priority',
    MODERATE: 'Moderate Priority',
    HIGH: 'High Priority',
    CRITICAL: 'Immediate Action Required',
  }[risk.severity];
});
</script>

<template>
  <div class="ai-panel">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-fleet-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-fleet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-semibold">Executive Summary</h3>
          <p class="text-xs text-fleet-300">{{ sourceLabel }}</p>
        </div>
      </div>
      <span class="ai-badge self-start sm:self-auto">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
        </svg>
        Intelligence
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="intelligenceStore.loading" class="flex items-center justify-center py-6 sm:py-8">
      <LoadingSpinner size="md" />
    </div>

    <!-- Error state -->
    <div v-else-if="intelligenceStore.error" class="text-red-300 text-sm break-words">
      {{ intelligenceStore.error }}
    </div>

    <!-- Content -->
    <div v-else-if="intelligenceStore.hasInsights" class="space-y-4 sm:space-y-5">
      <!-- Executive Summary Text -->
      <div class="text-fleet-100 text-sm sm:text-base leading-relaxed break-words">
        <span class="text-fleet-300 text-2xl leading-none mr-1">"</span>
        {{ intelligenceStore.executiveSummary }}
        <span class="text-fleet-300 text-2xl leading-none ml-1">"</span>
      </div>

      <!-- Top Risk - Visually Prominent -->
      <div v-if="intelligenceStore.topRisk" class="bg-fleet-800/60 rounded-lg p-3 sm:p-4 border border-fleet-700/50">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <span class="text-xs sm:text-sm font-semibold text-fleet-300 uppercase tracking-wider">Primary Concern</span>
          <StatusBadge :severity="intelligenceStore.topRisk.severity" size="sm" />
        </div>
        <p class="text-sm sm:text-base text-white font-medium break-words">
          {{ intelligenceStore.topRisk.description }}
        </p>
        <p v-if="severityLabel" class="text-xs text-fleet-400 mt-2">
          {{ severityLabel }}
        </p>
      </div>

      <!-- Priority Recommendation -->
      <div v-if="intelligenceStore.topRecommendation" class="border-t border-fleet-700/50 pt-4">
        <p class="text-xs font-semibold text-fleet-400 uppercase tracking-wider mb-2 sm:mb-3">
          Recommended Action
        </p>
        <div class="flex items-start gap-2 sm:gap-3">
          <span class="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-fleet-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white">
            1
          </span>
          <div class="min-w-0">
            <p class="text-sm sm:text-base text-white font-medium break-words">
              {{ intelligenceStore.topRecommendation.action }}
            </p>
            <p class="text-xs sm:text-sm text-fleet-300 mt-1 break-words">
              <span class="text-fleet-400">Expected outcome:</span> {{ intelligenceStore.topRecommendation.expectedImpact }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- No data state -->
    <div v-else class="text-fleet-400 text-sm py-4 text-center">
      Load fleet analytics to generate executive insights.
    </div>
  </div>
</template>
