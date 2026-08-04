<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />

    <div class="module-header">
      <h2>Vibe</h2>
      <div v-if="isAdmin" class="header-actions">
        <button class="btn-new" @click="openEditor(null)">+ 新建</button>
        <button class="btn-edit" :class="{ active: editMode }" @click="editMode = !editMode; selected = []">{{ editMode ? "完成" : "编辑" }}</button>
      </div>
    </div>

    <div v-if="loading" class="status"><div class="skeleton-strip"></div></div>
    <div v-else-if="error" class="status"><p class="status-error">{{ error }}</p></div>
    <div v-else-if="!posts.length" class="status"><p class="status-empty">暂无帖子</p></div>

    <div v-else class="post-grid">
      <div v-for="p in posts" :key="p.id" class="post-card" @click="editMode ? toggleSelect(p.id) : goPost(p)">
        <img v-if="p.first_image" :src="p.first_image" class="card-img" loading="lazy" />
        <div class="card-body">
          <div class="card-title">{{ p.title }}</div>
          <div class="card-meta">{{ p.file_count || 0 }} 文件 · {{ formatDate(p.created_at) }}</div>
        </div>
        <button v-if="isAdmin && editMode" class="select-dot" :class="{ on: selected.includes(p.id) }" @click.stop="toggleSelect(p.id)"></button>
      </div>
    </div>

    <div ref="sentinelRef" v-if="hasMore" class="loading-sentinel">
      <div class="skeleton-strip"></div>
    </div>

    <div v-if="isAdmin && editMode && selected.length" class="batch-bar">
      <button class="btn-outline" @click="deleteSelected">删除选中 ({{ selected.length }})</button>
    </div>

    <!-- Editor modal -->
    <Teleport to="body">
      <div v-if="editorOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-card editor-modal">
          <h3>{{ editingId ? "编辑帖子" : "新建帖子" }}</h3>
          <input v-model="form.title" class="input" placeholder="标题" />
          <textarea v-model="form.content" class="textarea" placeholder="正文..." rows="6"></textarea>
          <div class="upload-section">
            <label class="upload-label">
              <span>例图</span>
              <input type="file" multiple accept="image/*" @change="onImagesSelected" class="file-input" />
            </label>
            <span class="upload-hint" v-if="formImages.length">{{ formImages.length }} 张已选</span>
          </div>
          <div class="upload-section">
            <label class="upload-label">
              <span>Vibe 文件</span>
              <input type="file" multiple @change="onFilesSelected" class="file-input" />
            </label>
            <span class="upload-hint" v-if="formFiles.length">{{ formFiles.length }} 个已选</span>
          </div>
          <p v-if="uploadProgress" class="upload-status">{{ uploadProgress }}</p>
          <div class="form-actions">
            <button class="btn-outline" @click="closeEditor">取消</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving ? "保存中..." : "保存" }}</button>
          </div>
          <p v-if="formError" class="status-error">{{ formError }}</p>
        </div>
      </div>
    </Teleport>

    <SearchOverlay v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import { apiFetch } from "../lib/api.js";
import { useUser } from "../stores/user.js";
import { compressToJpeg } from "../lib/upload.js";
import ModuleNav from "../components/ModuleNav.vue";
import SearchOverlay from "../components/SearchOverlay.vue";

const router = useRouter();
const { isAdmin } = useUser();

const posts = ref([]);
const postsTotal = ref(0);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(false);
const error = ref("");
const sentinelRef = ref(null);
const searchOpen = ref(false);

const selected = ref([]);
const editMode = ref(false);
const formImages = ref([]);
const formFiles = ref([]);
const editorOpen = ref(false);
const editingId = ref(null);
const form = ref({ title: "", content: "" });
const saving = ref(false);
const formError = ref("");
const uploadProgress = ref("");

function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("zh-CN"); } catch { return iso; }
}

