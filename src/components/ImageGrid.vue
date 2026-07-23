<template>
  <div class="inner-grid">
    <div
      v-for="group in groups"
      :key="group.key"
      class="inner-item"
      :class="{ 'has-multiple': group.images.length > 1 }"
      @click="$emit('open', group.images[0], group)"
    >
      <img :src="group.images[0].preview_url" :alt="group.key" loading="lazy" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  images: { type: Array, default: () => [] },
});

defineEmits(["open"]);

// Group images by positive_prompt, fallback to prompt_preview
const groups = computed(() => {
  const map = new Map();
  for (const img of props.images) {
    const key = img.positive_prompt || img.prompt_preview || img.image_id;
    if (!map.has(key)) {
      map.set(key, { key, images: [] });
    }
    map.get(key).images.push(img);
  }
  return [...map.values()];
});
</script>

<style scoped>
.inner-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.inner-item {
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 3/4;
  transition: transform 0.4s;
  position: relative;
}

.inner-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s;
}

.inner-item:hover img {
  transform: scale(1.05);
}

.inner-item::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--glow);
  opacity: 0;
  transition: opacity 0.4s;
  mix-blend-mode: overlay;
}

.inner-item:hover::after {
  opacity: 1;
}

.has-multiple::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  border: 2px solid var(--secondary);
  opacity: 0.4;
  z-index: 1;
  pointer-events: none;
}

@media (max-width: 768px) {
  .inner-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
