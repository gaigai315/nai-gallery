<template>
  <div class="draw-page">
    <button class="back-btn" @click="goBack">← 返回</button>

    <h1 class="title">灵感抽卡</h1>
    <p class="subtitle">— 点击魔法阵 · 抽取一张作品 —</p>

    <section class="reading-area">
      <div class="reading-rings"></div>
      <div class="card-scene">
        <div v-if="!drawnImage" class="reading-placeholder">✦</div>
        <div v-else class="tarot-card draw-card" :class="{ flipped: cardFlipped }" ref="tarotCardRef" @click="resetAll">
          <div class="card-face card-back"></div>
          <div class="card-face card-front">
            <div class="front-image">
              <img v-if="drawnImage.preview_url" :src="drawnImage.preview_url" alt="drawn artwork" />
              <div v-else class="front-image-placeholder">✦</div>
            </div>
            <div class="front-info">
              <div class="front-prompt">{{ drawnImage.prompt_preview }}</div>
              <div class="front-params">seed: {{ drawnImage.seed }} · steps: {{ drawnImage.steps }} · CFG: {{ drawnImage.cfg_scale }} · {{ drawnImage.sampler }}</div>
              <div class="front-actions">
                <button class="action-btn" @click.stop="viewDetail">查看详情</button>
                <button v-if="drawnImage.image_url" class="action-btn outline" @click.stop="downloadOriginal">下载原图</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="deck-area" :class="{ shuffling: isShuffling }">
      <div class="deck">
        <div class="deck-inner" ref="deckInnerRef">
          <button v-for="(c, idx) in displayCards" :key="c.key" class="deck-card" :class="c.animClass" :style="cardStyle(c)" :aria-label="'Select card ' + (idx + 1)" :disabled="isAnimating || (drawnImage && cardFlipped)" @click="pickCard"></button>
        </div>
      </div>
      <p class="message">{{ statusMessage }}</p>
      <div class="draw-btn-wrap">
        <button class="magic-draw-btn" :disabled="isAnimating && !drawnImage" @click="triggerDraw" aria-label="魔法阵抽牌">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle class="magic-ring-1" cx="90" cy="90" r="74"/>
            <circle class="magic-ring-1" cx="90" cy="90" r="60"/>
            <circle class="magic-ring-2" cx="90" cy="90" r="52"/>
            <path d="M90 20 L106 74 L160 90 L106 106 L90 160 L74 106 L20 90 L74 74 Z"/>
            <path d="M90 42 L95 85 L138 90 L95 95 L90 138 L85 95 L42 90 L85 85 Z"/>
            <path d="M62 62 Q90 38 118 62 Q142 90 118 118 Q90 142 62 118 Q38 90 62 62Z"/>
            <text x="90" y="96" text-anchor="middle">✦</text>
          </svg>
        </button>
      </div>
    </section>

    <div ref="particlesRef" class="particles"></div>
    <div ref="flashRef" class="flash-overlay"></div>
</div>
</template>


<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../lib/api.js';

const router = useRouter();
const deckInnerRef = ref(null);
const tarotCardRef = ref(null);
const particlesRef = ref(null);
const flashRef = ref(null);

const drawnImage = ref(null);
const cardFlipped = ref(false);
const isAnimating = ref(false);
const isShuffling = ref(false);
const statusMessage = ref('\u4ece\u4e0b\u65b9\u724c\u7ec4\u4e2d\u9009\u62e9\u4e00\u5f20\uff0c\u6216\u70b9\u51fb\u9b54\u6cd5\u9635\u62bd\u724c');
const displayCards = ref([]);
const keyCounter = ref(0);

function getCardCount() {
  const w = window.innerWidth;
  if (w < 380) return 7;
  if (w < 600) return 9;
  if (w < 900) return 13;
  return 22;
}

function getFanAngle(count) {
  if (count <= 7) return 70;
  if (count <= 9) return 85;
  if (count <= 13) return 100;
  return 110;
}

function buildCardList(animClass) {
  const count = getCardCount();
  const fanDeg = getFanAngle(count);
  const fanRad = (fanDeg * Math.PI) / 180;
  const mid = (count - 1) / 2;
  const cards = [];
  for (let i = 0; i < count; i++) {
    const t = (i - mid) / mid;
    const angle = t * fanRad / 2;
    const rotDeg = angle * 180 / Math.PI;
    const arcY = -Math.abs(t) * 6 - (1 - Math.abs(t)) * 3;
    const scale = 1 - Math.abs(t) * 0.03;
    const zi = 10 + Math.round(Math.abs(t) * 50);
    cards.push({ key: keyCounter.value + '_' + i, rotDeg, arcY, scale, zi, animClass: animClass || '' });
  }
  keyCounter.value++;
  return cards;
}

