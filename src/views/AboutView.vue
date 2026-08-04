<template>
  <div class="about-page">
    <!-- 背景大图 -->
    <div class="about-cover" :style="bgStyle">
      <div v-if="!bgUrl" class="cover-placeholder"></div>
    </div>

    <!-- 头像区 -->
    <div class="about-avatar-row">
      <div class="avatar-ring">
        <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
        <div v-else class="avatar-placeholder">?</div>
      </div>
    </div>

    <!-- 信息区 -->
    <div class="about-info">
      <h1 class="about-name">{{ displayName || 'The Glasshouse' }}</h1>
      <p v-if="bio" class="about-bio">{{ bio }}</p>
      <p v-else class="about-bio placeholder-text">还没有简介。</p>

      <!-- Discord 链接 -->
      <div v-if="discordLinks.length" class="discord-links">
        <a
          v-for="(link, i) in discordLinks"
          :key="i"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="discord-btn"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" class="discord-icon">
            <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.058c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span>{{ link.label }}</span>
        </a>
      </div>
      <div v-else class="discord-links">
        <span class="placeholder-text">暂无 Discord 链接。</span>
      </div>
    </div>

    <!-- 作者的话 -->
    <div v-if="authorNote" class="author-note">
      <p class="author-note-label">作者的话</p>
      <p class="author-note-text">{{ authorNote }}</p>
    </div>

    <!-- 管理员编辑按钮 -->
    <div v-if="isAdmin" class="admin-zone">
      <button class="edit-btn" @click="openEditor">编辑资料</button>
    </div>

    <!-- 编辑模态框 -->
    <Teleport to="body">
      <div v-if="editing" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-card editor-modal">
          <h3>编辑关于页面</h3>

          <label class="field">
            <span>头像</span>
            <div class="upload-preview" @click="$refs.avatarInput.click()">
              <img v-if="avatarPreview" :src="avatarPreview" class="preview-img" />
              <span v-else class="upload-hint">点击上传头像</span>
            </div>
            <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarFile" />
          </label>

          <label class="field">
            <span>背景图</span>
            <div class="upload-preview bg-preview" @click="$refs.bgInput.click()">
              <img v-if="bgPreview" :src="bgPreview" class="preview-img" />
              <span v-else class="upload-hint">点击上传背景</span>
            </div>
            <input ref="bgInput" type="file" accept="image/*" hidden @change="onBgFile" />
          </label>

          <label class="field">
            <span>显示名称</span>
            <input v-model="form.display_name" placeholder="The Glasshouse" />
          </label>

          <label class="field">
            <span>简介</span>
            <textarea v-model="form.bio" rows="3" placeholder="介绍一下你自己..." class="settings-textarea"></textarea>
          </label>

          <label class="field">
            <span>Discord 链接</span>
          </label>
          <div v-for="(link, i) in form.discord_links" :key="i" class="link-row">
            <input v-model="link.label" placeholder="标签" class="link-label" />
            <input v-model="link.url" placeholder="https://discord.gg/..." class="link-url" />
            <button class="icon-btn small danger" @click="form.discord_links.splice(i, 1)">
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
            </button>
          </div>
          <button class="btn-outline tiny" style="margin-top:4px" @click="form.discord_links.push({ label: '', url: '' })">+ 添加链接</button>

          <label class="field" style="margin-top: 16px;">
            <span>作者的话</span>
            <textarea v-model="form.author_note" rows="4" placeholder="想对大家说的话..." class="settings-textarea"></textarea>
          </label>

          <div class="modal-actions">
            <button class="btn-outline" @click="closeEditor">取消</button>
            <button class="btn-primary" :disabled="saving" @click="saveAbout">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
          <p v-if="saveError" class="status-error">{{ saveError }}</p>
        </div>
      </div>
    </Teleport>

    <nav class="about-back">
      <router-link to="/other" class="back-link">← 返回</router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '../lib/api.js';
import { compressToJpeg } from '../lib/upload.js';
import { useUser } from '../stores/user.js';

const { isAdmin } = useUser();

const displayName = ref('');
const bio = ref('');
const discordLinks = ref([]);
const authorNote = ref('');

const avatarUrl = ref('');
const bgUrl = ref('');

const bgStyle = computed(() => bgUrl.value ? { backgroundImage: `url(${bgUrl.value})` } : {});

const editing = ref(false);
const saving = ref(false);
const saveError = ref('');
const avatarPreview = ref('');
const bgPreview = ref('');
const avatarFile = ref(null);
const bgFile = ref(null);

const form = ref({
  display_name: '',
  bio: '',
  discord_links: [{ label: '', url: '' }],
  author_note: '',
});

async function fetchAbout() {
  try {
    const data = await apiFetch('/api/site-config');
    displayName.value = data.about_display_name || '';
    bio.value = data.about_bio || '';
    try { discordLinks.value = JSON.parse(data.about_discord_links || '[]'); } catch { discordLinks.value = []; }

    avatarUrl.value = data.about_avatar_url || '';
    bgUrl.value = data.about_bg_url || '';
    authorNote.value = data.about_author_note || '';
  } catch { /* ignore */ }
}

function openEditor() {
  form.value = {
    display_name: displayName.value,
    bio: bio.value,
    discord_links: discordLinks.value.length ? JSON.parse(JSON.stringify(discordLinks.value)) : [{ label: '', url: '' }],
    author_note: authorNote.value,
  };
  avatarPreview.value = avatarUrl.value;
  bgPreview.value = bgUrl.value;
  avatarFile.value = null;
  bgFile.value = null;
  saveError.value = '';
  editing.value = true;
}

