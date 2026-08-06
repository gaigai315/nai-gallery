<template>
  <main class="landing-shell">
    <div v-if="showPledge" class="landing-hero">
      <h1 class="landing-title">The Glasshouse</h1>
      <p class="landing-subtitle">请逐字输入以下誓词以继续</p>
      <div class="pledge-box">
        <p class="pledge-text">{{ pledgeText }}</p>
      </div>
      <input
        v-model="pledgeInput"
        type="text"
        class="pledge-input"
        placeholder="请在此逐字输入誓词..."
        autocomplete="off"
        @input="pledgeError = ''"
      />
      <p v-if="pledgeError" class="pledge-error">{{ pledgeError }}</p>
      <div class="landing-btns">
        <a
          class="landing-btn"
          :class="{ disabled: pledgeInput !== pledgeText }"
          :href="pledgeInput === pledgeText ? '/api/auth/discord' : undefined"
          @click.prevent="tryLogin"
        >
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.028C.532 10.093-.246 13.674.076 17.194c0 .004.003.008.006.011a19.9 19.9 0 006.012 3.042c.03.009.061-.005.076-.031a13.84 13.84 0 001.037-1.686.075.075 0 00-.04-.106 13.158 13.158 0 01-1.581-.753.075.075 0 01-.013-.122c.107-.08.213-.163.315-.248a.073.073 0 01.076-.005c3.37 1.539 7.025 1.539 10.348 0a.073.073 0 01.078.005c.102.085.208.168.315.249a.075.075 0 01-.012.121c-.5.295-1.025.545-1.581.753a.075.075 0 00-.04.107c.33.586.69 1.148 1.037 1.686a.075.075 0 00.075.03 19.88 19.88 0 006.023-3.042.075.075 0 00.006-.01c.382-4.087-.64-7.64-2.67-12.796a.063.063 0 00-.032-.03zM8.02 15.332c-1.185 0-2.158-1.088-2.158-2.419 0-1.33.956-2.419 2.158-2.419 1.21 0 2.175 1.096 2.158 2.42 0 1.33-.956 2.418-2.158 2.418zm7.96 0c-1.185 0-2.158-1.088-2.158-2.419 0-1.33.956-2.419 2.158-2.419 1.21 0 2.175 1.096 2.158 2.42 0 1.33-.947 2.418-2.158 2.418z" fill="currentColor"/></svg>
          以 Discord 登录
        </a>
        <button v-if="isDev" class="landing-btn dev-btn" @click="devLogin">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" fill="currentColor"/></svg>
          Dev Mode (Preview)
        </button>
      </div>
    </div>

    <div v-else class="landing-hero">
      <h1 class="landing-title">The Glasshouse</h1>
      <p class="landing-subtitle">Art &amp; Prompts Gallery</p>
      <p class="landing-desc">A private sanctuary for generated art. Sign in to explore.</p>
      <div class="landing-btns">
        <a class="landing-btn" href="/api/auth/discord">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.028C.532 10.093-.246 13.674.076 17.194c0 .004.003.008.006.011a19.9 19.9 0 006.012 3.042c.03.009.061-.005.076-.031a13.84 13.84 0 001.037-1.686.075.075 0 00-.04-.106 13.158 13.158 0 01-1.581-.753.075.075 0 01-.013-.122c.107-.08.213-.163.315-.248a.073.073 0 01.076-.005c3.37 1.539 7.025 1.539 10.348 0a.073.073 0 01.078.005c.102.085.208.168.315.249a.075.075 0 01-.012.121c-.5.295-1.025.545-1.581.753a.075.075 0 00-.04.107c.33.586.69 1.148 1.037 1.686a.075.075 0 00.075.03 19.88 19.88 0 006.023-3.042.075.075 0 00.006-.01c.382-4.087-.64-7.64-2.67-12.796a.063.063 0 00-.032-.03zM8.02 15.332c-1.185 0-2.158-1.088-2.158-2.419 0-1.33.956-2.419 2.158-2.419 1.21 0 2.175 1.096 2.158 2.42 0 1.33-.956 2.418-2.158 2.418zm7.96 0c-1.185 0-2.158-1.088-2.158-2.419 0-1.33.956-2.419 2.158-2.419 1.21 0 2.175 1.096 2.158 2.42 0 1.33-.947 2.418-2.158 2.418z" fill="currentColor"/></svg>
          Sign in with Discord
        </a>
        <button v-if="isDev" class="landing-btn dev-btn" @click="devLogin">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" fill="currentColor"/></svg>
          Dev Mode (Preview)
        </button>
      </div>
    </div>
    <div class="landing-bg"></div>
  </main>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUser } from "../stores/user.js";