function cardStyle(c) {
  const transform = 'rotate(' + c.rotDeg.toFixed(1) + 'deg) translateY(' + c.arcY.toFixed(1) + 'px) scale(' + c.scale.toFixed(2) + ')';
  return { transform, '--base-transform': transform, '--zi': c.zi };
}

function tone(freq, dur, type, vol, delay) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime + (delay || 0);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol || 0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    setTimeout(function() { ctx.close(); }, (delay || 0) * 1000 + dur * 1000 + 200);
  } catch (e) { /* ignore */ }
}

function playShuffleSound() {
  for (let i = 0; i < 8; i++) tone(140 + Math.random() * 180, 0.09, 'triangle', 0.03, i * 0.07);
}

function playFlipSound() {
  tone(400, 0.38, 'sine', 0.14, 0);
  tone(820, 0.32, 'sine', 0.05, 0.05);
  tone(1260, 0.38, 'triangle', 0.04, 0.1);
}

function burst(count) {
  count = count || 60;
  const container = particlesRef.value;
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.cssText = 'position:absolute;border-radius:50%;background:#f5d88e;box-shadow:0 0 8px 2px #d8a9ff;animation:floatUp linear forwards;left:' + (Math.random() * 100) + 'vw;top:' + (50 + Math.random() * 55) + 'vh;--dx:' + ((Math.random() * 180 - 90)) + 'px;animation-duration:' + (2 + Math.random() * 3.5) + 's;animation-delay:' + (Math.random() * 0.5) + 's;width:' + (1.5 + Math.random() * 2.5) + 'px;height:' + (1.5 + Math.random() * 2.5) + 'px';
    container.appendChild(p);
    setTimeout(function() { p.remove(); }, 6500);
  }
}

function flashBurst() {
  const el = flashRef.value;
  if (!el) return;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
}

async function fetchDraw() {
  try { return await apiFetch('/api/draw', { silent: true }); }
  catch (e) { return null; }
}

async function pickCard() {
  if (isAnimating.value) return;
  if (drawnImage.value && cardFlipped.value) return;
  isAnimating.value = true;
  statusMessage.value = '\u6b63\u5728\u62bd\u53d6\u2026\u2026';
  burst(40);
  const data = await fetchDraw();
  setTimeout(function() {
    if (!data) {
      statusMessage.value = '\u6682\u65e0\u5df2\u89e3\u9501\u7684\u4f5c\u54c1\uff0c\u8bf7\u5148\u89e3\u9501\u753b\u5eca';
      isAnimating.value = false;
      return;
    }
    drawnImage.value = data;
    playFlipSound();
    flashBurst();
    burst(80);
    cardFlipped.value = true;
    statusMessage.value = data.prompt_preview || '\u62bd\u53d6\u6210\u529f\uff01';
    isAnimating.value = false;
  }, 900);
}

async function triggerDraw() {
  if (drawnImage.value) { resetAll(); return; }
  if (isAnimating.value) return;
  isAnimating.value = true;
  isShuffling.value = true;
  statusMessage.value = '\u6d17\u724c\u4e2d\u2026\u2026';
  playShuffleSound();
  burst(25);
  const gathered = displayCards.value.map(function(c) { return { ...c, rotDeg: 0, arcY: 0, scale: 1, animClass: 'gathering' }; });
  displayCards.value = gathered;
  setTimeout(function() {
    isShuffling.value = false;
    const count = getCardCount();
    const fanDeg = getFanAngle(count);
    const fanRad = (fanDeg * Math.PI) / 180;
    const mid = (count - 1) / 2;
    const spread = [];
    for (let i = 0; i < count; i++) {
      const t = (i - mid) / mid;
      const angle = t * fanRad / 2;
      spread.push({
        key: keyCounter.value + '_s_' + i,
        rotDeg: angle * 180 / Math.PI,
        arcY: -Math.abs(t) * 6 - (1 - Math.abs(t)) * 3,
        scale: 1 - Math.abs(t) * 0.03,
        zi: 10 + Math.round(Math.abs(t) * 50),
        animClass: 'spreading',
      });
    }
    keyCounter.value++;
    displayCards.value = spread;
    statusMessage.value = '\u6b63\u5728\u62bd\u53d6\u2026\u2026';
  }, 600);
  setTimeout(function() {
    displayCards.value = displayCards.value.map(function(c) { return { ...c, animClass: '' }; });
    isAnimating.value = false;
    pickCard();
  }, 1400);
}

