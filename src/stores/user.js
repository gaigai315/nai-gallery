import { ref, computed } from "vue";

const user = ref(null);
const loading = ref(false);

const DEV_STORAGE_KEY = "nai_dev_user";

export function useUser() {
  const isLoggedIn = computed(() => Boolean(user.value));
  const isAdmin = computed(() => user.value?.role === "admin");
  const avatarUrl = computed(() => {
    if (!user.value?.avatar) return "";
    return `https://cdn.discordapp.com/avatars/${user.value.discord_id}/${user.value.avatar}.png?size=64`;
  });

  async function fetchMe() {
    // Restore mock user from sessionStorage if available
    if (!user.value) {
      const stored = sessionStorage.getItem(DEV_STORAGE_KEY);
      if (stored) {
        try { user.value = JSON.parse(stored); return; } catch { /* ignore */ }
      }
    }

    loading.value = true;
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      user.value = data.user || null;
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  function mockLogin(role = "user") {
    const mockUser = {
      discord_id: "dev_mock_001",
      username: "Dev User",
      avatar: null,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    user.value = mockUser;
    sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(mockUser));
  }

  async function logout() {
    sessionStorage.removeItem(DEV_STORAGE_KEY);
    user.value = null;
    await fetch("/api/logout", { method: "POST", credentials: "include" });
  }

  return { user, loading, isLoggedIn, isAdmin, avatarUrl, fetchMe, mockLogin, logout };
}
