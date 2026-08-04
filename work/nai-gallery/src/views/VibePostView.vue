<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />

    <div v-if="loading" class="status"><div class="skeleton-strip"></div></div>
    <div v-else-if="error" class="status"><p class="status-error">{{ error }}</p></div>

    <article v-else class="post-detail">
      <div class="detail-header">
        <button class="btn-back" @click="router.push('/vibe')">← 返回</button>
        <div class="header-actions" v-if="isAdmin">
          <button class="btn-action" @click="toggleEdit">{{ editing ? '取消' : '编辑' }}</button>
          <button class="btn-action danger" @click="confirmDelete">删除</button>
        </div>
      </div>

      <template v-if="editing">
        <input v-model="editForm.title" class="input-lg" placeholder="标题" />
        <textarea v-model="editForm.content" class="textarea" placeholder="正文..." rows="6"></textarea>

        <div class="edit-section">
          <h4 class="section-title">例图</h4>
          <div class="edit-images">
            <div v-for="(img, i) in keptImages" :key="'ki-'+i" class="edit-img-item">
              <img :src="makeMetaPreviewUrl(img)" class="edit-img-thumb" />
              <button class="btn-img-remove" @click="keptImages.splice(i, 1)">×</button>
            </div>
            <label class="edit-img-add">
              <span>+</span>
              <input type="file" multiple accept="image/*" @change="onNewImages" class="file-input" />
            </label>
          </div>
          <span v-if="newImages.length" class="upload-hint">{{ newImages.length }} 张新图片待上传</span>
        </div>

        <div class="edit-section">
          <h4 class="section-title">下载文件</h4>
          <div class="edit-files">
            <div v-for="(f, i) in keptFiles" :key="'kf-'+i" class="edit-file-row">
              <span class="file-name">📄 {{ f.file_name || 'file' }}</span>
              <span class="file-size" v-if="f.file_size">{{ formatSize(f.file_size) }}</span>
              <button class="btn-img-remove" @click="keptFiles.splice(i, 1)">×</button>
            </div>
            <label class="edit-file-add">
              <span>+ 添加文件</span>
              <input type="file" multiple @change="onNewFiles" class="file-input" />
            </label>
          </div>
        </div>

        <p v-if="uploadMsg" class="upload-msg">{{ uploadMsg }}</p>
        <div class="form-actions">
          <button class="btn-outline" @click="cancelEdit">取消</button>
          <button class="btn-save" :disabled="saving" @click="saveEdit">{{ saving ? '保存中...' : '保存修改' }}</button>
        </div>
        <p v-if="editError" class="status-error">{{ editError }}</p>
      </template>

      <template v-else>
        <h1 class="detail-title">{{ post.title }}</h1>
        <time class="detail-date">{{ formatDate(post.created_at) }}</time>
        <div class="detail-content" v-if="post.content">{{ post.content }}</div>

        <div v-if="post.images && post.images.length" class="detail-images">
          <img v-for="(img, i) in post.images" :key="i" :src="img" class="detail-img" loading="lazy" />
        </div>

        <div v-if="post.files && post.files.length" class="detail-files">
          <h3>下载文件</h3>
          <div v-for="(f, i) in post.files" :key="i" class="file-row">
            <span class="file-name">📄 {{ f.name }}</span>
            <span class="file-size" v-if="f.size">{{ formatSize(f.size) }}</span>
            <a :href="f.url" class="btn-dl" download>↓</a>
          </div>
        </div>
      </template>
    </article>

    <Teleport to="body">
      <div v-if="delConfirm" class="modal-overlay" @click.self="delConfirm = false">
        <div class="modal-card">
          <h3>确认删除</h3>
          <p>确定要删除「{{ post.title }}」？此操作不可撤销。</p>
          <div class="form-actions">
            <button class="btn-outline" @click="delConfirm = false">取消</button>
            <button class="btn-danger" :disabled="deleting" @click="doDelete">{{ deleting ? '删除中...' : '确认删除' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <SearchOverlay v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiFetch } from "../lib/api.js";
import { useUser } from "../stores/user.js";
import { compressToJpeg } from "../lib/upload.js";
import ModuleNav from "../components/ModuleNav.vue";
import SearchOverlay from "../components/SearchOverlay.vue";

const route = useRoute();
const router = useRouter();
const { isAdmin } = useUser();

const post = ref({});
const loading = ref(true);
const error = ref("");
const searchOpen = ref(false);

const editing = ref(false);
const editForm = ref({ title: "", content: "" });
const keptImages = ref([]);
const keptFiles = ref([]);
const newImages = ref([]);
const newFiles = ref([]);
const saving = ref(false);
const editError = ref("");
const uploadMsg = ref("");

const delConfirm = ref(false);
const deleting = ref(false);

function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("zh-CN"); } catch { return iso; }
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function makeMetaPreviewUrl(meta) {
  const r2key = typeof meta === "string" ? meta : meta?.r2_key;
  if (!r2key) return "";
  return "/api/preview/" + r2key;
}

