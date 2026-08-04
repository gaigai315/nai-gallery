<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />

    <div class="module-header">
      <h2>许愿墙</h2>
    </div>

    <div v-if="loading" class="status"><div class="skeleton-strip"></div></div>
    <div v-else-if="error" class="status"><p class="status-error">{{ error }}</p></div>
    <div v-else-if="!wishes.length" class="status"><p class="status-empty">暂无许愿，来写下第一个吧</p></div>

    <div v-else class="wish-grid" ref="gridRef">
      <div v-for="w in wishes" :key="w.id" class="wish-card" :class="{ expanded: expandedId === w.id }">
        <div class="wish-top">
          <img v-if="w.avatar_url" :src="w.avatar_url" class="wish-avatar" />
          <span v-else class="wish-avatar ph-avatar">{{ (w.username || '?')[0] }}</span>
          <div class="wish-meta">
            <span class="wish-user">{{ w.username || 'Unknown' }}</span>
            <span class="wish-time">{{ formatDate(w.created_at) }}</span>
          </div>
        </div>

        <div class="wish-content">{{ w.content }}</div>

        <div v-if="w.images && w.images.length" class="wish-images">
          <img v-for="(img, i) in w.images" :key="i" :src="getImageSrc(img)" class="wish-img" loading="lazy" @click.stop="previewImg = getImageSrc(img)" />
        </div>

        <div class="wish-foot">
          <span class="wish-reply-hint" v-if="w.reply_count > 0">站长回复了 · 共 {{ w.reply_count }} 条</span>
          <button v-if="isAdmin" class="btn-reply" @click="toggleReply(w)">{{ expandedId === w.id ? '关闭' : '回复' }}</button>
          <button v-if="isAdmin" class="btn-del-wish" @click="deleteWish(w)">×</button>
        </div>

        <!-- Reply area -->
        <div v-if="expandedId === w.id" class="reply-area">
          <div v-if="replyLoading" class="reply-status">加载中...</div>
          <div v-for="r in replies" :key="r.id" class="reply-item">
            <img v-if="r.avatar_url" :src="r.avatar_url" class="reply-avatar" />
            <span v-else class="reply-avatar ph-avatar-sm">{{ (r.username || 'A')[0] }}</span>
            <div class="reply-body">
              <span class="reply-user">{{ r.username || 'Admin' }} · {{ formatDate(r.created_at) }}</span>
              <span class="reply-text">{{ r.content }}</span>
            </div>
          </div>
          <div v-if="isAdmin" class="reply-form">
            <input v-model="replyText" class="reply-input" placeholder="输入回复..." @keyup.enter="sendReply(w)" />
            <button class="btn-send" :disabled="!replyText.trim() || replySending" @click="sendReply(w)">{{ replySending ? '发送中' : '发送' }}</button>
          </div>
        </div>
      </div>

      <div v-if="hasMore" ref="sentinelRef" class="sentinel">
        <div class="skeleton-strip"></div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="editorOpen = true" title="写许愿">+</button>

    <!-- Editor modal -->
    <Teleport to="body">
      <div v-if="editorOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-card editor-modal">
          <h3>写下你的许愿</h3>
          <textarea v-model="formContent" class="textarea" placeholder="在此写下你想说的话..." rows="5"></textarea>
          <div class="upload-section">
            <label class="upload-label">
              <span>添加图片 (最多 3 张)</span>
              <input type="file" multiple accept="image/*" @change="onImagesSelected" class="file-input" />
            </label>
            <span class="upload-hint" v-if="formImages.length">{{ formImages.length }} / 3 张已选</span>
          </div>
          <p v-if="uploadProgress" class="upload-status">{{ uploadProgress }}</p>
          <div class="form-actions">
            <button class="btn-outline" @click="closeEditor">取消</button>
            <button class="btn-save" :disabled="!formContent.trim() || saving" @click="save">{{ saving ? '提交中...' : '提交' }}</button>
          </div>
          <p v-if="formError" class="status-error">{{ formError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Image preview modal -->
    <Teleport to="body">
      <div v-if="previewImg" class="modal-overlay img-preview-overlay" @click="previewImg = null">
        <img :src="previewImg" class="full-img" />
      </div>
    </Teleport>

    <SearchOverlay v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { apiFetch } from "../lib/api.js";
import { useUser } from "../stores/user.js";
import { compressToJpeg } from "../lib/upload.js";
import ModuleNav from "../components/ModuleNav.vue";
import SearchOverlay from "../components/SearchOverlay.vue";

const { isAdmin } = useUser();

const wishes = ref([]);
const loading = ref(true);
const error = ref("");
const searchOpen = ref(false);
const hasMore = ref(false);
const totalWishes = ref(0);

const sentinelRef = ref(null);
const gridRef = ref(null);
let observer = null;

const expandedId = ref(null);
const replies = ref([]);
const replyText = ref("");
const replyLoading = ref(false);
const replySending = ref(false);

const editorOpen = ref(false);
const formContent = ref("");
const formImages = ref([]);
const saving = ref(false);
const formError = ref("");
const uploadProgress = ref("");

const previewImg = ref(null);

const LIMIT = 20;

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    return d.toLocaleDateString("zh-CN");
  } catch { return iso; }
}

