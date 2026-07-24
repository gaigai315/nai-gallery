<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />
    <div class="placeholder">
      <div class="ph-icon">{{ icon }}</div>
      <h2>{{ title }}</h2>
      <p>&#24320;&#21457;&#20013;&#65292;&#25964;&#35831;&#26399;&#24453;</p>
      <router-link to="/other" class="back-link">&#8592; &#36820;&#22238;</router-link>
    </div>
    <SearchOverlay v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import ModuleNav from "../components/ModuleNav.vue";
import SearchOverlay from "../components/SearchOverlay.vue";

defineProps({
  title: { type: String, default: "" },
  icon: { type: String, default: "&#9670;" },
});

const searchOpen = ref(false);
</script>

<style scoped>
.module-page { padding-top: 0; padding-bottom: 100px; }
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 24px;
  gap: 16px;
}
.ph-icon { font-size: 48px; opacity: 0.3; }
.placeholder h2 { font-size: 22px; font-weight: 500; letter-spacing: 2px; }
.placeholder p { font-size: 13px; opacity: 0.4; }
.back-link { margin-top: 20px; font-size: 13px; color: var(--text); opacity: 0.5; text-decoration: none; transition: opacity 0.3s; }
.back-link:hover { opacity: 0.8; }
</style>
