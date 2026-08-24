<template>
  <div id="bookshelf-view" class="view-container active">
    <ModuleNav
      v-if="!loading && !error"
      :isTarot="isTarot"
      @toggleView="isTarot = !isTarot"
      @openSearch="searchOpen = true"
    />

    <div v-if="!loading && !error" class="gallery-tabs">
      <div class="gallery-segment">
        <button :class="{ active: galleryTab === 'public' }" @click="galleryTab = 'public'">公开</button>
        <button :class="{ active: galleryTab === 'local' }" @click="galleryTab = 'local'">本地</button>
      </div>
      <button v-if="galleryTab === 'local'" class="local-import-btn" title="导入本地 ZIP" @click="openLocalImport">
        <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" /></svg>
        导入本地 ZIP
      </button>
    </div>

    <div v-if="loading" class="gallery-status">
      <div class="skeleton-strip"></div>
      <div class="skeleton-strip short"></div>
    </div>

    <div v-else-if="error" class="gallery-status">
      <p class="status-error">{{ error }}</p>
      <button class="btn-outline" @click="fetchBatches">重试</button>
    </div>

    <div v-else-if="!batchCards.length" class="gallery-status">
      <p class="status-empty">{{ galleryTab === 'local' ? '暂无本地导入。' : '暂无可用批次。' }}</p>
    </div>

    <template v-else>
      <TarotDeck
        v-if="isTarot"
        :cards="batchCards"
        :isAdmin="isAdmin"
        :allowLocalDelete="localState().gallery.length > 0"
        @unlock="openSeal"
        @delete="confirmDelete"
      />
      <WaterfallGrid
        v-else
        :cards="batchCards"
        :isAdmin="isAdmin"
        :allowLocalDelete="localState().gallery.length > 0"
        @unlock="openSeal"
        @delete="confirmDelete"
      />
    </template>

    <SearchOverlay v-model:visible="searchOpen" />

    <AnnouncementModal :items="announcements" @dismiss="announcements = []" />

    <PasswordSeal
      :visible="sealVisible"
      :batch-name="selectedBatch?.batch_name || ''"
      :batch-id="selectedBatch?.batch_id || ''"
      :notes="selectedBatch?.notes || ''"
      @close="sealVisible = false"
      @unlocked="handleUnlocked"
    />

    <div v-if="timelineLabels.length" id="timeline-tooltip" ref="tooltipRef">{{ currentTimelineLabel }}</div>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-card">
          <h3>确认删除</h3>
          <p>确定要删除批次 <strong>{{ deleteTarget.batch_name }}</strong> 吗？</p>
          <img v-if="deleteTarget.cover" :src="deleteTarget.cover" class="modal-cover" />
          <p class="modal-stats">{{ deleteTarget.image_count || 0 }} 张图 · {{ deleteTarget.group_count || 0 }} 组 · {{ formatDate(deleteTarget.created_at) }}</p>
          <p class="modal-warn">此操作不可撤销，批次内所有图片将被一并删除。</p>
          <div class="modal-actions">
            <button class="btn-outline" @click="deleteTarget = null">取消</button>
            <button class="btn-danger" :disabled="deleting" @click="doDelete">{{ deleting ? '删除中...' : '确认删除' }}</button>
          </div>
          <p v-if="deleteError" class="status-error">{{ deleteError }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { apiFetch } from "../lib/api.js";
import { useUser } from "../stores/user.js";
import TarotDeck from "../components/TarotDeck.vue";
import WaterfallGrid from "../components/WaterfallGrid.vue";
import PasswordSeal from "../components/PasswordSeal.vue";
import ModuleNav from '../components/ModuleNav.vue';
import SearchOverlay from "../components/SearchOverlay.vue";
import AnnouncementModal from "../components/AnnouncementModal.vue";
import { initLocalImport, localState, isLocalId, openLocalImport, clearLocalRecords, deleteLocalRecord } from "../lib/localImport.js";

const router = useRouter();
const { isAdmin } = useUser();

const isTarot = ref(localStorage.getItem('gallery_view') !== 'grid');
const sealVisible = ref(false);
const selectedBatch = ref(null);
const galleryTab = ref('public');
const publicCards = ref([]);
const localCards = ref([]);
const loading = ref(true);
const error = ref("");
const tooltipRef = ref(null);
const currentTimelineLabel = ref("");

const searchOpen = ref(false);

const announcements = ref([]);

const deleteTarget = ref(null);
const deleting = ref(false);
const deleteError = ref("");

const batchCards = computed(() => galleryTab.value === 'local' ? localCards.value : publicCards.value);

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

const timelineLabels = computed(() => {
  return batchCards.value
    .filter(b => b.created_at)
    .map(b => {
      var d = new Date(b.created_at);
      return d.getFullYear() + " " + MONTHS[d.getMonth()];
    });
});

async function fetchBatches() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch("/api/my-unlocks");
    await initLocalImport();
    publicCards.value = (data.batches || []).map((b) => ({ ...b, cover: b.cover_url || "" }));
    localCards.value = localState().gallery
      .map((b) => ({ ...b, cover_url: b.cover, unlocked_at: true }))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  } catch (e) {
    error.value = e.message || "加载批次失败";
  } finally {
    loading.value = false;
  }
}

