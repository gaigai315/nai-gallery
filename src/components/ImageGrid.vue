<template>
  <div class="inner-grid">
    <div
      v-for="group in groups"
      :key="group.key"
      class="inner-card"
    >
      <div v-if="group.title || group.notes" class="inner-group-label">
        <div v-if="group.title" class="inner-group-title">{{ group.title }}</div>
        <div v-if="group.notes" class="inner-group-notes">{{ group.notes }}</div>
      </div>
      <div
        class="inner-item"
        :class="{ 'has-multiple': group.images.length > 1 }"
        @click="$emit('open', group.images[0], group)"
      >
        <img :src="group.images[0].preview_url" :alt="group.title || group.key" loading="lazy" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  images: { type: Array, default: () => [] },
  groupData: { type: Array, default: () => [] },
});

defineEmits(["open"]);

// Prefer the saved gallery group; imported or legacy images fall back to prompt grouping.
const groups = computed(() => {
  const groupMeta = new Map(props.groupData.map((group) => [group.group_id, group]));
  const map = new Map();
  for (const img of props.images) {
    const key = img.group_id || img.positive_prompt || img.prompt_preview || img.image_id;
    if (!map.has(key)) {
      const meta = groupMeta.get(img.group_id);
      map.set(key, {
        key,
        title: meta?.title || img.group_title || "",
        notes: meta?.notes || "",
        images: [],
      });
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

.inner-card { min-width: 0; }

.inner-group-label {
  min-height: 42px;
  margin-bottom: 10px;
  padding: 0 4px;
}

.inner-group-title {
  font-size: 13px;
  line-height: 1.5;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.inner-group-notes {
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
  opacity: 0.5;
  overflow-wrap: anywhere;
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
