<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />

    <div class="module-header">
      <h2>其他</h2>
    </div>

    <div class="other-list">
      <router-link to="/other/draw" class="other-item">
        <span class="item-icon">&#9824;</span>
        <span class="item-label">抽卡</span>
        <span class="item-desc">随机抽取一张图片串</span>
        <svg class="item-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </router-link>

      <router-link to="/other/wish" class="other-item">
        <span class="item-icon">&#9733;</span>
        <span class="item-label">许愿墙</span>
        <span class="item-desc">提交许愿，其他人可见并可回复</span>
        <svg class="item-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </router-link>

      <router-link to="/other/feedback" class="other-item">
        <span class="item-icon">&#9998;</span>
        <span class="item-label">反馈</span>
        <span class="item-desc">提交问题或建议，无需回复</span>
        <svg class="item-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </router-link>

      <router-link to="/other/about" class="other-item">
        <span class="item-icon">&#10086;</span>
        <span class="item-label">关于作者</span>
        <span class="item-desc">关于站主与 The Glasshouse</span>
        <svg class="item-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </router-link>
    </div>

    <SearchOverlay v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import ModuleNav from "../components/ModuleNav.vue";
import SearchOverlay from "../components/SearchOverlay.vue";

const searchOpen = ref(false);
</script>

<style scoped>
.module-page { padding-top: 0; padding-bottom: 100px; }

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 640px;
  margin: 0 auto 24px;
  padding: 0 24px;
}
.module-header h2 { font-size: 24px; font-weight: 500; letter-spacing: 2px; }

.other-list {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.other-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  text-decoration: none;
  color: var(--text);
  transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
  cursor: pointer;
}
.other-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--glow);
  border-color: rgba(255,255,255,0.15);
}

.item-icon { font-size: 22px; flex-shrink: 0; width: 36px; text-align: center; opacity: 0.6; }
.item-label { font-size: 15px; font-weight: 500; flex-shrink: 0; min-width: 60px; }
.item-desc { flex: 1; font-size: 12px; opacity: 0.4; }
.item-arrow { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.25; }
</style>
