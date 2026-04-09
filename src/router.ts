import { createRouter, createWebHistory } from 'vue-router';
import Landing from './views/Landing.vue';
import Describe from './views/Describe.vue';
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
      meta: { width: 420, align: 'center', stepLabel: 'Sign in', step: 0 },
    },
    {
      path: '/describe',
      name: 'describe',
      component: Describe,
      meta: { width: 560, align: 'center', stepLabel: 'Describe', step: 1 },
    },
    {
      path: '/review',
      name: 'review',
      component: Review,
      meta: { width: 1040, align: 'top', stepLabel: 'Review', step: 2 },
    },
    {
      path: '/success',
      name: 'success',
      component: Success,
      meta: { width: 460, align: 'center', stepLabel: 'Live', step: 3 },
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