function openSeal(batch) {
  if (String(batch?.batch_id || "").startsWith("local:")) {
    router.push('/gallery/' + encodeURIComponent(batch.batch_id));
    return;
  }
  if (isAdmin.value || batch?.unlocked_at) {
    router.push('/gallery/' + encodeURIComponent(batch.batch_id));
  } else {
    selectedBatch.value = batch;
    sealVisible.value = true;
  }
}

function handleUnlocked(batch) {
  sealVisible.value = false;
  // Update local state so the batch card reflects the unlock immediately,
  // avoiding a re-prompt when the user returns to the gallery view.
  const idx = publicCards.value.findIndex((b) => b.batch_id === batch?.batch_id);
  if (idx !== -1) {
    publicCards.value[idx] = {
      ...publicCards.value[idx],
      unlocked_at: new Date().toISOString(),
    };
  }
  if (batch?.batch_id) {
    router.push('/gallery/' + encodeURIComponent(batch.batch_id));
  }
}

function confirmDelete(batch) {
  deleteTarget.value = batch;
  deleteError.value = "";
}

async function doDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = "";
  try {
    if (isLocalId(deleteTarget.value.batch_id)) {
      await deleteLocalRecord(deleteTarget.value.batch_id);
      localCards.value = localCards.value.filter((b) => b.batch_id !== deleteTarget.value.batch_id);
    } else {
      await apiFetch("/api/admin/batches/" + encodeURIComponent(deleteTarget.value.batch_id), { method: "DELETE" });
      publicCards.value = publicCards.value.filter((b) => b.batch_id !== deleteTarget.value.batch_id);
    }
    deleteTarget.value = null;
  } catch (e) {
    deleteError.value = e.message || "删除失败";
  } finally {
    deleting.value = false;
  }
}

let scrollTimeout;
function onScroll() {
  var el = tooltipRef.value;
  if (!el || !batchCards.value.length) return;
  el.style.opacity = "1";
  var labels = timelineLabels.value;
  if (!labels.length) return;
  var scrollPct = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
  var idx = Math.min(labels.length - 1, Math.floor(scrollPct * labels.length));
  currentTimelineLabel.value = labels[idx] || labels[0];

  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => { el.style.opacity = "0"; }, 800);
}

function onLocalChanged() { fetchBatches(); }

onMounted(() => {
  window.addEventListener("nai-gallery:local-changed", onLocalChanged);
  fetchBatches();
  checkAnnouncements();
  window.addEventListener("scroll", onScroll);

  const savedScroll = sessionStorage.getItem('gallery_scroll_y');
  if (savedScroll) {
    nextTick(() => window.scrollTo(0, Number(savedScroll)));
  }
});

watch(isTarot, (v) => localStorage.setItem('gallery_view', v ? 'tarot' : 'grid'));

onBeforeRouteLeave(() => {
  sessionStorage.setItem('gallery_scroll_y', window.scrollY);
});

async function checkAnnouncements() {
  try {
    const data = await apiFetch("/api/announcements");
    const all = data.announcements || [];
    if (!all.length) return;
    const lastRead = Number(localStorage.getItem("last_read_announcement_id") || 0);
    const unread = all.filter((a) => a.id > lastRead);
    if (unread.length) announcements.value = unread;
  } catch { /* silent */ }
}

onUnmounted(() => {
  window.removeEventListener("nai-gallery:local-changed", onLocalChanged);
  window.removeEventListener("scroll", onScroll);
  clearTimeout(scrollTimeout);
});
</script>

<style scoped>
#bookshelf-view {
  padding-top: 0;
  padding-bottom: 100px;
}

.gallery-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: -8px 0 24px;
  flex-wrap: wrap;
}

.gallery-segment {
  display: inline-flex;
  gap: 4px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 4px;
}

.gallery-segment button {
  border: none;
  background: transparent;
  color: var(--text);
  padding: 6px 20px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  opacity: 0.5;
  transition: opacity 0.3s, background 0.3s;
}

.gallery-segment button.active {
  opacity: 1;
  background: var(--glass-border);
  font-weight: bold;
}

.local-import-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 18px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}

.local-import-btn:hover { background: var(--glass-border); }
.local-import-btn svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 1.5; fill: none; }

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
  color: #c0392b;
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

.btn-danger {
  padding: 10px 24px;
  border-radius: 20px;
  border: 1px solid #c0392b;
  background: #c0392b;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: opacity 0.3s;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: var(--glass-bg); backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border); border-radius: 16px;
  padding: 32px; max-width: 480px; width: 90%;
}
.modal-card h3 { font-size: 20px; font-weight: 500; margin-bottom: 16px; }
.modal-card p { font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
.modal-cover { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
.modal-stats { font-size: 12px !important; opacity: 0.6 !important; }
.modal-warn { font-size: 12px !important; opacity: 0.6 !important; color: #c0392b; }
.modal-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }

#timeline-tooltip {
  position: fixed;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  letter-spacing: 2px;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
  writing-mode: vertical-rl;
}
</style>