async function fetchPost() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch("/api/vibe/" + route.params.id);
    post.value = data;
    post.value.images_meta = data.images_meta || [];
    post.value.files_meta = data.files_meta || [];
  } catch (e) {
    error.value = e.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

function toggleEdit() {
  if (editing.value) {
    cancelEdit();
    return;
  }
  editForm.value = { title: post.value.title, content: post.value.content || "" };
  keptImages.value = JSON.parse(JSON.stringify(post.value.images_meta || []));
  keptFiles.value = JSON.parse(JSON.stringify(post.value.files_meta || []));
  newImages.value = [];
  newFiles.value = [];
  editError.value = "";
  uploadMsg.value = "";
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

function onNewImages(e) {
  const arr = Array.from(e.target.files || []);
  for (const f of arr) newImages.value.push(f);
}

function onNewFiles(e) {
  const arr = Array.from(e.target.files || []);
  for (const f of arr) newFiles.value.push(f);
}

async function uploadPut(entries, blobs, contentTypes) {
  const tasks = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const blob = blobs[i];
    if (!entry || !blob) continue;
    tasks.push(
      fetch(entry.url, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentTypes[i] || entry.content_type || "application/octet-stream" },
        credentials: "omit",
      })
    );
  }
  await Promise.all(tasks);
}

async function saveEdit() {
  if (!editForm.value.title.trim()) {
    editError.value = "标题不能为空";
    return;
  }
  saving.value = true;
  editError.value = "";
  uploadMsg.value = "";

  try {
    uploadMsg.value = "保存帖子...";
    await apiFetch("/api/admin/vibe/" + route.params.id, {
      method: "PATCH",
      body: JSON.stringify({ title: editForm.value.title, content: editForm.value.content }),
      silent: true,
    });

    if (newImages.value.length > 0) {
      uploadMsg.value = "压缩上传例图...";
      const imgData = [];
      for (const file of newImages.value) {
        const result = await compressToJpeg(file);
        if (result) imgData.push({ blob: result.blob, file_name: file.name, width: result.width, height: result.height });
      }
      if (imgData.length > 0) {
        const signResp = await apiFetch("/api/admin/vibe/upload-sign", {
          method: "POST",
          body: JSON.stringify({
            post_id: Number(route.params.id),
            files: imgData.map(function(e) { return { file_name: e.file_name, content_type: "image/jpeg" }; }),
          }),
          silent: true,
        });
        const entries = signResp.entries || [];
        await uploadPut(entries, imgData.map(function(d) { return d.blob; }), imgData.map(function() { return "image/jpeg"; }));
        for (let i = 0; i < imgData.length; i++) {
          keptImages.value.push({
            r2_key: entries[i]?.key || "",
            file_name: imgData[i].file_name,
            width: imgData[i].width,
            height: imgData[i].height,
          });
        }
      }
    }

    if (newFiles.value.length > 0) {
      uploadMsg.value = "上传文件...";
      const fileArr = newFiles.value.slice();
      const signResp = await apiFetch("/api/admin/vibe/upload-sign", {
        method: "POST",
        body: JSON.stringify({
          post_id: Number(route.params.id),
          files: fileArr.map(function(f) { return { file_name: f.name, content_type: f.type || "application/octet-stream" }; }),
        }),
        silent: true,
      });
      const entries = signResp.entries || [];
      const contentTypes = fileArr.map(function(f) { return f.type || "application/octet-stream"; });
      await uploadPut(entries, fileArr, contentTypes);
      for (let i = 0; i < fileArr.length; i++) {
        keptFiles.value.push({
          r2_key: entries[i]?.key || "",
          file_name: fileArr[i].name,
          file_size: fileArr[i].size,
        });
      }
    }

    const imagesJson = JSON.stringify(keptImages.value.map(function(img) {
      return {
        r2_key: typeof img === "string" ? img : img.r2_key,
        file_name: typeof img === "string" ? "" : (img.file_name || ""),
        width: typeof img === "string" ? null : (img.width || null),
        height: typeof img === "string" ? null : (img.height || null),
      };
    }));
    const filesJson = JSON.stringify(keptFiles.value.map(function(f) {
      return { r2_key: f.r2_key, file_name: f.file_name, file_size: f.file_size };
    }));

    await apiFetch("/api/admin/vibe/" + route.params.id, {
      method: "PATCH",
      body: JSON.stringify({ images_json: imagesJson, files_json: filesJson }),
      silent: true,
    });

    uploadMsg.value = "保存成功";
    await fetchPost();
    editing.value = false;
  } catch (e) {
    editError.value = e.message || "保存失败";
  } finally {
    saving.value = false;
  }
}

function confirmDelete() {
  delConfirm.value = true;
}

