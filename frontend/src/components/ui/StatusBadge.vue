<script setup lang="ts">
import { computed } from 'vue';
import type { RiskSeverity } from '../../types';

const props = defineProps<{
  severity: RiskSeverity;
  size?: 'sm' | 'md';
}>();

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-medium rounded-full border';
  const sizeClass = props.size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  const colorClass = {
    LOW: 'severity-low',
    MODERATE: 'severity-moderate',
    HIGH: 'severity-high',
    CRITICAL: 'severity-critical',
  }[props.severity];

  return `${base} ${sizeClass} ${colorClass}`;
});
</script>

<template>
  <span :class="badgeClasses">
    {{ severity }}
  </span>
</template>
