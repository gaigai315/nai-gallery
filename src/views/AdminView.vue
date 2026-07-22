<template>
  <div class="view-container active">
    <div class="admin-shell">
      <div class="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage batches and upload artwork</p>
      </div>

      <div class="admin-card">
        <h2>Create Batch</h2>
        <p class="admin-placeholder">Coming soon: batch creation form with upload interface.</p>
      </div>

      <div class="admin-card">
        <h2>Batch List</h2>
        <p class="admin-placeholder">Coming soon: list all batches with image and group counts.</p>
      </div>

      <div class="admin-card">
        <h2>Upload &amp; Import</h2>
        <p class="admin-placeholder">Coming soon: multi-file upload with NAI metadata parsing, auto-grouping, and manual adjustment.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 24px 60px;
}

.admin-header {
  margin-bottom: 48px;
}

.admin-header h1 {
  font-size: 32px;
  font-weight: 300;
  letter-spacing: 4px;
  margin-bottom: 8px;
}

.admin-header p {
  font-size: 14px;
  opacity: 0.6;
  letter-spacing: 1px;
}

.admin-card {
  margin-bottom: 24px;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
}

.admin-card h2 {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.admin-placeholder {
  font-size: 14px;
  opacity: 0.5;
}
</style>
