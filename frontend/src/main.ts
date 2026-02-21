/**
 * Vue Application Entry Point
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

// Create app
const app = createApp(App);

// Install plugins
app.use(createPinia());
app.use(router);

// Mount
app.mount('#app');
