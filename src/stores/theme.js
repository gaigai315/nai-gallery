import { ref, watch } from "vue";

function detectInitialTheme() {
  const saved = localStorage.getItem("nai-theme");
  if (saved === "light" || saved === "dark") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

const theme = ref(detectInitialTheme());

watch(theme, (val) => {
  document.documentElement.setAttribute("data-theme", val);
  localStorage.setItem("nai-theme", val);
});

export function useTheme() {
  function toggle() {
    theme.value = theme.value === "light" ? "dark" : "light";
  }
  return { theme, toggle };
}
