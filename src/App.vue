<template>
  <div class="app-shell">
    <GlassNav v-if="isLoggedIn" />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import GlassNav from "./components/GlassNav.vue";
import { useUser } from "./stores/user.js";
import { useTheme } from "./stores/theme.js";

const router = useRouter();
const { user, isLoggedIn, isAdmin, fetchMe } = useUser();
const { theme } = useTheme();

// Auth guard: redirect to landing if not logged in
watch([isLoggedIn, isAdmin], ([loggedIn, admin]) => {
  const route = router.currentRoute.value;
  if (route.meta.requiresAuth && !loggedIn) {
    router.push("/");
  }
  if (route.meta.requiresAdmin && !admin) {
    router.push("/gallery");
  }
});

onMounted(async () => {
  document.documentElement.setAttribute("data-theme", theme.value);
  await fetchMe();

  // After loading user, check auth
  const route = router.currentRoute.value;
  if (route.meta.requiresAuth && !isLoggedIn.value) {
    router.push("/");
  }
  if (route.meta.requiresAdmin && !isAdmin.value) {
    router.push("/gallery");
  }

  // If user is logged in and on landing, redirect to gallery
  if (route.path === "/" && isLoggedIn.value) {
    router.push("/gallery");
  }
});
</script>
