<template>
  <div id="detail-view" :class="{ active: visible }" @click.self="close">
    <button class="icon-btn close-btn" @click="close">
      <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
    <div class="ambient-bg"></div>
    <div class="detail-left" @click.self="close">
      <img :src="image?.preview_url" :alt="image?.image_id" />
    </div>
    <div class="detail-right">
      <div class="right-scroll">
        <div class="prompt-section">
          <div class="prompt-title">POSITIVE PROMPT</div>
          <div class="prompt-box positive">
            <div class="shimmer" :class="{ active: posShimmer }"></div>
            {{ image?.positive_prompt || image?.prompt_preview || "" }}
          </div>
        </div>
        <div class="prompt-section">
          <div class="prompt-title">NEGATIVE PROMPT</div>
          <div class="prompt-box negative">
            <div class="shimmer" :class="{ active: negShimmer }"></div>
            {{ image?.negative_prompt || "" }}
          </div>
        </div>
        <div class="prompt-section" v-if="paramsStr">
          <div class="prompt-title">PARAMETERS</div>
          <div class="prompt-box">{{ paramsStr }}</div>
        </div>
      </div>
      <div class="action-bar">
        <button class="btn-outline" @click="copyPrompt('pos')">
          <svg viewBox="0 0 24 24"><path :d="posCopyIcon" /></svg>
          <span>{{ posCopyLabel }}</span>
        </button>
        <button class="btn-outline" @click="copyPrompt('neg')">
          <svg viewBox="0 0 24 24"><path :d="negCopyIcon" /></svg>
          <span>{{ negCopyLabel }}</span>
        </button>
        <button class="btn-outline" @click="$emit('download', image, 'image')">
          <svg viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
        <button class="btn-outline" @click="$emit('favorite', image)">
          <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  visible: Boolean,
  image: { type: Object, default: null },
});

const emit = defineEmits(["close", "download", "favorite"]);

const posShimmer = ref(false);
const negShimmer = ref(false);
const posCopyLabel = ref("Copy Pos");
const negCopyLabel = ref("Copy Neg");
const posCopyIcon = ref(ICON_COPY);
const negCopyIcon = ref(ICON_COPY);

const ICON_COPY = "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z";
const ICON_CHECK = "M5 13l4 4L19 7";

const paramsStr = computed(() => {
  const m = props.image?.metadata;
  if (!m) return "";
  return Object.entries(typeof m === "string" ? JSON.parse(m) : m)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
});

function close() { emit("close"); }

function copyPrompt(side) {
  const isPos = side === "pos";
  const shimmer = isPos ? posShimmer : negShimmer;
  const label = isPos ? posCopyLabel : negCopyLabel;
  const icon = isPos ? posCopyIcon : negCopyIcon;

  shimmer.value = false;
  void document.querySelector(`.prompt-box.${isPos ? "positive" : "negative"}`)?.offsetWidth;
  shimmer.value = true;

  const text = props.image?.[isPos ? "positive_prompt" : "negative_prompt"]
    || props.image?.prompt_preview || "";
  navigator.clipboard.writeText(text).catch(() => {});

  icon.value = ICON_CHECK;
  label.value = "Done";
  setTimeout(() => { icon.value = ICON_COPY; label.value = isPos ? "Copy Pos" : "Copy Neg"; }, 2000);
}
</script>

<style scoped>
#detail-view {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.8);
  z-index: 300;
  display: flex;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}
#detail-view.active { opacity: 1; pointer-events: auto; }

.ambient-bg {
  position: absolute; top: 50%; left: 30%;
  width: 60vw; height: 60vw;
  background: radial-gradient(circle, var(--glow) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  filter: blur(80px);
  opacity: 0.5;
  z-index: -1;
  pointer-events: none;
}

.detail-left {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  padding: 40px; position: relative; cursor: zoom-out;
}
.detail-left img {
  max-width: 100%; max-height: 90vh;
  border-radius: 16px; box-shadow: 0 24px 48px var(--shadow);
  cursor: default;
}

.detail-right {
  width: 420px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-left: 1px solid var(--glass-border);
  padding: 40px 40px 24px;
  display: flex;
  flex-direction: column;
  cursor: default;
}

.right-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.prompt-title {
  font-size: 11px; letter-spacing: 2px; opacity: 0.5; margin-bottom: 10px;
}

.prompt-box {
  position: relative;
  padding: 16px;
  border-radius: 16px;
  background: rgba(0,0,0,0.03);
  border: 1px solid var(--glass-border);
  font-size: 13px;
  line-height: 1.6;
  overflow: hidden;
}
[data-theme="dark"] .prompt-box { background: rgba(255,255,255,0.03); }
.prompt-box.positive { color: var(--secondary); }
.prompt-box.negative { color: #A85A5A; }

.shimmer {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: skewX(-20deg);
}
.shimmer.active { animation: shimmer-anim 0.8s ease-out forwards; }
@keyframes shimmer-anim { 100% { left: 200%; } }

.action-bar {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-shrink: 0;
}
.btn-outline {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 12px;
}
.btn-outline:hover { background: var(--glass-border); }
.btn-outline svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 1.5; fill: none; }

.close-btn {
  position: absolute; top: 24px; right: 24px; z-index: 310;
  background: var(--glass-bg); backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  cursor: pointer; padding: 8px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.3s;
}
.close-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 1.5; fill: none; }
.close-btn:hover { background: var(--glass-border); }

@media (max-width: 768px) {
  #detail-view { flex-direction: column; overflow-y: auto; }
  .detail-left { padding: 20px; min-height: 40vh; }
  .detail-right { width: 100%; border-left: none; border-top: 1px solid var(--glass-border); padding: 24px; }
  .action-bar { flex-wrap: wrap; }
  .btn-outline { flex: 1 0 40%; }
}
</style>
