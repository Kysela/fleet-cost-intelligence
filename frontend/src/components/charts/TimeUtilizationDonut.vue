<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { useAnalyticsStore } from '../../stores';

use([CanvasRenderer, PieChart, TooltipComponent]);

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

const chartOption = computed(() => {
  const { idle, moving } = analyticsStore.idleVsMovingRatio;
  const mobile = isMobile.value;

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {d}%',
      confine: true,
    },
    series: [
      {
        name: 'Time Utilization',
        type: 'pie',
        radius: mobile ? [35, 55] : [50, 75],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{a|${moving.toFixed(0)}%}\n{b|Moving}`,
          rich: {
            a: {
              fontSize: mobile ? 18 : 26,
              fontWeight: 'bold',
              color: '#0ea5e9',
              lineHeight: mobile ? 22 : 30,
            },
            b: {
              fontSize: mobile ? 9 : 11,
              color: '#64748b',
              padding: [2, 0, 0, 0],
            },
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: moving,
            name: 'Moving',
            itemStyle: { color: '#0ea5e9' },
          },
          {
            value: idle,
            name: 'Idle',
            itemStyle: { color: '#f59e0b' },
          },
        ],
      },
    ],
  };
});
</script>

<template>
  <div class="kpi-card">
    <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2 sm:mb-3">
      Fleet Time Utilization
    </h3>
    
    <div v-if="!analyticsStore.hasFleetData" class="h-[140px] sm:h-[180px] flex items-center justify-center text-slate-500 text-sm">
      No data available
    </div>
    
    <template v-else>
      <v-chart
        :option="chartOption"
        class="w-full"
        :style="{ height: isMobile ? '140px' : '180px' }"
        autoresize
      />
      
      <div class="flex justify-center gap-4 sm:gap-6 mt-1 sm:mt-2 text-xs sm:text-sm text-slate-600">
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-sky-500"></span>
          Moving {{ analyticsStore.idleVsMovingRatio.moving.toFixed(0) }}%
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500"></span>
          Idle {{ analyticsStore.idleVsMovingRatio.idle.toFixed(0) }}%
        </span>
      </div>
    </template>
  </div>
</template>
