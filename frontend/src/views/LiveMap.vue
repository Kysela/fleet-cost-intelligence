<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet';
import { useVehicleStore } from '../stores';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import 'leaflet/dist/leaflet.css';

const router = useRouter();
const vehicleStore = useVehicleStore();

const refreshInterval = ref<number | null>(null);
const lastRefresh = ref<string | null>(null);

// Map center (default to NYC area)
const center = computed(() => {
  const positions = vehicleStore.livePositions;
  if (positions.length === 0) {
    return [40.7128, -74.006] as [number, number];
  }
  
  // Calculate centroid
  const lat = positions.reduce((sum, p) => sum + p.latitude, 0) / positions.length;
  const lng = positions.reduce((sum, p) => sum + p.longitude, 0) / positions.length;
  return [lat, lng] as [number, number];
});

// Load data
onMounted(async () => {
  await loadData();
  
  // Auto-refresh every 30 seconds
  refreshInterval.value = window.setInterval(async () => {
    await vehicleStore.fetchLivePositions();
    lastRefresh.value = new Date().toLocaleTimeString();
  }, 30000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

async function loadData() {
  await vehicleStore.fetchVehicles();
  await vehicleStore.fetchLivePositions();
  lastRefresh.value = new Date().toLocaleTimeString();
}

function getVehicleName(vehicleId: string): string {
  const vehicle = vehicleStore.vehicleById(vehicleId);
  return vehicle?.name ?? vehicleId;
}

function getStatusColor(ignitionOn: boolean, speed: number): string {
  if (!ignitionOn) return 'bg-slate-400';
  if (speed > 0) return 'bg-green-500';
  return 'bg-amber-500';
}

function getStatusText(ignitionOn: boolean, speed: number): string {
  if (!ignitionOn) return 'Off';
  if (speed > 0) return 'Moving';
  return 'Idle';
}

function viewVehicle(vehicleId: string) {
  router.push({ name: 'vehicle-detail', params: { id: vehicleId } });
}
</script>

<template>
  <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
      <div class="min-w-0">
        <h1 class="text-lg sm:text-2xl font-bold text-slate-900">Live Fleet Map</h1>
        <p class="text-xs sm:text-sm text-slate-500">
          Real-time positions · Auto-refresh 30s
        </p>
      </div>
      <div class="text-xs sm:text-sm text-slate-500">
        Updated: {{ lastRefresh ?? 'Loading...' }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="vehicleStore.loading && vehicleStore.livePositions.length === 0" class="flex items-center justify-center py-12 sm:py-20">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Map and List -->
    <template v-else>
      <!-- Map Container - responsive height -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px]">
        <l-map
          :zoom="12"
          :center="center"
          :use-global-leaflet="false"
          class="h-full w-full"
        >
          <l-tile-layer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            layer-type="base"
            name="OpenStreetMap"
            attribution="&copy; OpenStreetMap contributors"
          />

          <l-marker
            v-for="position in vehicleStore.livePositions"
            :key="position.vehicleId"
            :lat-lng="[position.latitude, position.longitude]"
          >
            <l-popup :options="{ closeButton: false }">
              <div class="vehicle-popup">
                <div class="popup-header-section">
                  <div class="popup-vehicle-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M8 7h8m-8 4h8m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <div class="popup-header-content">
                    <div class="popup-header-label">Vehicle</div>
                    <div class="popup-header">{{ getVehicleName(position.vehicleId) }}</div>
                  </div>
                </div>
                <div class="popup-body">
                  <div class="popup-status">
                    <span class="popup-speed">
                      {{ position.speed.toFixed(0) }}
                      <span class="popup-speed-unit">km/h</span>
                    </span>
                    <span 
                      class="popup-badge"
                      :class="{
                        'popup-badge-moving': position.ignitionOn && position.speed > 0,
                        'popup-badge-idle': position.ignitionOn && position.speed === 0,
                        'popup-badge-off': !position.ignitionOn
                      }"
                    >
                      <span class="popup-badge-dot"></span>
                      {{ getStatusText(position.ignitionOn, position.speed) }}
                    </span>
                  </div>
                  <button
                    @click="viewVehicle(position.vehicleId)"
                    class="popup-button"
                  >
                    <span>View Details</span>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </l-popup>
          </l-marker>
        </l-map>
      </div>

      <!-- Vehicle List (Compact) -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <h3 class="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2 sm:mb-3">
          Vehicle Status
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div
            v-for="item in vehicleStore.vehiclesWithPositions"
            :key="item.vehicle.id"
            @click="viewVehicle(item.vehicle.id)"
            class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <div
              :class="[
                'w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0',
                item.position
                  ? getStatusColor(item.position.ignitionOn, item.position.speed)
                  : 'bg-slate-300'
              ]"
            />
            <div class="min-w-0">
              <p class="text-xs sm:text-sm font-medium text-slate-700 truncate">
                {{ item.vehicle.id }}
              </p>
              <p class="text-xs text-slate-500 truncate">
                <template v-if="item.position">
                  {{ item.position.speed.toFixed(0) }} km/h · 
                  {{ getStatusText(item.position.ignitionOn, item.position.speed) }}
                </template>
                <template v-else>
                  No position
                </template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
