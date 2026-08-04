<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div v-if="visible" class="search-overlay" @click.self="close">
        <div class="search-panel">
          <button class="search-close" @click="close" title="关闭搜索">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          <div class="search-header">
            <div class="search-input-wrap">
              <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                class="search-input"
                placeholder="搜索串名、提示词..."
                @input="onInput"
                @keydown.escape="close"
              />
            </div>
           <div class="search-type-toggle">
             <button :class="{ active: searchType === 'prompt' }" @click="searchType = 'prompt'">画师串</button>
             <button :class="{ active: searchType === 'batch' }" @click="searchType = 'batch'">批次名</button>
             <button :class="{ active: searchType === 'vibe' }" @click="searchType = 'vibe'">Vibe</button>
             <button :class="{ active: searchType === 'prompt_post' }" @click="searchType = 'prompt_post'">提示词帖</button>
           </div>
          </div>

         <div class="search-results" v-if="!loading && results.length > 0">
           <template v-if="searchType === 'vibe' || searchType === 'prompt_post'">
             <div
               v-for="item in results"
               :key="item.id"
               class="result-card result-text-card"
               @click="goToPost(item)"
             >
               <div class="result-meta">
                 <div class="result-prompt">{{ item.title }}</div>
                 <div class="result-batch">{{ item.content_preview }}</div>
               </div>
             </div>
           </template>
           <template v-else-if="searchType === 'prompt'">
             <div
               v-for="item in results"
               :key="item.image_id"
                class="result-card"
                @click="goTo(item)"
              >
                <img :src="item.preview_url" class="result-thumb" loading="lazy" />
                <div class="result-meta">
                  <div class="result-prompt">{{ item.prompt_preview }}</div>
                  <div class="result-batch">{{ item.batch_name }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <div
                v-for="item in results"
                :key="item.batch_id"
                class="result-card result-batch-card"
                @click="goToBatch(item)"
              >
                <img :src="item.cover_url" class="result-thumb" loading="lazy" />
                <div class="result-meta">
                  <div class="result-prompt">{{ item.batch_name }}</div>
                </div>
              </div>
            </template>
          </div>

          <div class="search-status" v-if="loading">
            <div class="skeleton-strip"></div>
            <div class="skeleton-strip short"></div>
          </div>

          <div class="search-status" v-else-if="searched && results.length === 0">
            <p class="status-empty">未找到</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { apiFetch } from "../lib/api.js";

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "close"]);

const router = useRouter();
const inputRef = ref(null);
const query = ref("");
const searchType = ref("prompt");
const results = ref([]);
const loading = ref(false);
const searched = ref(false);

let debounceTimer;

function close() {
  emit("update:visible", false);
}

function onInput() {
  clearTimeout(debounceTimer);
  const q = query.value.trim();
  if (!q) {
    results.value = [];
    searched.value = false;
    return;
  }
  debounceTimer = setTimeout(() => doSearch(q), 300);
}

async function doSearch(q) {
  loading.value = true;
  searched.value = true;
  try {
    const data = await apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=${searchType.value}`);
    results.value = data.results || [];
  } catch {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function goTo(item) {
  close();
  router.push(`/gallery/${item.batch_id}?image=${item.image_id}`);
}

function goToBatch(item) {
  close();
  router.push(`/gallery/${item.batch_id}`);
}

function goToPost(item) {
  close();
  if (item.type === "vibe") router.push(`/vibe/${item.id}`);
  else router.push(`/prompts/${item.id}`);
}

watch(searchType, () => {
  if (query.value.trim()) doSearch(query.value.trim());
});

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => inputRef.value?.focus());
  } else {
    query.value = "";
    results.value = [];
    searched.value = false;
  }
});
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
}

.search-panel {
  width: 90%;
  max-width: 720px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.search-close {
  position: absolute;
  top: 32px;
  right: 32px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  transition: background 0.3s;
}
.search-close:hover { background: var(--glass-border); }
.search-close svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 2; fill: none; }

.search-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 12px 20px;
  gap: 12px;
}

.search-icon {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 16px;
  letter-spacing: 1px;
}
.search-input::placeholder { opacity: 0.4; }

.search-type-toggle {
  display: flex;
  gap: 8px;
}

.search-type-toggle button {
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.3s;
  opacity: 0.6;
}
.search-type-toggle button.active {
  opacity: 1;
  background: var(--glass-border);
}

.search-results {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  overflow-y: auto;
  padding-bottom: 24px;
}

@media (max-width: 600px) {
  .search-results { grid-template-columns: repeat(2, 1fr); }
}

.result-card {
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  transition: transform 0.2s, border-color 0.2s;
}
.result-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); }

.result-thumb {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  display: block;
}

.result-meta {
  padding: 8px 10px;
}

.result-prompt {
  font-size: 11px;
  line-height: 1.3;
  opacity: 0.9;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.result-batch {
  font-size: 10px;
  opacity: 0.5;
  margin-top: 4px;
}

.result-batch-card .result-meta { padding: 10px; text-align: center; }
.result-batch-card .result-prompt { font-size: 13px; }

.result-text-card {
  grid-column: span 4;
}
.result-text-card .result-meta { padding: 14px 16px; }
.result-text-card .result-prompt { font-size: 14px; font-weight: 500; }
.result-text-card .result-batch {
  font-size: 12px;
  opacity: 0.5;
  margin-top: 6px;
  line-height: 1.4;
}

.search-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
}

.skeleton-strip {
  width: 200px;
  height: 14px;
  border-radius: 8px;
  background: var(--glass-bg);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-strip.short { width: 120px; }

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.status-empty {
  font-size: 14px;
  opacity: 0.4;
  letter-spacing: 2px;
}

.search-fade-enter-active { transition: opacity 0.2s ease; }
.search-fade-enter-active .search-panel { transition: transform 0.25s ease, opacity 0.25s ease; }
.search-fade-leave-active { transition: opacity 0.2s ease; }
.search-fade-leave-active .search-panel { transition: transform 0.2s ease, opacity 0.2s ease; }
.search-fade-enter-from { opacity: 0; }
.search-fade-enter-from .search-panel { transform: translateY(-20px); opacity: 0; }
.search-fade-leave-to { opacity: 0; }
.search-fade-leave-to .search-panel { transform: translateY(-10px); opacity: 0; }
</style>
