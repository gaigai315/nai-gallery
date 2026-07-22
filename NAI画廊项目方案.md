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

functions/_lib/ — 通用工具库
- db.js — 用户查询、admin 检测、解锁检测、审计日志
- crypto.js — HMAC-SHA256、SHA256、PBKDF2、base64url、constant-time
- password.js — 密码哈希、随机 token、slugify
- r2-sign.js — R2 预签名 URL（GET / PUT）
- request.js — JSON 解析、审计字段
- session.js — HMAC 签名 Session Cookie、requireSession、requireAdmin

API endpoints:
- GET /api/auth/discord — Discord OAuth 跳转
- GET /api/auth/callback — OAuth 回调 -> 签发 Session
- GET /api/me — 当前用户信息
- GET /api/my-unlocks — 已解锁批次列表
- POST /api/verify — 验证密码，写入解锁记录
- GET /api/gallery/:batch_id — 批次内图片列表
- POST /api/download — 限频 -> 日志 -> 返回 R2 预签名 URL
- POST /api/favorite — 收藏/取消
- POST /api/logout — 登出
- GET /api/preview/:image_id — 预览图重定向
- GET/POST /api/admin/batches — 批次管理
- PATCH /api/admin/batches/:batch_id — 启用/停用/过期
- POST /api/admin/uploads/sign — 签发上传 URL
- POST /api/admin/uploads/complete — 提交 manifest

### 数据库 (D1) — 全部完成 ✅

表结构：
- users (含 role 列, 默认 user)
- batches
- prompt_groups (含 title, positive_prompt, negative_prompt, params_json)
- images (含 group_id, seed, metadata_json, r2_key, preview_r2_key, txt_key)
- user_batch_unlocks
- favorites
- access_logs
- downloads_log

### 前端 (Vue 3) — 组件结构已完成，待对接 API

src/
  main.js / App.vue / router.js / styles.css

  stores/
    user.js     — 用户状态、auth guard、dev mock 登录
    theme.js    — 日夜间切换 + localStorage + 系统偏好检测

  components/
    GlassNav.vue      — 玻璃导航栏（头像 hover 展开、主题切换、admin 入口、登出）
    TarotDeck.vue     — 塔罗牌叠卡 + 拖拽滑动
    WaterfallGrid.vue — 瀑布流模式
    PasswordSeal.vue  — 密码解锁弹窗（调用 /api/verify）
    ImageGrid.vue     — 网格视图
    FlipBook.vue      — 翻页书视图
    DetailView.vue    — 详情弹窗（毛玻璃、正负面分别复制、流光动画）

  views/
    LandingView.vue       — 未登录首页（Discord + Dev Mode 按钮）
    GalleryView.vue       — 书架页（Tarot/Waterfall 模式切换 + 密码解锁）
    InnerGalleryView.vue  — 画册内部（Grid/Flip 模式切换）
    AdminView.vue         — 管理后台占位

---

## 待完成

### Phase 1: 基础设施
- [ ] public/_routes.json — Cloudflare Pages SPA fallback 配置

### Phase 2: API 数据对接（替换 mock）
- [ ] GalleryView 对接 /api/my-unlocks — 显示真实批次列表 + 已解锁/未解锁状态
- [ ] InnerGalleryView 对接 /api/gallery/:batchId — 显示真实图片
- [ ] DetailView 对接 /api/download — 下载限频 + 日志
- [ ] DetailView 对接 /api/favorite — 收藏/取消
- [ ] PasswordSeal 对接 /api/verify — 正式密码验证（dev 模式已 mock）

### Phase 3: NAI 元数据解析
- [ ] src/lib/png-metadata.js — 浏览器端解析 PNG tEXt chunks
  - 提取 positive prompt、negative prompt、seed、steps、cfg_scale 等
  - 解析失败降级为文件名导入

### Phase 4: Admin 上传面板
- [ ] 批次管理（创建、查看、启用/停用）
- [ ] 批量选择 PNG/TXT 上传
- [ ] 自动读取 PNG metadata
- [ ] 自动按正负面 prompt 分组预览
- [ ] 手动分组编辑（移动、合并、新建、重命名）
- [ ] 浏览器端生成 WebP 缩略图
- [ ] 直传 R2（/api/admin/uploads/sign）
- [ ] 提交 manifest（/api/admin/uploads/complete）

### Phase 5: 密码界面优化
- [ ] 集成用户提供的密码锁设计

---

## 交互说明

项目以 The Glasshouse 为品牌名，视觉风格为毛玻璃+柔和色系，支持日夜间切换。

首页 -> 书架页（Tarot/Waterfall 展示各批次）
  -> 点击中央卡牌 -> 密码弹窗
    -> 输入密码验证 -> 进入画册内部
      -> 网格/翻页书双模式浏览
        -> 点击图片 -> 毛玻璃详情弹窗
          -> 正负面 prompt 分别复制、下载原图/TXT、收藏

批次组织方式待确认（按时间/主题/混合）。
自动分组（prompt_groups）在后端和管理上传流程中使用，前端画廊默认扁平展示。

## 管理员初始化
站长先 Discord 登录一次，然后在 D1 手动执行：
UPDATE users SET role="admin" WHERE discord_id="你的DiscordID";
