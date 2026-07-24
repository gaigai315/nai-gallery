<template>
  <div class="waterfall-container" v-if="cards.length">
    <div
      v-for="(card, i) in cards"
      :key="card.batch_id || i"
      class="waterfall-card"
      @click="$emit('unlock', card)"
    >
      <img :src="card.cover" :alt="card.batch_name" loading="lazy" />
      <button
        v-if="isAdmin"
        class="card-delete-btn"
        title="删除此批次"
        @click.stop="$emit('delete', card)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cards: { type: Array, default: () => [] },
  isAdmin: { type: Boolean, default: false },
});

defineEmits(["unlock", "delete"]);
</script>

<style scoped>
.waterfall-container {
  column-count: 3;
  column-gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.waterfall-card {
  break-inside: avoid;
  margin-bottom: 24px;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.4s, box-shadow 0.4s;
  position: relative;
  background: var(--glass-bg);
}

.waterfall-card img {
  width: 100%;
  display: block;
  max-height: 480px;
  object-fit: cover;
}

.waterfall-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 36px var(--glow);
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
  opacity: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e74c3c;
  transition: background 0.2s, opacity 0.15s;
  z-index: 10;
}
.card-delete-btn:hover {
  background: rgba(192,57,43,0.4);
}
.waterfall-card:hover .card-delete-btn {
  opacity: 1;
}

@media (max-width: 1024px) {
  .waterfall-container { column-count: 2; column-gap: 16px; }
  .waterfall-card { margin-bottom: 20px; }
}

@media (min-width: 1800px) {
  .waterfall-container { column-count: 4; column-gap: 20px; }
}

@media (max-width: 768px) {
  .waterfall-container {
    column-count: 2;
    column-gap: 12px;
    padding: 0 12px;
  }
  .waterfall-card { margin-bottom: 16px; border-radius: 16px; }
  .waterfall-card img { max-height: 300px; }
}
</style>
