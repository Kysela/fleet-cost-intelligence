<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { useAnalyticsStore } from '../../stores';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);

const analyticsStore = useAnalyticsStore();

const isMobile = ref(window.innerWidth < 640);

function handleResize() {
  isMobile.value = window.innerWidth < 640;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Round to nice intervals
function niceMax(value: number): number {
  if (value <= 500) return 500;
  if (value <= 1000) return 1000;
  if (value <= 2000) return 2000;
  if (value <= 2500) return 2500;
  if (value <= 3000) return 3000;
  if (value <= 5000) return 5000;
  return Math.ceil(value / 1000) * 1000;
}

const chartOption = computed(() => {
  const costs = analyticsStore.fleetCosts?.costByVehicle ?? [];
  const mobile = isMobile.value;
  
  const sorted = [...costs].sort((a, b) => b.annualProjectedLoss - a.annualProjectedLoss);
  const maxValue = sorted.length > 0 ? Math.max(...sorted.map(c => c.annualProjectedLoss)) : 1000;
  const roundedMax = niceMax(maxValue);
  const numTicks = mobile ? 3 : 4;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const data = (params as { name: string; value: number }[])[0];
        if (!data) return '';
        return `<strong>${data.name}</strong><br/>$${Math.round(data.value).toLocaleString()}/year`;
      },
      confine: true,
    },
    grid: {
      left: mobile ? 38 : 48,
      right: 8,
      bottom: mobile ? 26 : 24,
      top: 8,
    },
    xAxis: {
      type: 'category',
      data: sorted.map((c) => c.vehicleId),
      axisLabel: {
        color: '#64748b',
        fontSize: mobile ? 8 : 10,
        rotate: 0,
        interval: 0,
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: roundedMax,
      min: 0,
      splitNumber: numTicks,
      axisLabel: {
        color: '#64748b',
        fontSize: mobile ? 8 : 10,
        formatter: (value: number) => {
          const rounded = Math.round(value);
          if (rounded >= 1000) return `$${(rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1)}k`;
          if (rounded === 0) return '$0';
          return `$${rounded}`;
        },
      },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Annual Cost',
        type: 'bar',
        data: sorted.map((c) => c.annualProjectedLoss),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#f97316' },
              { offset: 1, color: '#fb923c' },
            ],
          },
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: mobile ? 22 : 32,
        barMinWidth: 12,
      },
    ],
  };
});
</script>

<template>
  <div class="kpi-card">
    <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2 sm:mb-3">
      Annual Cost by Vehicle
    </h3>
    
    <div v-if="!analyticsStore.fleetCosts" class="h-[140px] sm:h-[180px] flex items-center justify-center text-slate-500 text-sm">
      No data available
    </div>
    
    <v-chart
      v-else
      :option="chartOption"
      class="w-full"
      :style="{ height: isMobile ? '140px' : '180px' }"
      autoresize
    />
  </div>
</template>