function getImageSrc(img) {
  if (typeof img === "string") return img;
  return img?.url || img?.r2_key || "";
}

async function fetchWishes(append = false) {
  if (!append) loading.value = true;
  error.value = "";
  try {
    const offset = append ? wishes.value.length : 0;
    const data = await apiFetch(`/api/wishes?offset=${offset}&limit=${LIMIT}`);
    const list = data.wishes || [];
    if (append) {
      wishes.value.push(...list);
    } else {
      wishes.value = list;
    }
    totalWishes.value = data.total || 0;
    hasMore.value = wishes.value.length < totalWishes.value;
  } catch (e) {
    error.value = e.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

function setupObserver() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value) {
      fetchWishes(true);
    }
  }, { rootMargin: "200px" });
  nextTick(() => {
    if (sentinelRef.value) observer.observe(sentinelRef.value);
  });
}

watch(wishes, () => nextTick(setupObserver));

async function toggleReply(w) {
  if (expandedId.value === w.id) {
    expandedId.value = null;
    replies.value = [];
    replyText.value = "";
    return;
  }
  expandedId.value = w.id;
  replyText.value = "";
  replyLoading.value = true;
  try {
    const data = await apiFetch(`/api/wishes/${w.id}`);
    replies.value = data.replies || [];
  } catch (e) {
    replies.value = [];
  } finally {
    replyLoading.value = false;
  }
}

async function sendReply(w) {
  const text = replyText.value.trim();
  if (!text) return;
  replySending.value = true;
  try {
    const result = await apiFetch(`/api/admin/wishes/${w.id}/reply`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
      silent: true,
    });
    replies.value.push({
      id: result.id,
      username: result.username || "Admin",
      avatar_url: result.avatar_url,
      content: text,
      created_at: result.created_at || new Date().toISOString(),
    });
    replyText.value = "";
    w.reply_count = (w.reply_count || 0) + 1;
  } catch (e) {
    formError.value = e.message || "回复失败";
  } finally {
    replySending.value = false;
  }
}

async function deleteWish(w) {
  if (!confirm("确定删除该许愿？")) return;
  try {
    await apiFetch(`/api/admin/wishes/${w.id}`, { method: "DELETE", silent: true });
    wishes.value = wishes.value.filter((x) => x.id !== w.id);
  } catch (e) {
    error.value = e.message || "删除失败";
  }
}

function onImagesSelected(e) {
  const files = Array.from(e.target.files || []);
  formImages.value = files.slice(0, 3);
}

function closeEditor() {
  editorOpen.value = false;
  formContent.value = "";
  formImages.value = [];
  formError.value = "";
  uploadProgress.value = "";
}

async function uploadPut(entries, blobs, contentTypes) {
  const tasks = entries.map((entry, i) => {
    if (!entry || !blobs[i]) return Promise.resolve();
    return fetch(entry.url, {
      method: "PUT",
      body: blobs[i],
      headers: { "Content-Type": contentTypes[i] || "image/jpeg" },
      credentials: "omit",
    });
  });
  await Promise.all(tasks);
}

async function save() {
  if (!formContent.value.trim()) return;
  saving.value = true;
  formError.value = "";
  uploadProgress.value = "";

  try {
    uploadProgress.value = "创建许愿...";
    const r = await apiFetch("/api/wishes", {
      method: "POST",
      body: JSON.stringify({ content: formContent.value }),
      silent: true,
    });
    const wishId = r.id;

    if (formImages.value.length > 0 && wishId) {
      uploadProgress.value = "压缩上传图片...";
      const imgData = [];
      for (const file of formImages.value) {
        const result = await compressToJpeg(file);
        if (result) imgData.push({ blob: result.blob, file_name: file.name, width: result.width, height: result.height });
      }
      if (imgData.length > 0) {
        const signResp = await apiFetch("/api/wishes/upload-sign", {
          method: "POST",
          body: JSON.stringify({
            wish_id: wishId,
            files: imgData.map((e) => ({ file_name: e.file_name, content_type: "image/jpeg" })),
          }),
          silent: true,
        });
        const entries = signResp.entries || [];
        await uploadPut(entries, imgData.map(d => d.blob), imgData.map(() => "image/jpeg"));
        const imagesJson = JSON.stringify(imgData.map((img, i) => ({
          r2_key: entries[i]?.key || "",
          file_name: img.file_name,
          width: img.width,
          height: img.height,
        })));
        await apiFetch(`/api/wishes/${wishId}`, {
          method: "PATCH",
          body: JSON.stringify({ images_json: imagesJson }),
          silent: true,
        });
      }
    }

    uploadProgress.value = "完成";
    closeEditor();
    wishes.value = [];
    await fetchWishes(false);
  } catch (e) {
    formError.value = e.message || "提交失败";
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchWishes(false).then(() => nextTick(setupObserver));
});
onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.module-page { padding-top: 0; padding-bottom: 120px; }
.module-header { display: flex; align-items: center; justify-content: space-between; max-width: 960px; margin: 0 auto 24px; padding: 0 24px; }
.module-header h2 { font-size: 24px; font-weight: 500; letter-spacing: 2px; }

