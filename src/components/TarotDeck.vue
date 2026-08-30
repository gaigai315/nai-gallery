<template>
  <div class="tarot-container" ref="trackRef"
    @mousedown.prevent="dragStart"
    @touchstart.passive="dragStart"
    @mousemove.prevent="dragMove"
    @touchmove.prevent="dragMove"
    @mouseup="dragEnd"
    @touchend="dragEnd"
  >
    <div class="tarot-card-title">{{ cards[currentIndex]?.batch_name || '' }}</div>
    <div
      v-for="(card, i) in cards"
      :key="card.batch_id || i"
      class="tarot-card"
      :style="cardStyle(i)"
      @click="selectCard(i)"
    >
      <img :src="card.cover" :alt="card.batch_name" loading="lazy" />
      <button
        v-if="isAdmin || (allowLocalDelete && String(card.batch_id || '').startsWith('local:'))"
        class="card-delete-btn"
        title="删除此批次"
        @click.stop="emit('delete', card)"
      >
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  cards: { type: Array, default: () => [] },
  selected: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  allowLocalDelete: { type: Boolean, default: false },
});

const emit = defineEmits(["select", "unlock", "delete"]);

const trackRef = ref(null);
const currentIndex = ref(props.selected);
let startX = 0;
let isDragging = false;

function cardStyle(i) {
  const diff = i - currentIndex.value;
  const isMobile = window.innerWidth <= 768;
  const xOffset = isMobile ? 100 : 140;
  const translateX = diff * xOffset;
  const translateY = Math.abs(diff) * 30;
  const rotateZ = diff * 15;
  const scale = 1 - Math.abs(diff) * 0.1;
  const zIndex = 10 - Math.abs(diff);

  return {
    transform: "translateX(" + translateX + "px) translateY(" + translateY + "px) rotateZ(" + rotateZ + "deg) scale(" + scale + ")",
    zIndex,
    filter: diff === 0 ? "none" : "blur(4px) brightness(0.7)",
    cursor: diff === 0 ? "pointer" : "pointer",
  };
}

function selectCard(i) {
  if (i === currentIndex.value) {
    emit("unlock", props.cards[i]);
  } else {
    currentIndex.value = i;
    emit("select", i);
  }
}

function dragStart(e) {
  isDragging = true;
  startX = e.type.includes("mouse") ? e.pageX : e.touches[0].pageX;
}

function dragMove(e) {
  if (!isDragging) return;
}

function dragEnd(e) {
  if (!isDragging) return;
  isDragging = false;
  const endX = e.type.includes("mouse") ? e.pageX : e.changedTouches[0].pageX;
  const diffX = endX - startX;
  const max = props.cards.length - 1;
  if (diffX > 50 && currentIndex.value > 0) currentIndex.value--;
  else if (diffX < -50 && currentIndex.value < max) currentIndex.value++;
}

function onResize() {}

watch(() => props.cards.length, (length) => {
  currentIndex.value = Math.min(currentIndex.value, Math.max(0, length - 1));
});

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.tarot-container {
  position: relative;
  width: 100%;
  height: 60vh;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
  overflow: hidden;
  touch-action: pan-y;
}

.tarot-card-title {
  position: absolute;
  top: calc(50% - 226px);
  left: 50%;
  width: min(320px, calc(100% - 48px));
  min-height: 24px;
  transform: translateX(-50%);
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  overflow-wrap: anywhere;
}

.tarot-card {
  position: absolute;
  width: 260px;
  height: 380px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 20px 40px var(--shadow);
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s, filter 0.6s;
  transform-origin: bottom center;
  user-select: none;
  -webkit-user-drag: none;
}

.tarot-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.card-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(192,57,43,0.4);
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  opacity: 0.7;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e74c3c;
  transition: background 0.2s, opacity 0.15s;
  z-index: 20;
}
.card-delete-btn:hover {
  background: rgba(192,57,43,0.4);
}

@media (max-width: 768px) {
  .tarot-card-title {
    top: calc(50% - 186px);
    font-size: 14px;
  }

  .tarot-card {
    width: 200px;
    height: 300px;
  }
}
</style>
