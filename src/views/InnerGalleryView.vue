<template>
  <div id="inner-gallery-view" class="view-container active">
    <router-link to="/gallery" class="icon-btn back-btn">
      <svg viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
    </router-link>

    <div v-if="loading" class="gallery-status">
      <div class="skeleton-strip"></div>
      <div class="skeleton-strip short"></div>
    </div>

    <div v-else-if="error" class="gallery-status">
      <p class="status-error">{{ error }}</p>
      <button class="btn-outline" @click="fetchGallery">重试</button>
    </div>

    <template v-else-if="!error">
    <div class="gallery-header">
      <h1>{{ batchName }}</h1>
      <p v-if="batchNotes" class="batch-notes">{{ batchNotes }}</p>
      <p>{{ summary }}</p>
      <div class="inner-view-toggle">
        <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">网格</button>
        <button :class="{ active: viewMode === 'flip' }" @click="viewMode = 'flip'">翻页</button>
      </div>
    </div>

    <ImageGrid
      v-if="viewMode === 'grid'"
      :images="images"
      :group-data="groupsData"
      @open="openDetail"
    />

    <!-- Infinite scroll sentinel (grid only) -->
    <div
      v-if="viewMode === 'grid'"
      ref="sentinelRef"
      class="scroll-sentinel"
    />

    <!-- Loading more indicator -->
    <div v-if="loadingMore" class="loading-more">
      <div class="skeleton-strip"></div>
      <div class="skeleton-strip short"></div>
    </div>

    <FlipBook
      v-if="viewMode === 'flip'"
      :images="images"
      @open="openDetail"
    />

    <DetailView
      :key="selectedImage?.image_id"
      :visible="detailVisible"
      :image="selectedImage"
      :group="selectedGroup"
      @close="detailVisible = false"
      @download="handleDownload"
      @favorite="handleFavorite"
      @navigate="navigateInGroup"
    />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getLocalRecord, isLocalId } from "../lib/localImport.js";
import { apiFetch } from "../lib/api.js";
import ImageGrid from "../components/ImageGrid.vue";
import FlipBook from "../components/FlipBook.vue";
import DetailView from "../components/DetailView.vue";

const route = useRoute();
const router = useRouter();
const batchName = ref("");
const batchNotes = ref("");
const images = ref([]);
const groupsData = ref([]);
const total = ref(0);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref("");
const sentinelRef = ref(null);
let observer = null;

const viewMode = ref("grid");
const detailVisible = ref(false);
const selectedImage = ref(null);
const selectedGroup = ref(null);

const summary = computed(() => {
  const count = total.value || images.value.length;
  return count ? `${count} 张作品` : "";
});
const hasMore = computed(() => images.value.length < total.value);

async function fetchGallery(opts = {}) {
  const isFirst = opts.offset === 0 || opts.offset === undefined;
  if (isFirst) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }
  error.value = "";

  const limit = opts.limit ?? (route.query.image ? 9999 : 50);
  const offset = opts.offset ?? 0;

  try {
    if (isLocalId(route.params.batchId)) {
      const local = await getLocalRecord(route.params.batchId);
      if (!local) throw new Error("找不到本地画廊");
      batchName.value = local.batch_name || "本地导入";
      batchNotes.value = local.notes || "仅保存在当前浏览器";
      total.value = local.images?.length || 0;
      groupsData.value = [];
      images.value = local.images || [];
      if (route.query.image) {
        const target = images.value.find((img) => img.image_id === route.query.image);
        if (target) setTimeout(() => openDetail(target, null), 100);
      }
      return;
    }
    const data = await apiFetch(
      `/api/gallery/${encodeURIComponent(route.params.batchId)}?limit=${limit}&offset=${offset}`
    );
    batchName.value = data.batch?.batch_name || "";
    batchNotes.value = data.batch?.notes || "";
    total.value = data.total || 0;
    groupsData.value = data.groups || [];

    if (isFirst) {
      images.value = data.images || [];
    } else {
      images.value = [...images.value, ...(data.images || [])];
    }

    // Auto-open from query param after full load
    if (isFirst && route.query.image) {
      const targetId = route.query.image;
      const targetImage = images.value.find((img) => img.image_id === targetId);
      if (targetImage) {
        const groupMap = new Map();
        for (const img of images.value) {
          const key = img.group_id || img.positive_prompt || img.prompt_preview || img.image_id;
          if (!groupMap.has(key)) groupMap.set(key, { key, images: [] });
          groupMap.get(key).images.push(img);
        }
        const targetKey = targetImage.group_id || targetImage.positive_prompt || targetImage.prompt_preview || targetImage.image_id;
        const targetGroup = groupMap.get(targetKey) || null;
        setTimeout(() => openDetail(targetImage, targetGroup), 100);
      }
    }
  } catch (e) {
    if (e.code === "not_unlocked") {
      router.replace("/gallery");
      return;
    }
    error.value = e.message || "加载画廊失败";
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function openDetail(image, group) {
  selectedImage.value = image;
  selectedGroup.value = group || null;
  detailVisible.value = true;
}

function navigateInGroup(dir) {
  if (!selectedGroup.value) return;
  const imgs = selectedGroup.value.images;
  const idx = imgs.findIndex(i => i.image_id === selectedImage.value.image_id);
  if (idx === -1) return;
  const next = idx + dir;
  if (next < 0 || next >= imgs.length) return;
  selectedImage.value = imgs[next];
}

async function handleDownload(image, asset = "image") {
  if (isLocalId(image?.batch_id)) {
    const url = image.download_url || image.preview_url;
    if (url) { const a = document.createElement("a"); a.href = url; a.download = image.image_id || "image"; a.click(); }
    return;
  }
  try {
    const data = await apiFetch("/api/download", {
      method: "POST",
      silent: true,
      body: JSON.stringify({
        batch_id: image.batch_id,
        image_id: image.image_id,
        asset,
      }),
    });
    if (data.url) {
      window.open(data.url, "_blank", "noopener");
    }
  } catch (e) {
    if (e.code === "rate_limited") {
      alert("Download limit reached. Please try again later.");
    } else {
      alert(e.message || "Download failed");
    }
  }
}

async function handleFavorite(image) {
  if (isLocalId(image?.batch_id)) return;
  const newState = !image.is_favorite;
  try {
    await apiFetch("/api/favorite", {
      method: "POST",
      silent: true,
      body: JSON.stringify({
        batch_id: image.batch_id,
        image_id: image.image_id,
        favorite: newState,
      }),
    });
    // Update local state optimistically after server confirms
    const idx = images.value.findIndex((i) => i.image_id === image.image_id);
    if (idx !== -1) {
      images.value[idx] = { ...images.value[idx], is_favorite: newState ? 1 : 0 };
    }
  } catch (e) {
    alert(e.message || "收藏更新失败");
  }
}

onMounted(() => {
  window.scrollTo(0, 0);
  fetchGallery({ offset: 0 });

  // IntersectionObserver for infinite scroll
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore.value && !loadingMore.value && viewMode.value === 'grid') {
          fetchGallery({ offset: images.value.length, limit: 50 });
        }
      },
      { rootMargin: "200px" }
    );
  }
});

