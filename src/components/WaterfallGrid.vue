<template>
  <div class="waterfall-container" v-if="cards.length">
    <div
      v-for="(card, i) in cards"
      :key="card.batch_id || i"
      class="waterfall-card"
      @click="$emit('unlock', card)"
    >
      <img :src="card.cover" :alt="card.batch_name" loading="lazy" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  cards: { type: Array, default: () => [] },
});

defineEmits(["unlock"]);
</script>

<style scoped>
.waterfall-container {
  column-count: 2;
  column-gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

.waterfall-card {
  break-inside: avoid;
  margin-bottom: 32px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.4s, box-shadow 0.4s;
}

.waterfall-card img {
  width: 100%;
  display: block;
}

.waterfall-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px var(--glow);
}

@media (max-width: 768px) {
  .waterfall-container {
    column-count: 2;
    column-gap: 16px;
  }
}
</style>
