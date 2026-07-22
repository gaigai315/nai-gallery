<template>
  <div
    class="seal-overlay"
    :class="{ active: visible }"
    @click.self="$emit('close')"
  >
    <div class="seal-panel">
      <div class="seal-icon">
        <svg viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h2 class="seal-title">{{ batchName || "Locked Batch" }}</h2>
      <p class="seal-hint">Enter the batch password to unlock</p>
      <form class="seal-form" @submit.prevent="submitPassword">
        <input
          ref="inputRef"
          v-model="password"
          type="password"
          placeholder="Batch password"
          :disabled="loading"
          autocomplete="off"
        />
        <button type="submit" class="seal-submit" :disabled="!password || loading">
          <span v-if="loading">Unlocking...</span>
          <span v-else>Unlock</span>
        </button>
      </form>
      <p v-if="error" class="seal-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  visible: Boolean,
  batchName: { type: String, default: "" },
  batchId: { type: String, default: "" },
});

const emit = defineEmits(["close", "unlocked"]);

const password = ref("");
const loading = ref(false);
const error = ref("");
const inputRef = ref(null);

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

watch(() => props.visible, (val) => {
  if (val) {
    password.value = "";
    error.value = "";
    nextTick(() => inputRef.value?.focus());
  }
});

async function submitPassword() {
  error.value = "";
  loading.value = true;

  try {
    if (isDev) {
      // Dev mode: accept any password, mock success
      await new Promise((r) => setTimeout(r, 400));
      emit("unlocked", { batch_id: props.batchId, batch_name: props.batchName });
      return;
    }

    const res = await fetch("/api/verify", {
      method: "POST",
 credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.value }),
    });
    const data = await res.json();
    if (!res.ok) {
      error.value = data.error === "invalid_password" ? "Password is invalid or expired." : data.error || "Verification failed";
      return;
    }
    emit("unlocked", data.batch);
  } catch {
    error.value = "Network error. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.seal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s;
}

.seal-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.seal-panel {
  text-align: center;
  padding: 48px 40px;
  border-radius: 32px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 24px 48px var(--shadow);
  max-width: 400px;
  width: 90%;
}

.seal-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: var(--secondary);
  border: 2px solid var(--glow);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px var(--glow);
}

.seal-icon svg {
  width: 28px;
  height: 28px;
  stroke: var(--bg);
  stroke-width: 1.5;
  fill: none;
}

.seal-title {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.seal-hint {
  font-size: 13px;
  opacity: 0.6;
  margin-bottom: 28px;
  letter-spacing: 1px;
}

.seal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.seal-form input {
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  font-size: 15px;
  text-align: center;
  letter-spacing: 2px;
  outline: none;
  transition: border-color 0.3s;
}

.seal-form input:focus {
  border-color: var(--secondary);
}

.seal-submit {
  padding: 14px 24px;
  border-radius: 14px;
  border: none;
  background: var(--secondary);
  color: var(--bg);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 1px;
  transition: opacity 0.3s, transform 0.2s;
}

.seal-submit:hover:not(:disabled) {
  opacity: 0.85;
  transform: translateY(-1px);
}

.seal-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.seal-error {
  margin-top: 16px;
  font-size: 13px;
  color: #A85A5A;
}
</style>