async function doDelete() {
  deleting.value = true;
  try {
    await apiFetch("/api/admin/vibe/" + route.params.id, { method: "DELETE" });
    router.push("/vibe");
  } catch (e) {
    error.value = e.message || "删除失败";
    delConfirm.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(fetchPost);
</script>

<style scoped>
.module-page {
  padding-top: 0;
  padding-bottom: 100px;
}

.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}
.header-actions { display: flex; gap: 10px; }

.btn-back {
  background: none; border: none; color: var(--text); cursor: pointer;
  font-size: 14px; opacity: 0.6; letter-spacing: 1px; transition: opacity 0.2s;
}
.btn-back:hover { opacity: 1; }

.btn-action {
  padding: 6px 16px; border-radius: 14px;
  border: 1px solid var(--glass-border); background: transparent; color: var(--text);
  cursor: pointer; font-size: 12px; transition: background 0.2s;
}
.btn-action:hover { background: var(--glass-border); }
.btn-action.danger { border-color: rgba(192,57,43,0.4); color: #e74c3c; }
.btn-action.danger:hover { background: rgba(192,57,43,0.2); }

.detail-title { font-size: 28px; font-weight: 500; margin-bottom: 8px; letter-spacing: 1px; }
.detail-date { font-size: 12px; opacity: 0.4; display: block; margin-bottom: 24px; }

.detail-content {
  font-size: 15px; line-height: 1.8; opacity: 0.85; white-space: pre-wrap;
  margin-bottom: 32px;
}

.detail-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}
.detail-img {
  width: 100%; border-radius: 10px; object-fit: cover;
  border: 1px solid var(--glass-border);
}

.detail-files h3 {
  font-size: 16px; font-weight: 500; margin-bottom: 16px; opacity: 0.8;
}

.file-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 10px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  margin-bottom: 8px;
}
.file-name { flex: 1; font-size: 14px; }
.file-size { font-size: 12px; opacity: 0.4; }
.btn-dl {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--glass-border); background: transparent;
  color: var(--text); display: flex; align-items: center; justify-content: center;
  text-decoration: none; font-size: 16px; cursor: pointer; transition: background 0.2s;
}
.btn-dl:hover { background: var(--glass-border); }

.edit-section { margin-bottom: 20px; }
.section-title { font-size: 13px; font-weight: 500; opacity: 0.5; margin-bottom: 10px; letter-spacing: 1px; text-transform: uppercase; }

.edit-images { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.edit-img-item { position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border); }
.edit-img-thumb { width: 100%; height: 100%; object-fit: cover; }
.btn-img-remove {
  position: absolute; top: 2px; right: 2px;
  width: 20px; height: 20px; border-radius: 50%;
  border: none; background: rgba(192,57,43,0.8); color: #fff;
  font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;
}
.edit-img-add {
  width: 80px; height: 80px; border-radius: 8px;
  border: 1px dashed var(--glass-border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 24px; opacity: 0.4; transition: opacity 0.2s;
}
.edit-img-add:hover { opacity: 0.8; }

.edit-files { display: flex; flex-direction: column; gap: 6px; }
.edit-file-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
  font-size: 13px;
}
.edit-file-add {
  padding: 8px 14px; border-radius: 8px;
  border: 1px dashed var(--glass-border);
  cursor: pointer; font-size: 13px; opacity: 0.5; transition: opacity 0.2s;
  display: inline-block; text-align: center;
}
.edit-file-add:hover { opacity: 0.8; }
.edit-file-add .file-input { display: none; }

.file-input { display: none; }
.upload-hint { font-size: 12px; opacity: 0.4; display: block; margin-top: 6px; }
.upload-msg { font-size: 12px; opacity: 0.6; text-align: center; margin: 12px 0 0; }

.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }

.btn-save {
  padding: 10px 24px; border-radius: 20px; border: none;
  background: rgba(255,255,255,0.12); color: var(--text);
  cursor: pointer; font-size: 13px; letter-spacing: 1px;
}
.btn-save:hover { background: rgba(255,255,255,0.2); }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline {
  padding: 10px 24px; border-radius: 20px;
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  color: var(--text); cursor: pointer; font-size: 13px; letter-spacing: 1px;
}
.btn-outline:hover { background: var(--glass-border); }

.btn-danger {
  padding: 10px 24px; border-radius: 20px;
  border: 1px solid #c0392b; background: #c0392b; color: #fff;
  cursor: pointer; font-size: 13px; letter-spacing: 1px;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.input-lg {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
  border-radius: 10px; padding: 12px 16px; color: var(--text);
  font-size: 20px; outline: none; margin-bottom: 16px; font-family: inherit;
}
.input-lg:focus { border-color: rgba(255,255,255,0.2); }

.textarea {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
  border-radius: 10px; padding: 12px 16px; color: var(--text);
  font-size: 14px; outline: none; margin-bottom: 16px; font-family: inherit; resize: vertical;
}
.textarea:focus { border-color: rgba(255,255,255,0.2); }

.status { display: flex; justify-content: center; padding: 80px 24px; }
.status-error { font-size: 14px; color: #c0392b; opacity: 0.7; }

.skeleton-strip {
  width: 280px; height: 16px; border-radius: 8px;
  background: var(--glass-bg); animation: pulse 1.5s ease-in-out infinite;
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
  padding: 32px; max-width: 420px; width: 90%;
}
.modal-card h3 { font-size: 20px; font-weight: 500; margin-bottom: 16px; }
.modal-card p { font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
</style>
