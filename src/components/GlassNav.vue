<template>
  <nav class="glass-nav">
    <div class="nav-avatar" :style="{ backgroundImage: `url(${avatarUrl})` }"></div>
    <div class="nav-info">
      <div class="nav-name">{{ user?.username || "Guest" }}</div>
      <div class="nav-sub">The Glasshouse</div>
    </div>
    <div class="nav-actions">
      <button class="icon-btn" title="Toggle theme" @click="toggleTheme">
        <svg viewBox="0 0 24 24">
          <path v-if="theme === 'light'" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          <path v-else d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
      <router-link v-if="isAdmin" to="/admin" class="icon-btn" title="Admin panel">
        <svg viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
      </router-link>
      <button class="icon-btn" title="Sign out" @click="handleLogout">
        <svg viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useUser } from "../stores/user.js";
import { useTheme } from "../stores/theme.js";

const { user, isAdmin, avatarUrl, logout } = useUser();
const { theme, toggle: toggleTheme } = useTheme();

async function handleLogout() {
  await logout();
  window.location.href = "/";
}
</script>

<style scoped>
.glass-nav {
  position: fixed;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  z-index: 150;
  display: flex;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-color: var(--secondary);
  flex-shrink: 0;
}

.nav-info {
  overflow: hidden;
  white-space: nowrap;
  transition: all 0.35s ease;
}

.nav-name {
  font-weight: bold;
  font-size: 14px;
}

.nav-sub {
  font-size: 12px;
  opacity: 0.6;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  color: var(--text);
  text-decoration: none;
}

.icon-btn:hover {
  background: var(--glass-border);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}

.nav-actions {
  display: flex;
  gap: 12px;
  overflow: hidden;
  transition: all 0.35s ease;
}

/* ========= Desktop: always horizontal, compact default ========= */
@media (min-width: 769px) {
  .glass-nav {
    top: 40px;
    left: 40px;
    flex-direction: row;
    padding: 12px;
    border-radius: 40px;
    box-shadow: 0 8px 32px var(--shadow);
    gap: 0;
  }

  /* Default: only avatar visible, info & actions collapsed */
  .nav-info {
    width: 0;
    margin-left: 0;
    opacity: 0;
  }

  .nav-actions {
    width: 0;
    opacity: 0;
  }

  /* Hover: expand everything horizontally */
  .glass-nav:hover {
    padding: 12px 24px;
    gap: 16px;
  }

  .glass-nav:hover .nav-info {
    width: 120px;
    margin-left: 0;
    opacity: 1;
  }

  .glass-nav:hover .nav-actions {
    width: auto;
    opacity: 1;
  }
}

/* ========= Mobile: always horizontal, always visible ========= */
@media (max-width: 768px) {
  .glass-nav {
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    padding: 8px 16px;
    border-radius: 40px;
    box-shadow: 0 8px 24px var(--shadow);
    width: 90%;
    justify-content: space-between;
    gap: 12px;
  }

  .nav-info {
    flex: 1;
    min-width: 0;
    opacity: 1;
  }

  .nav-actions {
    width: auto;
    opacity: 1;
  }
}
</style>
