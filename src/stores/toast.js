import { reactive } from "vue";

export const toasts = reactive([]);

let seq = 0;

export function addToast(message, type = "error") {
  // Deduplicate: same message + same type within the active toasts
  if (toasts.some((t) => t.message === message && t.type === type)) return;

  const id = ++seq;
  const toast = { id, message, type };
  toasts.push(toast);

  // Auto-dismiss after 5 seconds
  setTimeout(() => removeToast(id), 5000);
}

export function removeToast(id) {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
}
