<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import DateRangePicker from './DateRangePicker.vue';

const router = useRouter();
const route = useRoute();

const currentTab = computed(() => {
  if (route.name === 'live-map') return 'live-map';
  return 'overview';
});

function navigateTo(name: string) {
  router.push({ name });
}
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Main header row -->
      <div class="flex items-center justify-between h-14 sm:h-16">
        <!-- Logo & Title -->
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-fleet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="min-w-0">
            <h1 class="text-sm sm:text-lg font-bold text-slate-900 truncate">Fleet Intelligence</h1>
            <p class="text-xs text-slate-500 hidden sm:block">AI-Powered Operations</p>
          </div>
        </div>

        <!-- Navigation Tabs (hidden on small mobile, shown on sm+) -->
        <nav class="hidden sm:block">
          <div class="nav-tab-group">
            <button
              @click="navigateTo('overview')"
              :class="[
                'nav-tab text-xs sm:text-sm',
                currentTab === 'overview' && 'nav-tab-active'
              ]"
            >
              <span class="flex items-center gap-1 sm:gap-2">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Overview
              </span>
            </button>
            <button
              @click="navigateTo('live-map')"
              :class="[
                'nav-tab text-xs sm:text-sm',
                currentTab === 'live-map' && 'nav-tab-active'
              ]"
            >
              <span class="flex items-center gap-1 sm:gap-2">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Live Map
              </span>
            </button>
          </div>
        </nav>

        <!-- Desktop Date Range -->
        <div class="hidden lg:block">
          <DateRangePicker />
        </div>
      </div>

      <!-- Mobile navigation row -->
      <div class="flex sm:hidden items-center justify-between py-2 border-t border-slate-100">
        <div class="nav-tab-group">
          <button
            @click="navigateTo('overview')"
            :class="[
              'nav-tab text-xs',
              currentTab === 'overview' && 'nav-tab-active'
            ]"
          >
            Overview
          </button>
          <button
            @click="navigateTo('live-map')"
            :class="[
              'nav-tab text-xs',
              currentTab === 'live-map' && 'nav-tab-active'
            ]"
          >
            Live Map
          </button>
        </div>
      </div>

      <!-- Tablet/Mobile Date Range row -->
      <div class="lg:hidden py-2 border-t border-slate-100">
        <DateRangePicker />
      </div>
    </div>
  </header>
</template>
