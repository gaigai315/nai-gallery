import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('./views/LandingView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('./views/GalleryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/gallery/:batchId',
    name: 'InnerGallery',
    component: () => import('./views/InnerGalleryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/vibe',
    name: 'VibeList',
    component: () => import('./views/VibeListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/vibe/:id',
    name: 'VibePost',
    component: () => import('./views/VibePostView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/prompts',
    name: 'PromptList',
    component: () => import('./views/PromptListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/prompts/:id',
    name: 'PromptPost',
    component: () => import('./views/PromptPostView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('./views/FavoritesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/other',
    name: 'Other',
    component: () => import('./views/OtherView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/other/draw',
    name: 'Draw',
    component: () => import('./views/DrawView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/other/wish',
    name: 'Wish',
    component: () => import('./views/WishView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/other/feedback',
    name: 'Feedback',
    component: () => import('./views/FeedbackView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/other/about',
    name: 'About',
    component: () => import('./views/AboutView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('./views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('./views/NotFoundView.vue'),
    meta: { requiresAuth: false },
  },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
