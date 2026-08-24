<template>
  <div class="gallery-top-bar">
    <button class="view-circle" :title="isTarot ? '网格视图' : '塔罗视图'" @click="$emit('toggleView')">
      <svg v-if="isTarot" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
      <svg v-else viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
    </button>
    <div class="module-pill" ref="pillRef">
      <span class="pill-slider" :class="{ ready }" :style="sliderStyle"></span>
      <router-link to="/gallery" custom v-slot="{ isActive, navigate }">
        <button ref="btn0" :class="{ active: isActive }" @click="navigate">画廊</button>
      </router-link>
      <router-link to="/vibe" custom v-slot="{ isActive, navigate }">
        <button ref="btn1" :class="{ active: isActive }" @click="navigate">Vibe</button>
      </router-link>
      <router-link to="/prompts" custom v-slot="{ isActive, navigate }">
        <button ref="btn2" :class="{ active: isActive }" @click="navigate">提示词</button>
      </router-link>
      <router-link to="/other" custom v-slot="{ isActive, navigate }">
        <button ref="btn3" :class="{ active: isActive }" @click="navigate">其他</button>
      </router-link>
    </div>
    <button v-if="showEditBtn" class="view-circle edit-toggle" :class="{ active: editMode }" :title="editMode ? '退出编辑模式' : '编辑模式'" @click="$emit('toggleEdit')">
      <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
    </button>
    <button class="view-circle" title="搜索" @click="$emit('openSearch')">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute } from "vue-router";

defineProps({
  isTarot: { type: Boolean, default: false },
  showEditBtn: { type: Boolean, default: false },
  editMode: { type: Boolean, default: false },
});

defineEmits(["toggleView", "openSearch", "toggleEdit"]);

const route = useRoute();
const pillRef = ref(null);
const btn0 = ref(null);
const btn1 = ref(null);
const btn2 = ref(null);
const btn3 = ref(null);
const btnRefs = [btn0, btn1, btn2, btn3];
const sliderStyle = ref({ left: "0px", width: "0px", opacity: 0 });
const ready = ref(false);

const routes = ["/gallery", "/vibe", "/prompts", "/other"];

function updateSlider() {
  const pill = pillRef.value;
  if (!pill) return;
  const idx = routes.findIndex(
    (p) => route.path === p || route.path.startsWith(p + "/")
  );
  if (idx < 0) return;
  const btn = btnRefs[idx]?.value?.$el || btnRefs[idx]?.value;
  if (!btn) return;
  const pillRect = pill.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  sliderStyle.value = {
    left: (btnRect.left - pillRect.left) + "px",
    width: btnRect.width + "px",
    opacity: 1,
  };
}

watch(() => route.path, () => nextTick(() => requestAnimationFrame(updateSlider)));
onMounted(() => {
  nextTick(() => {
    updateSlider();
    requestAnimationFrame(() => { ready.value = true; });
  });
  window.addEventListener("resize", updateSlider);
});
onUnmounted(() => { window.removeEventListener("resize", updateSlider); });
</script>

<style scoped>
.gallery-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  margin-bottom: 32px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--glass-border);
}

.view-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  flex-shrink: 0;
  transition: background 0.3s, border-color 0.3s;
}
.view-circle:hover { background: var(--glass-border); }
.view-circle svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 1.5; fill: none; }
.edit-toggle.active { background: rgba(192,57,43,0.15); border-color: #c0392b; }

.module-pill {
  display: inline-flex;
  gap: 8px;
  position: relative;
  background: var(--glass-bg);
  padding: 4px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  flex-shrink: 1;
  overflow-x: auto;
  overflow-y: visible;
}

.pill-slider {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 14px;
  background: var(--glass-border);
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.pill-slider.ready {
  opacity: 1;
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease;
}

.module-pill button {
  position: relative;
  z-index: 1;
  background: transparent;
  border: none;
  padding: 6px 16px;
  border-radius: 14px;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  transition: opacity 0.3s, transform 0.2s ease, font-weight 0.3s;
  white-space: nowrap;
  opacity: 0.5;
}
.module-pill button:hover { transform: scale(1.05); }
.module-pill button.active { opacity: 1; font-weight: bold; background: transparent; }
.module-pill button:disabled { opacity: 0.25; cursor: not-allowed; }

@media (max-width: 600px) {
  .gallery-top-bar { padding: 8px 12px; gap: 8px; }
  .module-pill button { padding: 4px 10px; font-size: 11px; }
  .view-circle { width: 34px; height: 34px; }
  .view-circle svg { width: 16px; height: 16px; }
}

@media (min-width: 769px) {
  .gallery-top-bar {
    border-radius: 0 0 24px 24px;
    margin-left: auto;
    margin-right: auto;
    max-width: 960px;
    padding-left: 24px;
    padding-right: 24px;
  }
}
</style>
