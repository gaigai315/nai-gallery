<template>
  <div class="book-container">
    <div class="book" ref="bookRef">
      <div
        v-for="(page, i) in pages"
        :key="page.key"
        class="page"
        :style="pageStyle(i)"
        @click="flipTo(i)"
      >
        <div class="face front">
          <img :src="page.front" alt="" loading="lazy" />
        </div>
        <div class="face back">
          <img :src="page.back" alt="" loading="lazy" />
        </div>
      </div>
    </div>
    <div v-if="totalLeaves" class="book-page-indicator">{{ currentLeaf + 1 }} / {{ totalLeaves }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  images: { type: Array, default: () => [] },
});

const emit = defineEmits(["open"]);

const bookRef = ref(null);
const currentLeaf = ref(0);

const totalLeaves = computed(() => props.images.length);

const pages = computed(() => {
  return props.images.map((image, index) => {
    const preview = image?.preview_url || image;
    return { key: image?.image_id || index, front: preview, back: preview };
  });
});

watch(totalLeaves, (total) => {
  currentLeaf.value = Math.min(currentLeaf.value, Math.max(0, total - 1));
});

function pageStyle(i) {
  const isMobile = window.innerWidth <= 768;
  const xOffset = isMobile ? 25 : 45;
  const zOffset = isMobile ? -15 : -30;

  if (i < currentLeaf.value) {
    const diff = currentLeaf.value - 1 - i;
    const translateX = diff * -xOffset;
    const translateZ = diff * zOffset;
    const rotateY = -180 - diff * 2.5;
    const brightness = 1 - diff * 0.08;
    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: i,
      filter: `brightness(${brightness})`,
    };
  } else {
    const diff = i - currentLeaf.value;
    const translateX = diff * xOffset;
    const translateZ = diff * zOffset;
    const rotateY = diff * 2.5;
    const brightness = 1 - diff * 0.08;
    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: totalLeaves.value - i,
      filter: `brightness(${brightness})`,
    };
  }
}

function flipTo(i) {
  if (i === currentLeaf.value && i < totalLeaves.value - 1) {
    currentLeaf.value = i + 1;
  } else if (i !== currentLeaf.value) {
    currentLeaf.value = i;
  }
}

function onResize() {
  // trigger re-render via computed
}

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.book-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  width: 100%;
  height: 60vh;
  margin: 40px auto 0;
  perspective: 2000px;
  justify-content: center;
  align-items: center;
}

.book-page-indicator {
  font-size: 12px;
  letter-spacing: 2px;
  opacity: 0.4;
}

.book {
  position: relative;
  width: 320px;
  height: 460px;
  perspective: 2500px;
  transform-style: preserve-3d;
}

.page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.8s ease;
  cursor: pointer;
}

.face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--bg);
  border: 1px solid var(--glass-border);
}

.face.front {
  border-radius: 0 16px 16px 0;
  transform: translateZ(1px);
  background: linear-gradient(to right, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0) 8%), var(--bg);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.2), 3px 5px 15px var(--shadow);
}

.face.back {
  border-radius: 16px 0 0 16px;
  transform: rotateY(180deg) translateZ(1px);
  background: linear-gradient(to left, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0) 8%), var(--bg);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.2), -3px 5px 15px var(--shadow);
}

.face img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 768px) {
  .book {
    width: 180px;
    height: 260px;
  }
}
</style>