async function fetchPosts() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch("/api/vibe?limit=20&offset=0");
    posts.value = data.posts || [];
    postsTotal.value = data.total || 0;
    hasMore.value = posts.value.length < postsTotal.value;
  } catch (e) {
    error.value = e.message || "????";
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || posts.value.length >= postsTotal.value) return;
  loadingMore.value = true;
  try {
    const data = await apiFetch("/api/vibe?limit=20&offset=" + posts.value.length);
    posts.value.push(...(data.posts || []));
    postsTotal.value = data.total || postsTotal.value;
    hasMore.value = posts.value.length < postsTotal.value;
  } catch (e) {
    // silently fail on load more
  } finally {
    loadingMore.value = false;
  }
}

function goPost(p) {
  router.push("/vibe/" + p.id);
}

function toggleSelect(id) {
  const idx = selected.value.indexOf(id);
  if (idx >= 0) selected.value.splice(idx, 1);
  else selected.value.push(id);
}

async function deleteSelected() {
  if (!confirm("确定删除 " + selected.value.length + " 个帖子？")) return;
  try {
    for (const id of selected.value) {
      await apiFetch("/api/admin/vibe/" + id, { method: "DELETE", silent: true });
    }
    selected.value = [];
    await fetchPosts();
  } catch (e) {
    error.value = e.message || "删除失败";
  }
}

function openEditor(post) {
  if (post) {
    editingId.value = post.id;
    form.value = { title: post.title, content: post.content || "" };
  } else {
    editingId.value = null;
    form.value = { title: "", content: "" };
  }
  formImages.value = [];
  formFiles.value = [];
  formError.value = "";
  uploadProgress.value = "";
  editorOpen.value = true;
}

function onImagesSelected(e) {
  formImages.value = Array.from(e.target.files || []);
}
function onFilesSelected(e) {
  formFiles.value = Array.from(e.target.files || []);
}

function closeEditor() {
  editorOpen.value = false;
  editingId.value = null;
}

async function uploadPut(entries, blobs, contentTypes) {
  const tasks = entries.map((entry, i) => {
    if (!entry || !blobs[i]) return Promise.resolve();
    return fetch(entry.url, {
      method: "PUT",
      body: blobs[i],
      headers: { "Content-Type": contentTypes[i] || entry.content_type || "application/octet-stream" },
      credentials: "omit",
    });
  });
  await Promise.all(tasks);
}