// Watch sentinel element to observe/unobserve
watch(sentinelRef, (el) => {
  if (observer) {
    observer.disconnect();
    if (el) observer.observe(el);
  }
});

// When switching to flip mode, load all remaining images
watch(viewMode, (mode) => {
  if (mode === 'flip' && hasMore.value && !loadingMore.value) {
    fetchGallery({ offset: images.value.length, limit: 9999 });
  }
  // Re-attach sentinel observer when switching back to grid
  if (mode === 'grid' && sentinelRef.value && observer) {
    observer.disconnect();
    observer.observe(sentinelRef.value);
  }
});

// Re-fetch when batchId changes (e.g. browser back/forward)
watch(() => route.params.batchId, () => {
  if (route.params.batchId) {
    images.value = [];
    total.value = 0;
    fetchGallery({ offset: 0 });
  }
});
</script>

<style scoped>
#inner-gallery-view { padding: 100px 24px; }

.back-btn {
  position: fixed; top: 40px; right: 40px; z-index: 100;
  background: var(--glass-bg); backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  cursor: pointer; padding: 8px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.3s;
}
.back-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 1.5; fill: none; }
.back-btn:hover { background: var(--glass-border); }

.gallery-header { text-align: center; margin-bottom: 40px; }
.gallery-header h1 { font-size: 24px; font-weight: normal; letter-spacing: 4px; margin-bottom: 8px; }
.batch-notes { font-size: 13px; opacity: 0.5; letter-spacing: 1px; margin-bottom: 8px; max-width: 600px; margin-left: auto; margin-right: auto; }
.gallery-header p { font-size: 12px; opacity: 0.6; letter-spacing: 2px; }

.inner-view-toggle {
  display: inline-flex; gap: 8px; margin-top: 16px;
  background: var(--glass-bg); padding: 4px; border-radius: 20px;
  border: 1px solid var(--glass-border);
}
.inner-view-toggle button {
  background: transparent; border: none; padding: 6px 16px; border-radius: 16px;
  color: var(--text); cursor: pointer; font-size: 12px; transition: background 0.3s, font-weight 0.3s;
}
.inner-view-toggle button.active { background: var(--glass-border); font-weight: bold; }

.scroll-sentinel { height: 1px; }

.loading-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
}

.gallery-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 24px;
}

.skeleton-strip {
  width: 240px;
  height: 16px;
  border-radius: 8px;
  background: var(--glass-bg);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-strip.short {
  width: 120px;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.status-error {
  font-size: 14px;
  opacity: 0.7;
  letter-spacing: 1px;
}

.btn-outline {
  padding: 10px 24px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: background 0.3s;
}

.btn-outline:hover {
  background: var(--glass-border);
}

@media (max-width: 768px) { #inner-gallery-view { padding: 80px 16px; } }
</style>
