<template>
  <div id="bookshelf-view" class="view-container active">
    <div class="view-toggle-bar" v-if="!loading && !error">
      <div class="inner-view-toggle">
        <button :class="{ active: isTarot }" @click="isTarot = true">Tarot</button>
        <button :class="{ active: !isTarot }" @click="isTarot = false">Grid</button>
      </div>
    </div>

    <div v-if="loading" class="gallery-status">
      <div class="skeleton-strip"></div>
      <div class="skeleton-strip short"></div>
    </div>

    <div v-else-if="error" class="gallery-status">
      <p class="status-error">{{ error }}</p>
      <button class="btn-outline" @click="fetchBatches">Retry</button>
    </div>

    <div v-else-if="!batchCards.length" class="gallery-status">
      <p class="status-empty">No batches available yet.</p>
    </div>

    <template v-else>
      <TarotDeck
        v-if="isTarot"
        :cards="batchCards"
        @unlock="openSeal"
      />
      <WaterfallGrid
        v-else
        :cards="batchCards"
        @unlock="openSeal"
      />
    </template>

    <PasswordSeal
      :visible="sealVisible"
      :batch-name="selectedBatch?.batch_name || ''"
      :batch-id="selectedBatch?.batch_id || ''"
      @close="sealVisible = false"
      @unlocked="handleUnlocked"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { apiFetch } from "../lib/api.js";
import TarotDeck from "../components/TarotDeck.vue";
import WaterfallGrid from "../components/WaterfallGrid.vue";
import PasswordSeal from "../components/PasswordSeal.vue";

const router = useRouter();

const isTarot = ref(true);
const sealVisible = ref(false);
const selectedBatch = ref(null);
const batchCards = ref([]);
const loading = ref(true);
const error = ref("");

async function fetchBatches() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch("/api/my-unlocks");
    batchCards.value = (data.batches || []).map((b) => ({
      ...b,
      cover: b.cover_url || "",
    }));
  } catch (e) {
    error.value = e.message || "Failed to load batches";
  } finally {
    loading.value = false;
  }
}

function openSeal(batch) {
  selectedBatch.value = batch;
  sealVisible.value = true;
}

function handleUnlocked(batch) {
  sealVisible.value = false;
  if (batch?.batch_id) {
    router.push(`/gallery/${batch.batch_id}`);
  }
}

onMounted(() => {
  fetchBatches();
});
</script>

<style scoped>
#bookshelf-view {
  padding-top: 100px;
  padding-bottom: 100px;
}

.view-toggle-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.inner-view-toggle {
  display: inline-flex;
  gap: 8px;
  background: var(--glass-bg);
  padding: 4px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
}

.inner-view-toggle button {
  background: transparent;
  border: none;
  padding: 6px 16px;
  border-radius: 16px;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.3s, font-weight 0.3s;
}

.inner-view-toggle button.active {
  background: var(--glass-border);
  font-weight: bold;
}

.gallery-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 24px;
}

.skeleton-strip {
  width: 280px;
  height: 16px;
  border-radius: 8px;
  background: var(--glass-bg);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-strip.short {
  width: 160px;
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

.status-empty {
  font-size: 14px;
  opacity: 0.5;
  letter-spacing: 2px;
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
</style>
