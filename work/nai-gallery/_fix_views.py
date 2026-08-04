# -*- coding: utf-8 -*-
import os

BASE = r"C:\work\nai-gallery\src\views"

def write_file(filename, content):
    path = os.path.join(BASE, filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK: {filename}")

# =============================================
# NotFoundView.vue
# =============================================
write_file("NotFoundView.vue", """<template>
  <div class="notfound-page">
    <div class="notfound-glass">
      <h1>404</h1>
      <p>页面不存在</p>
      <router-link to="/gallery" class="btn-primary">返回画廊</router-link>
    </div>
  </div>
</template>

<style scoped>
.notfound-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
.notfound-glass {
  text-align: center;
  padding: 60px 80px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(20px);
}
.notfound-glass h1 {
  font-size: 80px;
  font-weight: 200;
  margin: 0 0 8px;
  color: var(--text);
  opacity: 0.6;
}
.notfound-glass p {
  font-size: 16px;
  color: var(--secondary);
  margin-bottom: 32px;
}
.btn-primary {
  display: inline-block;
  padding: 10px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.btn-primary:hover { background: rgba(255,255,255,0.1); }
</style>
""")

# =============================================
# FeedbackView.vue
# =============================================
write_file("FeedbackView.vue", """<template>
  <div class="module-page">
    <ModuleNav @openSearch="searchOpen = true" />

    <div class="module-header">
      <h2>反馈</h2>
    </div>

    <div class="feedback-card">
      <p class="feedback-desc">您的反馈将匿名提交，仅站长可见</p>

      <textarea v-model="formContent" class="textarea" placeholder="写下你的想法..." rows="6" :disabled="submitted"></textarea>

      <div class="upload-section">
        <label class="upload-label" :class="{ disabled: submitted }">
          <span>添加图片 (可选)</span>
          <input type="file" multiple accept="image/*" @change="onImagesSelected" class="file-input" :disabled="submitted" />
        </label>
        <span class="upload-hint" v-if="formImages.length">{{ formImages.length }} 张已选</span>
      </div>

      <p v-if="uploadProgress" class="upload-status">{{ uploadProgress }}</p>

      <button class="btn-submit" :disabled="!formContent.trim() || saving || submitted" @click="submit">
        {{ submitted ? '已提交，感谢反馈' : saving ? '提交中...' : '提交反馈' }}
      </button>

      <p v-if="formError" class="status-error">{{ formError }}</p>
    </div>

    <SearchOverlay v-model:visible="searchOpen" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { apiFetch } from "../lib/api.js";
import { compressToJpeg } from "../lib/upload.js";
import ModuleNav from "../components/ModuleNav.vue";
import SearchOverlay from "../components/SearchOverlay.vue";

const searchOpen = ref(false);
const formContent = ref("");
const formImages = ref([]);
const saving = ref(false);
const submitted = ref(false);
const formError = ref("");
const uploadProgress = ref("");

function onImagesSelected(e) {
  formImages.value = Array.from(e.target.files || []);
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

async function submit() {
  if (!formContent.value.trim()) return;
  saving.value = true;
  formError.value = "";
  uploadProgress.value = "";

  try {
    let imagesJson = "[]";
    if (formImages.value.length > 0) {
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
            wish_id: "feedback",
            files: imgData.map((e) => ({ file_name: e.file_name, content_type: "image/jpeg" })),
          }),
          silent: true,
        });
        const entries = signResp.entries || [];
        await uploadPut(entries, imgData.map(d => d.blob), imgData.map(() => "image/jpeg"));
        imagesJson = JSON.stringify(imgData.map((img, i) => ({
          r2_key: entries[i]?.key || "",
          file_name: img.file_name,
          width: img.width,
          height: img.height,
        })));
      }
    }

    uploadProgress.value = "提交中...";
    await apiFetch("/api/feedbacks", {
      method: "POST",
      body: JSON.stringify({ content: formContent.value, images_json: imagesJson }),
      silent: true,
    });

    submitted.value = true;
    uploadProgress.value = "";
  } catch (e) {
    formError.value = e.message || "提交失败";
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.module-page { padding-top: 0; padding-bottom: 100px; }
.module-header { display: flex; align-items: center; justify-content: space-between; max-width: 640px; margin: 0 auto 24px; padding: 0 24px; }
.module-header h2 { font-size: 24px; font-weight: 500; letter-spacing: 2px; }

.feedback-card {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 28px;
  border-radius: 16px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  margin-left: 24px;
  margin-right: 24px;
}

.feedback-desc { font-size: 13px; opacity: 0.5; margin-bottom: 20px; }

.textarea {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  margin-bottom: 14px;
  font-family: inherit;
  resize: vertical;
}
.textarea:focus { border-color: rgba(255,255,255,0.2); }
.textarea:disabled { opacity: 0.5; cursor: not-allowed; }

.upload-section { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.upload-label {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 10px;
  border: 1px dashed var(--glass-border);
  cursor: pointer; font-size: 13px; opacity: 0.7;
  transition: opacity 0.2s, border-color 0.2s;
}
.upload-label:hover { opacity: 1; border-color: rgba(255,255,255,0.3); }
.upload-label.disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
.file-input { display: none; }
.upload-hint { font-size: 12px; opacity: 0.4; }
.upload-status { font-size: 12px; opacity: 0.6; margin: 8px 0; text-align: center; }

.btn-submit {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: var(--text);
  cursor: pointer;
  font-size: 14px;
  letter-spacing: 1px;
  transition: background 0.3s;
  margin-top: 8px;
}
.btn-submit:hover { background: rgba(255,255,255,0.18); }
.btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.status-error { font-size: 14px; color: #c0392b; opacity: 0.7; margin-top: 12px; text-align: center; }
</style>
""")

print("Done: FeedbackView")