function resetAll() {
  drawnImage.value = null;
  cardFlipped.value = false;
  isAnimating.value = false;
  isShuffling.value = false;
  statusMessage.value = '\u4ece\u4e0b\u65b9\u724c\u7ec4\u4e2d\u9009\u62e9\u4e00\u5f20\uff0c\u6216\u70b9\u51fb\u9b54\u6cd5\u9635\u62bd\u724c';
  displayCards.value = buildCardList();
}

function viewDetail() {
  if (!drawnImage.value) return;
  router.push('/gallery/' + drawnImage.value.batch_id + '?image=' + drawnImage.value.image_id);
}

function downloadOriginal() {
  if (drawnImage.value && drawnImage.value.image_url) window.open(drawnImage.value.image_url, '_blank');
}

function goBack() { router.push('/other'); }

let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    if (!drawnImage.value && !isAnimating.value) displayCards.value = buildCardList();
  }, 300);
}

onMounted(function() {
  displayCards.value = buildCardList();
  window.addEventListener('resize', onResize);
});

onUnmounted(function() {
  window.removeEventListener('resize', onResize);
  clearTimeout(resizeTimer);
});
</script>


<style scoped>
.back-btn {
  align-self: flex-start;
  margin: 10px 0 0 0;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid rgba(214, 174, 97, 0.35);
  border-radius: 6px;
  color: #a89878;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover {
  border-color: rgba(214, 174, 97, 0.7);
  color: #e0c98a;
}

.draw-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px 24px;
  color: #f3d99b;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

.title {
  font-size: clamp(26px, 4.5vw, 44px);
  letter-spacing: 0.18em;
  font-weight: 500;
  text-shadow: 0 0 24px rgba(217, 169, 85, 0.3);
  margin-bottom: 2px;
  margin-top: 6px;
}
.subtitle {
  font-size: clamp(12px, 1.8vw, 16px);
  letter-spacing: 0.25em;
  color: #c9a970;
  margin-bottom: 10px;
}

/* --- reading area --- */
.reading-area {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2px 0 0;
  z-index: 5;
}
.reading-rings {
  position: absolute;
  width: min(55vw, 420px);
  height: min(55vw, 420px);
  border: 1px solid rgba(190, 145, 73, 0.08);
  border-radius: 50%;
  box-shadow: 0 0 0 24px rgba(174, 128, 67, 0.03), 0 0 0 58px rgba(174, 128, 67, 0.018);
  background: repeating-conic-gradient(
    from 0deg,
    rgba(213, 169, 91, 0.06) 0 1deg,
    transparent 1deg 24deg
  );
  animation: orbit 28s linear infinite;
}
@keyframes orbit {
  to { transform: rotate(360deg); }
}

.card-scene {
  width: clamp(200px, 32vw, 280px);
  aspect-ratio: 0.72;
  perspective: 1200px;
  z-index: 2;
  margin-bottom: 0;
}

.reading-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  border: 1px dashed rgba(214, 174, 97, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 170, 110, 0.3);
  font-size: clamp(28px, 4vw, 40px);
}

.tarot-card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.22, 0.8, 0.22, 1);
  border-radius: 16px;
  cursor: pointer;
}
.draw-card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 16px;
  border: 1px solid rgba(214, 174, 97, 0.7);
  box-shadow: 0 0 0 1px rgba(48, 29, 69, 0.85), 0 0 0 2px rgba(155, 113, 52, 0.7), 0 0 24px rgba(160, 93, 224, 0.4);
  overflow: hidden;
}

.card-back {
  background-image: url('https://img.baibai.cv/f/7QGpTA/1784822793129.png');
  background-size: cover;
  background-position: center;
}
.card-back::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, transparent 50%, rgba(0, 0, 0, 0.15) 100%);
  border-radius: 16px;
}

.card-front {
  transform: rotateY(180deg);
  padding: 0;
  background: #1a1525;
  display: flex;
  flex-direction: column;
}
.front-image {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0e0c18;
  min-height: 0;
}
.front-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.front-image-placeholder {
  color: rgba(200, 170, 110, 0.3);
  font-size: 40px;
}
.front-info {
  padding: 8px 10px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9));
}
.front-prompt {
  font-size: clamp(10px, 1.2vw, 12px);
  color: #e8d5b0;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 4px;
}
.front-params {
  font-size: clamp(9px, 1vw, 10px);
  color: #8a7b6a;
  letter-spacing: 0.03em;
  margin-bottom: 8px;
}
.front-actions {
  display: flex;
  gap: 6px;
}
.action-btn {
  flex: 1;
  padding: 5px 0;
  border: 1px solid rgba(214, 174, 97, 0.7);
  border-radius: 6px;
  background: rgba(180, 145, 80, 0.15);
  color: #e0c98a;
  font-size: clamp(10px, 1vw, 11px);
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
  font-family: inherit;
}
.action-btn:hover {
  background: rgba(180, 145, 80, 0.3);
}
.action-btn.outline {
  background: transparent;
  border-color: rgba(214, 174, 97, 0.35);
  color: #a89878;
}
.action-btn.outline:hover {
  border-color: rgba(214, 174, 97, 0.7);
  color: #e0c98a;
}

