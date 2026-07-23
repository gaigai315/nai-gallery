<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="dismiss">
        <div class="modal-card">
          <button class="modal-close" @click="dismiss">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          <div class="carousel-counter" v-if="items.length > 1">
            {{ current + 1 }} / {{ items.length }}
          </div>

          <div class="carousel-body">
            <img
              v-if="currentItem.image_url"
              :src="currentItem.image_url"
              class="modal-image"
            />
            <h2 class="modal-title">{{ currentItem.title }}</h2>
            <p class="modal-content">{{ currentItem.content }}</p>
          </div>

          <div class="carousel-footer">
            <button
              v-if="items.length > 1"
              class="carousel-arrow"
              :disabled="current === 0"
              @click="prev"
            >
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>

            <button class="btn-primary" @click="dismiss">知道了</button>

            <button
              v-if="items.length > 1"
              class="carousel-arrow"
              :disabled="current >= items.length - 1"
              @click="next"
            >
              <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
});

const emit = defineEmits(["dismiss"]);

const current = ref(0);
const visible = computed(() => props.items.length > 0);

const currentItem = computed(() => props.items[current.value] || {});

function prev() {
  if (current.value > 0) current.value--;
}

function next() {
  if (current.value < props.items.length - 1) current.value++;
}

function dismiss() {
  const lastId = props.items.reduce((max, a) => Math.max(max, a.id), 0);
  localStorage.setItem("last_read_announcement_id", String(lastId));
  emit("dismiss");
}

watch(() => props.items, () => { current.value = 0; });
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: var(--glass-bg); backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border); border-radius: 24px;
  padding: 40px 32px 32px; max-width: 480px; width: 90%;
  position: relative; text-align: center;
}
.modal-close {
  position: absolute; top: 16px; right: 16px;
  background: none; border: none; cursor: pointer;
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text); opacity: 0.5; transition: opacity 0.3s;
}
.modal-close:hover { opacity: 1; }
.modal-close svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2; fill: none; }

.carousel-counter {
  font-size: 11px; opacity: 0.4; letter-spacing: 2px; margin-bottom: 20px;
}
.carousel-body {
  min-height: 160px;
}
.modal-image {
  width: 100%; max-height: 240px; object-fit: cover; border-radius: 12px; margin-bottom: 20px;
}
.modal-title {
  font-size: 22px; font-weight: 500; margin-bottom: 12px;
}
.modal-content {
  font-size: 14px; line-height: 1.7; opacity: 0.7; white-space: pre-wrap;
}
.carousel-footer {
  display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 28px;
}
.carousel-arrow {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--glass-border); background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text); transition: opacity 0.3s;
}
.carousel-arrow:disabled { opacity: 0.2; cursor: not-allowed; }
.carousel-arrow svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2; fill: none; }

.btn-primary {
  padding: 10px 28px; border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-border);
  color: var(--text); cursor: pointer; font-size: 14px;
  transition: background 0.3s;
}
.btn-primary:hover { background: rgba(255,255,255,0.15); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-active .modal-card, .modal-fade-leave-active .modal-card { transition: transform 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-card { transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to .modal-card { transform: scale(0.95) translateY(10px); }
</style>
