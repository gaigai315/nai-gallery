<template>
 <div id="favorites-view" class="view-container active">
   <router-link to="/gallery" class="fv-back" title="返回画廊">
     <svg viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
     <span>返回画廊</span>
   </router-link>
   <h2 class="fv-title">My Favorites</h2>

    <div v-if="loading" class="fv-status">
      <div class="skeleton-strip"></div>
      <div class="skeleton-strip short"></div>
    </div>

    <div v-else-if="error" class="fv-status">
      <p class="status-error">{{ error }}</p>
      <button class="btn-outline" @click="fetchFavorites">重试</button>
    </div>

    <div v-else-if="!items.length" class="fv-status">
      <p class="status-empty">暂无收藏</p>
      <p class="status-sub">浏览批次时点击心形图标收藏喜欢的图片</p>
    </div>

    <div v-else class="fv-grid">
      <div
        v-for="item in items"
        :key="item.image_id"
        class="fv-card"
        @click="goToGallery(item)"
      >
        <img :src="item.preview_url" :alt="item.prompt_preview" loading="lazy" />
        <div class="fv-meta">
          <span class="fv-batch">{{ item.batch_name }}</span>
          <span class="fv-prompt">{{ item.prompt_preview || '无描述' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { apiFetch } from "../lib/api.js";

const router = useRouter();
const items = ref([]);
const loading = ref(true);
const error = ref("");

async function fetchFavorites() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch("/api/my-favorites");
    items.value = data.favorites || [];
  } catch (e) {
    error.value = e.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

function goToGallery(item) {
  router.push("/gallery/" + item.batch_id + "?image=" + item.image_id);
}

onMounted(fetchFavorites);
</script>

<style scoped>
#favorites-view {
  padding-top: 100px;
  padding-bottom: 100px;
  max-width: 1000px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.fv-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
  opacity: 0.5;
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 12px;
  transition: opacity 0.3s;
}
.fv-back:hover { opacity: 1; }
.fv-back svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}

.fv-title {
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 2px;
  margin-bottom: 40px;
  text-align: center;
}

.fv-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 24px;
}

.skeleton-strip {
  width: 280px;
  height: 16px;
  border-radius: 8px;
  background: var(--glass-bg);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-strip.short { width: 160px; }
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.status-error { font-size: 14px; opacity: 0.7; color: #c0392b; }
.status-empty { font-size: 14px; opacity: 0.5; letter-spacing: 2px; }
.status-sub { font-size: 12px; opacity: 0.35; }

.btn-outline {
  padding: 10px 24px; border-radius: 20px;
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  color: var(--text); cursor: pointer; font-size: 13px; letter-spacing: 1px;
}
.btn-outline:hover { background: var(--glass-border); }

.fv-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.fv-card {
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}
.fv-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px var(--shadow);
}
.fv-card img {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
  display: block;
}
.fv-meta {
  padding: 10px 12px;
}
.fv-batch {
  display: block;
  font-size: 11px;
  opacity: 0.5;
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.fv-prompt {
  display: block;
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 900px) {
  .fv-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .fv-grid { grid-template-columns: repeat(2, 1fr); }
  #favorites-view { padding-top: 80px; }
}
</style>
