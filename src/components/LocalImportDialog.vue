<template>
  <Teleport to="body">
    <div v-if="visible" class="local-overlay" @click.self="close">
      <div class="local-dialog">
        <button class="local-close" title="关闭" @click="close">×</button>
        <h2>本地导入</h2>
        <p class="local-note">导入内容只保存在当前浏览器，不会上传服务器。清除浏览器数据或更换设备后可能丢失。</p>
        <label class="drop-zone">
          <span class="drop-title">选择插件导出的 ZIP</span>
          <span class="drop-subtitle">支持 nai-preset-switcher-gallery-export</span>
          <input type="file" accept=".zip,application/zip" @change="onFile" />
        </label>
        <p v-if="busy" class="local-status">正在导入，请稍候...</p>
        <p v-if="message" class="local-status">{{ message }}</p>
        <div v-if="total" class="local-summary">本地内容：{{ counts.gallery }} 个画廊批次、{{ counts.prompts }} 个提示词、{{ counts.vibes }} 个 Vibe</div>
        <div class="local-actions">
          <button class="btn-outline" :disabled="busy" @click="clearAll">清空本地内容</button>
          <button class="btn-save" @click="close">完成</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { clearLocalRecords, importZip, initLocalImport, localState } from "../lib/localImport.js";
import { addToast } from "../stores/toast.js";

const visible = ref(false);
const busy = ref(false);
const message = ref("");
const local = localState();
const total = computed(() => local.gallery.length + local.prompts.length + local.vibes.length);
const counts = computed(() => ({ gallery: local.gallery.length, prompts: local.prompts.length, vibes: local.vibes.length }));

function open() { visible.value = true; message.value = ""; initLocalImport(); }
function close() { if (!busy.value) visible.value = false; }
async function onFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  busy.value = true; message.value = "";
  try {
    const result = await importZip(file);
    message.value = `导入完成：新增 ${result.imported} 项，跳过 ${result.skipped} 项。`;
    addToast(message.value, "success");
  } catch (error) {
    message.value = error.message || "导入失败";
    addToast(message.value, "error");
  } finally { busy.value = false; }
}
async function clearAll() {
  if (!confirm("确定清空当前浏览器中的全部本地内容吗？")) return;
  await clearLocalRecords();
  message.value = "本地内容已清空";
}
onMounted(() => {
  window.addEventListener("nai-gallery:open-local-import", open);
  initLocalImport();
});
onUnmounted(() => window.removeEventListener("nai-gallery:open-local-import", open));
</script>

<style scoped>
.local-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(0,0,0,.55); backdrop-filter: blur(8px); display:flex; align-items:center; justify-content:center; padding:20px; }
.local-dialog { position:relative; width:min(520px, 100%); padding:30px; border:1px solid var(--glass-border); border-radius:16px; background:var(--glass-bg); backdrop-filter:blur(18px); }
.local-close { position:absolute; top:12px; right:14px; border:0; background:transparent; color:var(--text); font-size:26px; cursor:pointer; opacity:.6; }
h2 { margin:0 0 12px; font-size:22px; font-weight:500; }
.local-note, .local-status, .local-summary { font-size:13px; line-height:1.6; opacity:.7; }
.drop-zone { display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center; min-height:150px; margin:24px 0; border:1px dashed var(--glass-border); border-radius:12px; cursor:pointer; text-align:center; }
.drop-zone:hover { background:var(--glass-border); }
.drop-zone input { display:none; }
.drop-title { font-size:15px; }
.drop-subtitle { font-size:12px; opacity:.5; }
.local-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:24px; }
.btn-outline, .btn-save { padding:9px 18px; border-radius:18px; border:1px solid var(--glass-border); background:transparent; color:var(--text); cursor:pointer; font-size:13px; }
.btn-save { background:rgba(255,255,255,.12); }
button:disabled { opacity:.45; cursor:not-allowed; }
</style>