function closeEditor() {
  editing.value = false;
}

function onAvatarFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  avatarFile.value = f;
  avatarPreview.value = URL.createObjectURL(f);
}

function onBgFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  bgFile.value = f;
  bgPreview.value = URL.createObjectURL(f);
}

async function uploadFile(file, prefix) {
  const compressed = await compressToJpeg(file, 0.90);
  const signResp = await apiFetch('/api/admin/about/upload-sign', {
    method: 'POST',
    body: JSON.stringify({ file_name: file.name, content_type: 'image/jpeg', prefix }),
  });
  await fetch(signResp.url, { method: 'PUT', body: compressed.blob, headers: { 'Content-Type': 'image/jpeg' } });
  return signResp.key;
}

async function saveAbout() {
  saving.value = true;
  saveError.value = '';
  try {
    const body = {
      display_name: form.value.display_name,
      bio: form.value.bio,
      discord_links: JSON.stringify(form.value.discord_links.filter(l => l.label || l.url)),
      author_note: form.value.author_note,
    };

    if (avatarFile.value) body.avatar_key = await uploadFile(avatarFile.value, 'avatar');
    if (bgFile.value) body.bg_key = await uploadFile(bgFile.value, 'bg');

    await apiFetch('/api/admin/about', { method: 'PUT', body: JSON.stringify(body) });
    editing.value = false;
    await fetchAbout();
  } catch (e) {
    saveError.value = e.message || '保存失败';
  } finally {
    saving.value = false;
  }
}

onMounted(fetchAbout);
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.about-cover {
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  position: relative;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 100%);
}

.about-avatar-row {
  display: flex;
  justify-content: center;
  margin-top: -60px;
  position: relative;
  z-index: 2;
}
.avatar-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.12);
  overflow: hidden;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  opacity: 0.25;
  font-family: serif;
}

.about-info {
  text-align: center;
  padding: 20px 24px 0;
  max-width: 500px;
  margin: 0 auto;
}
.about-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
  margin: 0 0 8px;
}
.about-bio {
  font-size: 14px;
  opacity: 0.6;
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0;
}
.placeholder-text {
  opacity: 0.3;
}

.discord-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}
.discord-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 24px;
  background: rgba(88,101,242,0.12);
  border: 1px solid rgba(88,101,242,0.25);
  color: #b8b9ff;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.25s;
  min-width: 200px;
  justify-content: center;
}
.discord-btn:hover {
  background: rgba(88,101,242,0.22);
  border-color: rgba(88,101,242,0.4);
  color: #d0d1ff;
}
.discord-icon { flex-shrink: 0; }

.author-note {
  margin-top: 32px;
  padding: 20px 24px;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}
.author-note-label {
  font-size: 12px;
  opacity: 0.4;
  letter-spacing: 2px;
  margin-bottom: 10px;
}
.author-note-text {
  font-size: 14px;
  line-height: 1.8;
  opacity: 0.65;
  white-space: pre-wrap;
  font-style: italic;
}

.admin-zone {
  text-align: center;
  margin-top: 32px;
}
.edit-btn {
  padding: 8px 28px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s;
  opacity: 0.6;
}
.edit-btn:hover { opacity: 1; border-color: var(--secondary); }

.about-back {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10;
}
.back-link {
  color: var(--text);
  opacity: 0.5;
  text-decoration: none;
  font-size: 14px;
  transition: opacity 0.3s;
}
.back-link:hover { opacity: 0.8; }

/* editor modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 24px;
  width: 440px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  backdrop-filter: blur(20px);
}
.modal-card h3 { font-size: 18px; margin: 0 0 16px; }
.field { display: block; margin-bottom: 14px; }
.field span { display: block; font-size: 12px; opacity: 0.5; margin-bottom: 4px; }
.field input, .settings-textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}
.field input:focus, .settings-textarea:focus { outline: none; border-color: var(--secondary); }

.upload-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 1px dashed var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s;
}
.upload-preview:hover { border-color: var(--secondary); }
.upload-preview.bg-preview { border-radius: 8px; width: 100%; height: 80px; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.upload-hint { font-size: 11px; opacity: 0.35; }

.link-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.link-label { width: 30%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--glass-border); background: transparent; color: var(--text); font-size: 12px; }
.link-url { flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--glass-border); background: transparent; color: var(--text); font-size: 12px; }
.link-label:focus, .link-url:focus { outline: none; border-color: var(--secondary); }

.modal-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
.btn-primary {
  padding: 8px 20px;
  border-radius: 18px;
  border: none;
  background: var(--secondary);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.25s;
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-outline {
  padding: 8px 20px;
  border-radius: 18px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s;
}
.btn-outline:hover { border-color: var(--secondary); }
.btn-outline.tiny { padding: 4px 10px; font-size: 11px; border-radius: 12px; }
.icon-btn.small { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--glass-border); background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.icon-btn.small.danger:hover { border-color: #e53e3e; color: #e53e3e; }
.status-error { font-size: 12px; color: #e53e3e; margin-top: 8px; }

@media (max-width: 640px) {
  .about-cover { height: 140px; }
  .avatar-ring { width: 96px; height: 96px; }
  .about-avatar-row { margin-top: -48px; }
  .about-name { font-size: 18px; }
  .discord-btn { min-width: auto; padding: 10px 20px; }
  .about-back { top: 12px; left: 12px; }
}
</style>
