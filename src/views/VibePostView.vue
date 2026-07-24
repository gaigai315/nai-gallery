<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />

    <div v-if="loading" class="status"><div class="skeleton-strip"></div></div>
    <div v-else-if="error" class="status"><p class="status-error">{{ error }}</p></div>

    <article v-else class="post-detail">
      <div class="detail-header">
        <button class="btn-back" @click="router.push('/vibe')">← 返回</button>
        <div class="header-actions" v-if="isAdmin">
          <button class="btn-action" @click="editing = !editing">{{ editing ? '取消' : '编辑' }}</button>
          <button class="btn-action danger" @click="confirmDelete">删除</button>
        </div>
      </div>

      <template v-if="editing">
        <input v-model="editForm.title" class="input-lg" placeholder="标题" />
        <textarea v-model="editForm.content" class="textarea" placeholder="正文..." rows="8"></textarea>
        <div class="form-actions">
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

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="delConfirm" class="modal-overlay" @click.self="delConfirm = false">
        <div class="modal-card">
          <h3>确认删除</h3>
          <p>确定要删除「{{ post.title }}」？</p>
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
const saving = ref(false);
const editError = ref("");

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

async function fetchPost() {
  loading.value = true;
  error.value = "";
  try {
    const data = await apiFetch("/api/vibe/" + route.params.id);
    post.value = data;
  } catch (e) {
    error.value = e.message || "加载失败";
  } finally {
    loading.value = false;
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

async function saveEdit() {
  saving.value = true;
  editError.value = "";
  try {
    const data = await apiFetch("/api/admin/vibe/" + route.params.id, {
      method: "PATCH",
      body: JSON.stringify(editForm.value),
    });
    post.value.title = editForm.value.title;
    post.value.content = editForm.value.content;
    editing.value = false;
  } catch (e) {
    editError.value = e.message || "保存失败";
  } finally {
    saving.value = false;
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