async function save() {
  if (!form.value.title.trim()) {
    formError.value = "标题不能为空";
    return;
  }
  saving.value = true;
  formError.value = "";
  uploadProgress.value = "";
  let postId = editingId.value;

  try {
    if (editingId.value) {
      uploadProgress.value = "保存帖子...";
      await apiFetch("/api/admin/vibe/" + editingId.value, {
        method: "PATCH",
        body: JSON.stringify(form.value),
        silent: true,
      });
    } else {
      uploadProgress.value = "创建帖子...";
      const r = await apiFetch("/api/admin/vibe", {
        method: "POST",
        body: JSON.stringify({ title: form.value.title, content: form.value.content }),
        silent: true,
      });
      postId = r.id;
    }

    // Upload images (JPEG compressed)
    if (formImages.value.length > 0 && postId) {
      uploadProgress.value = "压缩上传例图...";
      const imgData = [];
      for (const file of formImages.value) {
        const result = await compressToJpeg(file);
        if (result) imgData.push({ blob: result.blob, file_name: file.name, width: result.width, height: result.height });
      }
      if (imgData.length > 0) {
        const signResp = await apiFetch("/api/admin/vibe/upload-sign", {
          method: "POST",
          body: JSON.stringify({
            post_id: postId,
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
        await apiFetch("/api/admin/vibe/" + postId, {
          method: "PATCH",
          body: JSON.stringify({ images_json: imagesJson }),
          silent: true,
        });
      }
    }

    // Upload vibe files (no compression)
    if (formFiles.value.length > 0 && postId) {
      uploadProgress.value = "上传文件...";
      const fileArr = Array.from(formFiles.value);
      const signResp = await apiFetch("/api/admin/vibe/upload-sign", {
        method: "POST",
        body: JSON.stringify({
          post_id: postId,
          files: fileArr.map(f => ({ file_name: f.name, content_type: f.type || "application/octet-stream" })),
        }),
        silent: true,
      });
      const entries = signResp.entries || [];
      await uploadPut(entries, fileArr, fileArr.map(f => f.type || "application/octet-stream"));
      const filesJson = JSON.stringify(fileArr.map((f, i) => ({
        r2_key: entries[i]?.key || "",
        file_name: f.name,
        file_size: f.size,
      })));
      await apiFetch("/api/admin/vibe/" + postId, {
        method: "PATCH",
        body: JSON.stringify({ files_json: filesJson }),
        silent: true,
      });
    }

    uploadProgress.value = "完成";
    closeEditor();
    await fetchPosts();
  } catch (e) {
    formError.value = e.message || "保存失败";
  } finally {
    saving.value = false;
  }
}

let observer = null;
onMounted(() => {
  fetchPosts();
  nextTick(() => {
    if (sentinelRef.value) {
      observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      }, { rootMargin: "200px" });
      observer.observe(sentinelRef.value);
    }
  });
});
onBeforeUnmount(() => { if (observer) observer.disconnect(); });
</script>

<style scoped>
.module-page {
  padding-top: 0;
  padding-bottom: 100px;
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  margin: 0 auto 24px;
  padding: 0 24px;
}
.module-header h2 { font-size: 24px; font-weight: 500; letter-spacing: 2px; }

.header-actions { display: flex; gap: 10px; align-items: center; }

.btn-edit {
  padding: 8px 20px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: background 0.3s, border-color 0.3s;
}
.btn-edit:hover { background: var(--glass-border); }
.btn-edit.active { background: rgba(192,57,43,0.15); border-color: #c0392b; }

.upload-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.upload-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px dashed var(--glass-border);
  cursor: pointer;
  font-size: 13px;
  opacity: 0.7;
  transition: opacity 0.2s, border-color 0.2s;
}
.upload-label:hover { opacity: 1; border-color: rgba(255,255,255,0.3); }
.file-input { display: none; }
.upload-hint { font-size: 12px; opacity: 0.4; }

.btn-new {
  padding: 8px 20px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: background 0.3s;
}
.btn-new:hover { background: var(--glass-border); }

.post-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) { .post-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
@media (max-width: 480px) { .post-grid { grid-template-columns: 1fr; } }

.post-card {
  border-radius: 16px;
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
}
.post-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px var(--glow); }

.card-img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}

.card-body { padding: 14px 16px; }
.card-title { font-size: 15px; font-weight: 500; margin-bottom: 6px; }
.card-meta { font-size: 12px; opacity: 0.5; }

.select-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  background: transparent;
  cursor: pointer;
  z-index: 10;
}
.select-dot.on { background: var(--text); border-color: var(--text); }

.batch-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.btn-outline {
  padding: 10px 24px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: background 0.3s;
}
.btn-outline:hover { background: var(--glass-border); }

.btn-save {
  padding: 10px 24px;
  border-radius: 20px;
  border: none;
  background: rgba(255,255,255,0.12);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: background 0.3s;
}
.btn-save:hover { background: rgba(255,255,255,0.2); }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.upload-status {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 8px;
  margin-bottom: 0;
  text-align: center;
}

.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }

.status { display: flex; justify-content: center; padding: 80px 24px; }
.status-error { font-size: 14px; color: #c0392b; opacity: 0.7; }
.status-empty { font-size: 14px; opacity: 0.4; letter-spacing: 2px; }
.loading-sentinel { display: flex; justify-content: center; padding: 32px 0; }

.skeleton-strip {
  width: 280px;
  height: 16px;
  border-radius: 8px;
  background: var(--glass-bg);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }

.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: var(--glass-bg); backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border); border-radius: 16px;
  padding: 32px; max-width: 520px; width: 90%;
}
.editor-modal { max-width: 560px; }
.modal-card h3 { font-size: 20px; font-weight: 500; margin-bottom: 20px; }

.input, .textarea {
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
}
.input:focus, .textarea:focus { border-color: rgba(255,255,255,0.2); }
.textarea { resize: vertical; }
</style>
