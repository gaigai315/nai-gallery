<template>
  <div class="view-container active">
    <div class="admin-shell">
      <router-link to="/admin" class="icon-btn back-btn" aria-label="??">
        <svg viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </router-link>

      <div class="admin-header">
        <h1>黑名单管理</h1>
        <p>已拉黑用户列表</p>
      </div>

      <section class="admin-card">
        <div class="list-toolbar">
          <h2>已拉黑用户</h2>
          <button class="btn-outline" @click="fetchBanned" :disabled="loading">刷新</button>
        </div>

        <div v-if="loading" class="admin-placeholder">加载中...</div>
        <p v-else-if="error" class="status-error">{{ error }}</p>
        <div v-else-if="!list.length" class="empty-state"><p>暂无拉黑用户</p></div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>角色</th>
              <th>拉黑时间</th>
              <th>操作人</th>
              <th>原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in list" :key="b.discord_id">
              <td>
                <strong>{{ b.username || b.discord_id }}</strong>
                <br /><small>{{ b.discord_id }}</small>
              </td>
              <td>
                <span v-if="b.role" :class="['role-badge', b.role]">{{ b.role === 'admin' ? '管理员' : '用户' }}</span>
                <span v-else class="role-badge banned">未登录</span>
              </td>
              <td>{{ formatDate(b.banned_at) }}</td>
              <td><small>{{ b.banned_by }}</small></td>
              <td><small>{{ b.reason || '-' }}</small></td>
              <td>
                <button class="btn-outline small" @click="unbanU(b.discord_id, b.username || b.discord_id)">解封</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../lib/api.js'

const list = ref([])
const loading = ref(false)
const error = ref('')

async function fetchBanned() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/admin/banned')
    list.value = data.banned || []
  } catch (e) {
    list.value = []
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function unbanU(discordId, username) {
  if (!confirm('确定要解封 ' + username + ' 吗？')) return
  try {
    await apiFetch('/api/admin/users/ban?discord_id=' + encodeURIComponent(discordId), { method: 'DELETE' })
    list.value = list.value.filter(b => b.discord_id !== discordId)
  } catch (e) { }
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(fetchBanned)
</script>

<style scoped>
.admin-shell { max-width: 960px; margin: 0 auto; padding: 24px 16px 80px; }
.back-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text); cursor: pointer; margin-bottom: 16px; }
.back-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.admin-header { margin-bottom: 24px; }
.admin-header h1 { font-size: 24px; font-weight: 600; margin: 0 0 4px; }
.admin-header p { margin: 0; opacity: 0.5; font-size: 13px; }
.admin-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.list-toolbar h2 { font-size: 16px; font-weight: 600; margin: 0; }
.admin-placeholder { text-align: center; padding: 32px; opacity: 0.5; }
.status-error { color: #e74c3c; font-size: 13px; }
.empty-state { text-align: center; padding: 32px; opacity: 0.4; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--glass-border); opacity: 0.6; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--glass-border); vertical-align: middle; }
.data-table tr:hover td { background: rgba(255,255,255,0.03); }
.data-table small { font-size: 11px; opacity: 0.5; }
.role-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.role-badge.admin { background: rgba(192,57,43,0.2); color: #e74c3c; }
.role-badge.user { background: rgba(255,255,255,0.08); color: var(--text); opacity: 0.7; }
.role-badge.banned { background: rgba(231,76,60,0.2); color: #e74c3c; }
.btn-outline { padding: 6px 14px; border-radius: 10px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text); cursor: pointer; font-family: inherit; font-size: 13px; }
.btn-outline:hover { background: rgba(255,255,255,0.08); }
.btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-outline.small { padding: 4px 12px; font-size: 12px; border-radius: 12px; }
</style>
