import { createRouter, createWebHistory } from 'vue-router';
import Landing from './views/Landing.vue';
import Describe from './views/Describe.vue';
import Examples from './views/Examples.vue';
import Processing from './views/Processing.vue';
import Review from './views/Review.vue';
import Success from './views/Success.vue';
import History from './views/History.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: Landing,
      meta: { width: 480, align: 'center', stepLabel: 'Sign in', step: 0 },
    },
    {
      path: '/describe',
      name: 'describe',
      component: Describe,
      meta: { width: 580, align: 'center', stepLabel: 'Describe', step: 1 },
    },
    {
      path: '/examples',
      name: 'examples',
      component: Examples,
      meta: { width: 720, align: 'top', stepLabel: 'Examples', step: 1 },
    },
    {
      path: '/review',
      name: 'review',
      component: Review,
      meta: { width: 960, align: 'top', stepLabel: 'Review', step: 2 },
    },
    {
      path: '/processing',
      name: 'processing',
      component: Processing,
      meta: { width: 580, align: 'center', stepLabel: 'Processing', step: 2 },
    },
    {
      path: '/success',
      name: 'success',
      component: Success,
      meta: { width: 480, align: 'center', stepLabel: 'Live', step: 3 },
    },
    {
      path: '/history',
      name: 'history',
      component: History,
      meta: { width: 720, align: 'top', stepLabel: 'History', step: 0 },
    },
  ],
});

export default router;