.status { display: flex; justify-content: center; padding: 80px 24px; }
.status-error { font-size: 14px; color: #c0392b; opacity: 0.7; }
.status-empty { font-size: 14px; opacity: 0.4; letter-spacing: 2px; }
.skeleton-strip { width: 280px; height: 16px; border-radius: 8px; background: var(--glass-bg); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }

.wish-grid {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  columns: 3;
  column-gap: 16px;
}
@media (max-width: 768px) { .wish-grid { columns: 2; column-gap: 12px; } }
@media (max-width: 480px) { .wish-grid { columns: 1; } }

.wish-card {
  break-inside: avoid;
  margin-bottom: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  transition: box-shadow 0.3s, transform 0.2s;
}
.wish-card:hover { box-shadow: 0 6px 16px var(--glow); }
.wish-card.expanded { border-color: rgba(255,255,255,0.15); }

.wish-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.wish-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.ph-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; opacity: 0.6; flex-shrink: 0; }
.ph-avatar-sm { width: 20px; height: 20px; border-radius: 50%; background: var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: 10px; opacity: 0.5; flex-shrink: 0; }
.wish-meta { display: flex; flex-direction: column; }
.wish-user { font-size: 13px; font-weight: 500; }
.wish-time { font-size: 11px; opacity: 0.4; }

.wish-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; margin-bottom: 10px; }

.wish-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; margin-bottom: 10px; }
.wish-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
.wish-img:hover { transform: scale(1.03); }

.wish-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--glass-border); }
.wish-reply-hint { font-size: 11px; opacity: 0.5; }
.btn-reply { background: transparent; border: 1px solid var(--glass-border); border-radius: 12px; padding: 4px 12px; color: var(--text); cursor: pointer; font-size: 11px; }
.btn-reply:hover { background: var(--glass-border); }
.btn-del-wish { background: transparent; border: none; color: rgba(192,57,43,0.5); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px; }
.btn-del-wish:hover { color: #c0392b; background: rgba(192,57,43,0.1); }

/* Reply area */
.reply-area { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--glass-border); }
.reply-status { font-size: 12px; opacity: 0.4; padding: 8px 0; }
.reply-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
.reply-avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; flex-shrink: 0; margin-top: 2px; }
.reply-body { flex: 1; }
.reply-user { font-size: 11px; opacity: 0.5; display: block; margin-bottom: 2px; }
.reply-text { font-size: 13px; line-height: 1.5; word-break: break-word; }
.reply-form { display: flex; gap: 8px; margin-top: 10px; }
.reply-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 10px; padding: 8px 12px; color: var(--text); font-size: 13px; outline: none; }
.reply-input:focus { border-color: rgba(255,255,255,0.2); }
.btn-send { background: rgba(255,255,255,0.1); border: none; border-radius: 10px; padding: 8px 16px; color: var(--text); cursor: pointer; font-size: 12px; }
.btn-send:hover { background: rgba(255,255,255,0.2); }
.btn-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* FAB */
.fab {
  position: fixed;
  bottom: calc(40px + env(safe-area-inset-bottom, 0px));
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text);
  font-size: 24px;
  cursor: pointer;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: transform 0.3s, box-shadow 0.3s, background 0.3s;
  box-shadow: 0 4px 12px var(--glow);
}
.fab:hover { transform: scale(1.08); background: var(--glass-border); }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.img-preview-overlay { background: rgba(0,0,0,0.8); }
.full-img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 12px; }
.modal-card {
  background: var(--glass-bg); backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border); border-radius: 16px;
  padding: 32px; max-width: 520px; width: 90%;
}
.editor-modal { max-width: 560px; }
.modal-card h3 { font-size: 20px; font-weight: 500; margin-bottom: 20px; }
.textarea {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;
  font-family: inherit;
  resize: vertical;
}
.textarea:focus { border-color: rgba(255,255,255,0.2); }

.upload-section { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.upload-label {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 10px;
  border: 1px dashed var(--glass-border);
  cursor: pointer; font-size: 13px; opacity: 0.7;
  transition: opacity 0.2s, border-color 0.2s;
}
.upload-label:hover { opacity: 1; border-color: rgba(255,255,255,0.3); }
.file-input { display: none; }
.upload-hint { font-size: 12px; opacity: 0.4; }
.upload-status { font-size: 12px; opacity: 0.6; margin-top: 8px; margin-bottom: 0; text-align: center; }

.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
.btn-outline {
  padding: 10px 24px; border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: transparent; color: var(--text);
  cursor: pointer; font-size: 13px; letter-spacing: 1px;
}
.btn-outline:hover { background: var(--glass-border); }
.btn-save {
  padding: 10px 24px; border-radius: 20px;
  border: none; background: rgba(255,255,255,0.12);
  color: var(--text); cursor: pointer; font-size: 13px; letter-spacing: 1px;
}
.btn-save:hover { background: rgba(255,255,255,0.2); }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.sentinel { display: flex; justify-content: center; padding: 20px; }
</style>