/* --- deck area --- */
.deck-area {
  width: 100%;
  max-width: 800px;
  position: relative;
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.deck {
  position: relative;
  width: 100%;
  height: clamp(110px, 20vw, 220px);
  margin-bottom: 2px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.deck-inner {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: min(90%, 640px);
  height: 100%;
}

.deck-card {
  position: absolute;
  bottom: 0;
  width: clamp(52px, 9vw, 70px);
  aspect-ratio: 0.618;
  border-radius: 7px;
  border: 1px solid rgba(209, 165, 85, 0.65);
  background-color: #0e0c1a;
  cursor: pointer;
  transform-origin: 50% 100%;
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1), filter 0.3s, box-shadow 0.35s;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: var(--zi);
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.deck-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('https://img.baibai.cv/f/7QGpTA/1784822793129.png');
  background-size: cover;
  background-position: center;
}
.deck-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 60%, rgba(0, 0, 0, 0.2));
  border-radius: 7px;
}

.deck-card:hover:not(:disabled) {
  filter: brightness(1.35);
  box-shadow: 0 0 22px rgba(180, 100, 240, 0.7);
  z-index: 300 !important;
}
.deck-card:active:not(:disabled) {
  filter: brightness(1.5);
}

.deck-card:hover:not(:disabled):not(.gathering):not(.spreading):not(.chosen) {
  transform: var(--base-transform) translateY(-12px) !important;
}

.deck-card:disabled {
  pointer-events: none;
  opacity: 0.7;
}

/* animations */
.deck-card.gathering {
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}
.deck-area.shuffling .deck-card {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.deck-card.spreading {
  transition: transform 0.6s cubic-bezier(0.1, 0.8, 0.3, 1);
}

/* --- message --- */
.message {
  min-height: 22px;
  margin-top: 2px;
  font-size: clamp(13px, 1.6vw, 15px);
  color: #c7a36d;
  text-align: center;
  letter-spacing: 0.06em;
}

/* --- draw button --- */
.draw-btn-wrap {
  position: relative;
  margin-top: 0;
}
.magic-draw-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(80px, 12vw, 100px);
  height: clamp(80px, 12vw, 100px);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  filter: drop-shadow(0 0 12px rgba(207, 145, 255, 0.35));
  transition: transform 0.35s, filter 0.35s;
}
.magic-draw-btn svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: #d8ad65;
  stroke-width: 1;
  overflow: visible;
}
.magic-draw-btn svg :deep(.magic-ring-1) {
  animation: magicSpin 20s linear infinite;
  transform-origin: 90px 90px;
}
.magic-draw-btn svg :deep(.magic-ring-2) {
  animation: magicSpin 14s linear infinite reverse;
  transform-origin: 90px 90px;
}
.magic-draw-btn svg :deep(text) {
  fill: #f0d18c;
  stroke: none;
  font-size: 18px;
  filter: drop-shadow(0 0 6px rgba(225, 180, 255, 0.85));
}
.magic-draw-btn:hover {
  transform: scale(1.08);
  filter: drop-shadow(0 0 20px rgba(213, 137, 255, 0.8));
}
.magic-draw-btn:active {
  transform: scale(0.92);
}
.magic-draw-btn:disabled {
  opacity: 0.35;
  pointer-events: none;
  filter: none;
}
@keyframes magicSpin {
  to { transform: rotate(360deg); }
}

/* --- particles --- */
.particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 30;
  overflow: hidden;
}

.flash-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  opacity: 0;
  background: radial-gradient(circle at 50% 38%, rgba(224, 182, 255, 0.38), transparent 32%);
}
.flash-overlay.active {
  animation: flashBurst 0.85s ease-out;
}
@keyframes flashBurst {
  0% { opacity: 0; }
  20% { opacity: 1; }
  100% { opacity: 0; }
}

/* responsive */
@media (max-width: 480px) {
  .draw-page {
    padding: 0 10px 24px;
  }
  .reading-rings {
    width: min(48vw, 180px);
    height: min(48vw, 180px);
  }
  .reading-area {
    margin: 0;
  }
  .title {
    margin-top: 8px;
  }
  .card-scene {
    width: clamp(160px, 42vw, 220px);
  }
  .deck-area {
    margin-top: 2px;
  }
}
</style>
