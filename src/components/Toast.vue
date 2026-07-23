<template>
  <div class="toast-container" v-if="toasts.length">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="'toast-' + t.type"
        @click="removeToast(t.id)"
      >
        <span class="toast-bar"></span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { toasts, removeToast } from "../stores/toast.js";
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: stretch;
  min-width: 260px;
  max-width: 400px;
  border-radius: 14px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 24px var(--shadow);
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
}

.toast-bar {
  width: 4px;
  flex-shrink: 0;
}

.toast-error .toast-bar { background: #C44; }
.toast-warning .toast-bar { background: #D90; }
.toast-info .toast-bar { background: #48B; }

.toast-msg {
  padding: 14px 18px;
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.5px;
}

.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(120%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(120%);
}
</style>
