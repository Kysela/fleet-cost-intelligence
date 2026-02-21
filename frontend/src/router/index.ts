/**
 * Vue Router Configuration
 */

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'overview',
    component: () => import('../views/FleetOverview.vue'),
    meta: { title: 'Fleet Overview' },
  },
  {
    path: '/vehicle/:id',
    name: 'vehicle-detail',
    component: () => import('../views/VehicleDetail.vue'),
    meta: { title: 'Vehicle Detail' },
    props: true,
  },
  {
    path: '/live-map',
    name: 'live-map',
    component: () => import('../views/LiveMap.vue'),
    meta: { title: 'Live Map' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Update document title on navigation
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} | Fleet Intelligence` : 'Fleet Intelligence';
  next();
});

// Prefetch commonly accessed routes after initial load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Prefetch vehicle detail and live map routes
      router.getRoutes().forEach(route => {
        if (route.name === 'vehicle-detail' || route.name === 'live-map') {
          if (route.components?.default) {
            // TypeScript doesn't know about the Promise return from dynamic imports
            const component = route.components.default as () => Promise<unknown>;
            if (typeof component === 'function') {
              component();
            }
          }
        }
      });
    }, 2000); // Prefetch after 2 seconds
  });
}

export default router;
