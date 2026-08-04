<template>
  <div class="notfound-page">
    <div class="notfound-glass">
      <h1>404</h1>
      <p>页面不存在</p>
      <router-link to="/gallery" class="btn-primary">返回画廊</router-link>
    </div>
  </div>
</template>

<style scoped>
.notfound-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
.notfound-glass {
  text-align: center;
  padding: 60px 80px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(20px);
}
.notfound-glass h1 {
  font-size: 80px;
  font-weight: 200;
  margin: 0 0 8px;
  color: var(--text);
  opacity: 0.6;
}
.notfound-glass p {
  font-size: 16px;
  color: var(--secondary);
  margin-bottom: 32px;
}
.btn-primary {
  display: inline-block;
  padding: 10px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.btn-primary:hover { background: rgba(255,255,255,0.1); }
</style>
