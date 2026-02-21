/**
 * Intelligence Store
 * 
 * Manages AI-powered insights.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '../services/api';
import { useAnalyticsStore } from './analyticsStore';
import type {
  AIInsightsResponse,
  TopRiskAssessment,
  AIRecommendation,
} from '../types';

export const useIntelligenceStore = defineStore('intelligence', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const insights = ref<AIInsightsResponse | null>(null);
  const source = ref<'llm' | 'fallback' | null>(null);
  const aiAvailable = ref<boolean>(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  const hasInsights = computed(() => insights.value !== null);

  const executiveSummary = computed(() => {
    return insights.value?.executiveSummary ?? null;
  });

  const topRisk = computed((): TopRiskAssessment | null => {
    return insights.value?.topRisk ?? null;
  });

  const costImpactExplanation = computed(() => {
    return insights.value?.costImpactExplanation ?? null;
  });

  const recommendations = computed((): AIRecommendation[] => {
    return insights.value?.recommendations ? [...insights.value.recommendations] : [];
  });

  const topRecommendation = computed((): AIRecommendation | null => {
    if (!insights.value?.recommendations?.length) return null;
    return insights.value.recommendations[0] ?? null;
  });

  const aiHealthScore = computed(() => {
    return insights.value?.fleetHealthScore ?? 0;
  });

  const priorityScore = computed(() => {
    return insights.value?.priorityScore ?? 0;
  });

  const isFromLLM = computed(() => source.value === 'llm');

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async function fetchInsights() {
    const analyticsStore = useAnalyticsStore();

    // Require fleet data before fetching insights
    if (!analyticsStore.hasFleetData || !analyticsStore.fleetMetrics || !analyticsStore.fleetCosts) {
      error.value = 'Fleet analytics must be loaded before fetching insights';
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await api.getAIInsights({
        vehicleMetrics: analyticsStore.vehicleMetrics,
        fleetMetrics: analyticsStore.fleetMetrics,
        fleetCosts: analyticsStore.fleetCosts,
      });

      insights.value = response.insights;
      source.value = response.source;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch AI insights';
      console.error('[intelligenceStore] fetchInsights error:', e);
    } finally {
      loading.value = false;
    }
  }

  async function checkAIStatus() {
    try {
      const response = await api.getAIStatus();
      aiAvailable.value = response.available;
    } catch (e) {
      aiAvailable.value = false;
      console.error('[intelligenceStore] checkAIStatus error:', e);
    }
  }

  function clearInsights() {
    insights.value = null;
    source.value = null;
    error.value = null;
  }

  function clearError() {
    error.value = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    insights,
    source,
    aiAvailable,
    loading,
    error,

    // Getters
    hasInsights,
    executiveSummary,
    topRisk,
    costImpactExplanation,
    recommendations,
    topRecommendation,
    aiHealthScore,
    priorityScore,
    isFromLLM,

    // Actions
    fetchInsights,
    checkAIStatus,
    clearInsights,
    clearError,
  };
});
