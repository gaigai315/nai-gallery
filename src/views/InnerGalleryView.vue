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
      <button class="btn-outline" @click="fetchGallery">Retry</button>
    </div>

    <template v-else>
    <div class="gallery-header">
      <h1>{{ batchName }}</h1>
      <p>{{ summary }}</p>
      <div class="inner-view-toggle">
        <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">Grid</button>
        <button :class="{ active: viewMode === 'flip' }" @click="viewMode = 'flip'">Flip</button>
      </div>
    </div>

    <ImageGrid
      v-if="viewMode === 'grid'"
      :images="images"
      @open="openDetail"
    />

    <FlipBook
      v-if="viewMode === 'flip'"
      :images="images"
      @open="openDetail"
    />

    <DetailView
      :visible="detailVisible"
      :image="selectedImage"
      @close="detailVisible = false"
      @download="handleDownload"
      @favorite="handleFavorite"
    />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { apiFetch } from "../lib/api.js";
import ImageGrid from "../components/ImageGrid.vue";
import FlipBook from "../components/FlipBook.vue";
import DetailView from "../components/DetailView.vue";

const route = useRoute();
const batchName = ref("");
const images = ref([]);
const loading = ref(true);
const error = ref("");

const viewMode = ref("grid");
const detailVisible = ref(false);
const selectedImage = ref(null);

const summary = computed(() =>
  images.value.length ? `${images.value.length} artworks` : ""
);

async function fetchGallery() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch(`/api/gallery/${route.params.batchId}`);
    batchName.value = data.batch?.batch_name || "";
    images.value = data.images || [];
  } catch (e) {
    if (e.code === "not_unlocked") {
      router.replace("/gallery");
      return;
    }
    error.value = e.message || "Failed to load gallery";
  } finally {
    loading.value = false;
  }
}

function openDetail(image) {
  selectedImage.value = image;
  detailVisible.value = true;
}

async function handleDownload(image, asset = "image") {
  try {
    const data = await apiFetch("/api/download", {
      method: "POST",
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
  const newState = !image.is_favorite;
  try {
    await apiFetch("/api/favorite", {
      method: "POST",
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
    alert(e.message || "Failed to update favorite");
  }
}

onMounted(() => {
  window.scrollTo(0, 0);
  fetchGallery();
});

// Re-fetch when batchId changes (e.g. browser back/forward)
watch(() => route.params.batchId, () => {
  if (route.params.batchId) {
    fetchGallery();
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
