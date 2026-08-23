<template>
  <div class="app-shell">
    <GlassNav v-if="isLoggedIn" />
    <router-view v-slot="{ Component, route }">
      <Transition :name="route.meta.transition || 'page-fade'" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
    <Toast />
    <LocalImportDialog />
  </div>
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import GlassNav from "./components/GlassNav.vue";
import Toast from "./components/Toast.vue";
import LocalImportDialog from "./components/LocalImportDialog.vue";
import { initLocalImport } from "./lib/localImport.js";
import { useUser } from "./stores/user.js";
import { useTheme } from "./stores/theme.js";

const router = useRouter();
const { user, isLoggedIn, isAdmin, fetchMe } = useUser();
const { theme } = useTheme();

// Auth guard: only fire after initial fetchMe completes
let ready = false
watch([isLoggedIn, isAdmin], ([loggedIn, admin]) => {
  if (!ready) return;
  const route = router.currentRoute.value;
  if (route.meta.requiresAuth && !loggedIn) {
    router.push("/");
  }
  if (route.meta.requiresAdmin && !admin) {
    router.push("/gallery");
  }
});

onMounted(async () => {
  await initLocalImport();
  document.documentElement.setAttribute("data-theme", theme.value);
  await fetchMe();
  ready = true;

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

<style>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
