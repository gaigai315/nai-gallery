import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Landing",
    component: () => import("./views/LandingView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/gallery",
    name: "Gallery",
    component: () => import("./views/GalleryView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/gallery/:batchId",
    name: "InnerGallery",
    component: () => import("./views/InnerGalleryView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/favorites",
    name: "Favorites",
    component: () => import("./views/FavoritesView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("./views/AdminView.vue"),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});