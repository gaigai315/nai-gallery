<template>
  <div class="inner-grid">
    <div
      v-for="image in images"
      :key="image.image_id"
      class="inner-item"
      @click="$emit('open', image)"
    >
      <img :src="image.preview_url" :alt="image.image_id" loading="lazy" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  images: { type: Array, default: () => [] },
});

defineEmits(["open"]);
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

@media (max-width: 768px) {
  .inner-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