const router = useRouter();
const route = useRoute();
const { mockLogin } = useUser();
const isDev = import.meta.env.DEV;

const showPledge = ref(false);
const pledgeText = ref("");
const pledgeInput = ref("");
const pledgeError = ref("");
const authError = ref("");

function devLogin() {
  mockLogin("admin");
  router.push("/gallery");
}

function tryLogin(e) {
  if (pledgeInput.value !== pledgeText.value) {
    e.preventDefault();
    pledgeError.value = "输入内容与誓词不完全一致，请逐字核对";
    return;
  }
  const hash = String(pledgeText.value.length) + "_v1";
  localStorage.setItem("pledge_passed", "true");
  localStorage.setItem("pledge_text_hash", hash);
  window.location.href = "/api/auth/discord";
}

onMounted(async () => {
  // Check auth error from query params
  const authParam = route.query.auth;
  if (authParam === 'not_in_guild') {
    authError.value = '你不在该服务器中，请先加入 Discord 服务器。';
  } else if (authParam === 'role_denied') {
    authError.value = '你没有访问权限，请联系管理员获取对应身份组。';
  } else if (authParam === 'failed') {
    authError.value = '登录失败，请重试。';
  } else if (authParam === 'blacklisted') {
    authError.value = '该 Discord 账号已被拉黑，无法登录。';
  }

  const passed = localStorage.getItem("pledge_passed");
  const savedHash = localStorage.getItem("pledge_text_hash");

  try {
    const res = await fetch("/api/site-config");
    const data = await res.json();
    const text = (data.pledge_text || "").trim();

    if (!text) {
      showPledge.value = false;
      return;
    }

    const currentHash = String(text.length) + "_v1";
    if (passed && savedHash === currentHash) {
      showPledge.value = false;
      return;
    }

    pledgeText.value = text;
    showPledge.value = true;
  } catch {
    showPledge.value = false;
  }
});
</script>

<style scoped>
.landing-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.landing-bg {
  position: absolute;
  top: -30%;
  right: -20%;
  width: 80vw;
  height: 80vw;
  background: radial-gradient(circle, var(--glow) 0%, transparent 70%);
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.landing-hero {
  text-align: center;
  z-index: 1;
  padding: 24px;
  max-width: 520px;
  margin: 0 auto;
}

.landing-title {
  font-size: clamp(48px, 10vw, 96px);
  font-weight: 300;
  letter-spacing: 8px;
  margin-bottom: 12px;
}

.landing-subtitle {
  font-size: 14px;
  letter-spacing: 4px;
  opacity: 0.6;
  margin-bottom: 24px;
}

.landing-desc {
  font-size: 16px;
  opacity: 0.7;
  margin-bottom: 32px;
}

.landing-btns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.landing-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: 40px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  color: var(--text);
}

.landing-btn:hover {
  background: var(--glass-border);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px var(--shadow);
}

.dev-btn {
  opacity: 0.6;
  font-size: 13px;
  border-style: dashed;
}

.dev-btn:hover {
  opacity: 1;
}

.landing-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.pledge-box {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  text-align: left;
}

.pledge-text {
  font-size: 16px;
  line-height: 1.8;
  opacity: 0.8;
  white-space: pre-wrap;
  letter-spacing: 1px;
}

.pledge-input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  font-size: 14px;
  outline: none;
  margin-bottom: 8px;
}
.pledge-input::placeholder { opacity: 0.35; }

.pledge-error {
  font-size: 12px;
  color: #c0392b;
  margin-bottom: 16px;
}
.auth-error {
  font-size: 13px;
  color: #e67e22;
  margin-bottom: 16px;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(230, 126, 34, 0.1);
  border: 1px solid rgba(230, 126, 34, 0.3);
}
</style>
