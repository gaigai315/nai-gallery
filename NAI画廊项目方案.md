# NAI Gallery — The Glasshouse (Project Plan)

## 架构

```
用户浏览器 (Vue 3 SPA)
    ↕ HTTPS
Cloudflare Pages (静态资源 + Functions API)
    ↕
D1 Database (元数据/用户/日志)
R2 Bucket (原始图片/TXT/预览图, 仅私有)
```

---

## 当前状态

### 后端 (Functions) — 全部完成 ✅

17 个 API 端点全部实现：auth (discord + callback)、me、my-unlocks (LEFT JOIN + cover_url)、verify、gallery/:id (含 groups 列表)、download (限频)、favorite、logout、preview/:id、admin/batches (含 activity 子路由)、admin/stats、admin/uploads/sign、admin/uploads/complete、admin/images/:id (DELETE)

### 数据库 (D1) — 全部完成 ✅

8 张表，迁移文件 migrations/0001_initial.sql、migrations/0002_notes_cover.sql

### 前端 (Vue 3) — ✅

**stores:** user.js (含 dev mock 登录, sessionStorage 持久化)、theme.js
**lib:** api.js (ApiError wrapper)、png-metadata.js (NAI PNG tEXt 解析)、upload.js (WebP 缩略图 + R2 直传)
**components:** GlassNav、TarotDeck、WaterfallGrid、PasswordSeal (✅ 已集成密码锁设计)、ImageGrid (按 positive_prompt 分组)、FlipBook (页码指示器)、DetailView (组内左右导航)
**views:** LandingView (Dev Mode 所有环境可用)、GalleryView (时间轴、删除弹窗、卡片备注)、InnerGalleryView (Grid/Flip + 分组导航 + 批次/分组备注 + download/favorite)、AdminView (完整管理后台: 统计+批次+上传+批次设置面板)
**features:** 封面自定义 (cover_image_id)、批次备注 (卡片+内页展示)、分组备注 (上传面板+内页展示)、管理员免密进入批次
**dev:** public/_routes.json、vite.config.js devApiPlugin (2 批次 6 图 3 组 mock 数据、完整 admin mock)

---

## 待完成

### Phase 3: NAI 元数据解析 ✅
- [x] src/lib/png-metadata.js — 浏览器端解析 PNG tEXt chunks (prompt, seed, steps, cfg_scale, sampler 等)
- [x] 解析失败降级为文件名导入

### Phase 4: Admin 上传面板 ✅
- [x] AdminView 单页三态流转 (list → create → upload)
- [x] 批次管理 CRUD (创建/启用停用/删除)
- [x] 批量上传 PNG/TXT
- [x] 自动 metadata 解析 + prompt 分组预览
- [x] 手动分组编辑 (移动/新建/重命名/合并/删除)
- [x] 浏览器端 WebP 缩略图生成 (createImageBitmap + canvas)
- [x] R2 直传 + manifest 提交
- [x] 统计仪表盘 (总用户/总解锁/总下载)
- [x] 管理员免密进入批次
- [x] 主页删除弹窗 (封面 + 图片数 + 分组数)

### Phase 6: Cloudflare 部署 ✅
- [x] _routes.json 修正 (API 走 Functions、静态资产走 Pages)
- [x] wrangler.toml 配置收尾
- [x] .env.example 变量注释补全
- [x] r2-cors.json CORS 配置
- [x] 部署手册.md (分步清单 + 管理员初始化 + 本地验证)

## 待优化

按优先级排序，逐项实施。

### 1. 密码验证性能优化 ✅
已实施。PasswordSeal 传 batch_id，verify.js 精确单行查询。

### 2. 后端限流 ✅
已实施。新增 functions/_lib/rate-limit.js 内存滑动窗口，verify/download/favorite 三个端点均加限制。

### 3. 内存限流器过期清理 ✅
### 3. 内存限流器过期清理
✅ 已实施。checkLimit 内置惰性全量清理，每 5 分钟扫描删除空 key。


### 4. 前端错误处理 ✅
已实施。apiFetch 自动 toast 报错（支持 silent 选项），新增 Toast.vue 组件 + toast store。


### 5. 图片级别管理

**现状**：AdminView 只能管批次（创建/启用停用/删除/上传），不能单独查看某张图、删除单图、移动图片到其他分组。后端 `DELETE /api/admin/images/[image_id]` 已实现但前端无对应 UI。另：上传时只能保留原图 PNG，无法选择压缩为 JPEG；上传后也无法对已有图片做压缩归档。

**方案**：三项功能合并在 AdminView 图片管理子视图中：

**5a. 图片浏览与管理**
- 左侧按批次+分组树形导航（筛选器）
- 右侧缩略图网格（含 prompt_preview / seed / 宽高 / 上传时间）
- 每图操作：删除（确认弹窗）、移动到其他分组（下拉选择）、压缩归档
- 批量操作：多选 → 批量删除 / 批量压缩归档 / 批量移动分组

**5b. 上传时格式选择**
- AdminView 上传面板加「保存格式」开关：保留原图 PNG（默认）/ 压缩为 JPEG（quality 90）
- 选 JPEG 时客户端在解析 metadata 后 canvas.toBlob('image/jpeg', 0.90) 再上传
- sign 接口已支持 content_type，前端决定传 image/png 还是 image/jpeg

**5c. 压缩归档（上传后）**
- 图片管理视图中对已上传 PNG 执行压缩：R2 预签名下载 → canvas 转 JPEG → 重新上传 R2 → 更新 image 行 r2_key
- 支持单图、批量选中、整批次一键压缩
- 复用 upload.js 的 canvas 转换逻辑

**涉及文件**：
- `src/views/AdminView.vue` — 新增图片管理子视图 + 格式开关 + 压缩操作
- `functions/api/admin/batches/[batch_id]/images` — 新增 GET（按批次列出图片含分组信息）
- `functions/api/admin/groups` — 新增 GET（列出所有分组供移动下拉框）
- `functions/api/admin/images/[image_id]` — PATCH 新增（更新图片分组/压缩后 r2_key）
- `src/lib/upload.js` — 导出 compressImage 函数供复用

### 4. 画廊分页

**现状**：GET `/api/gallery/[batch_id]` 全量返回该批次所有图片及分组。图片数超过 100 时页面加载变慢、前端渲染吃力。

**方案**：
- 后端支持 `?limit=N&offset=M`（默认 50/offset 0）
- 前端 InnerGalleryView 改无限滚动：滚动到底部自动加载下一批
- FlipBook 模式不分页（翻页书必须持有全部图片），但首次加载可渐进渲染

**涉及文件**：
- `functions/api/gallery/[batch_id].js` — 读 query params 做 LIMIT/OFFSET
- `src/views/InnerGalleryView.vue` — IntersectionObserver 无限滚动
- `src/lib/api.js` — fetchGallery 传 params


## 管理员初始化

站长先 Discord 登录一次，然后在 D1 手动执行：

`sql
UPDATE users SET role = 'admin' WHERE discord_id = '你的DiscordID';
`
