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

40+ 个 API 端点全部实现：auth (discord + callback)、me、my-unlocks (LEFT JOIN + cover_url)、verify、gallery/:id (含 groups 列表+分页)、download (限频)、favorite、logout、preview/:id、search、announcements、site-config、vibe/prompts/wishes/feedbacks CRUD、my-favorites、admin 全系列（batches/stats/uploads/groups/images/about/site-config/announcements/vibe/prompts/wishes/feedbacks）

### 数据库 (D1) — 全部完成 ✅

5 个迁移文件全部就绪：
- 0001_initial.sql — 核心表（users, batches, prompt_groups, images, unlocks, favorites, logs）
- 0002_notes_cover.sql — 封面+备注
- 0003_announcements_config.sql — 公告+站点配置
- 0004_vibe_prompts.sql — Vibe+提示词帖子
- 0005_wishes_feedback.sql — 许愿墙+反馈

### 前端 (Vue 3) — ✅

**stores:** user.js (含 dev mock 登录, sessionStorage 持久化)、theme.js、toast.js
**lib:** api.js (ApiError wrapper + toast)、png-metadata.js (NAI PNG tEXt 解析)、upload.js (WebP 缩略图 + compressToJpeg + R2 直传)
**components:** GlassNav、TarotDeck、WaterfallGrid、PasswordSeal、ImageGrid、FlipBook、DetailView、ModuleNav、SearchOverlay、AnnouncementModal、Toast
**views (15个):** LandingView、GalleryView、InnerGalleryView、AdminView、FavoritesView、VibeListView、VibePostView、PromptListView、PromptPostView、DrawView、WishView、FeedbackView、AboutView、OtherView、PlaceholderView
**dev:** public/_routes.json、vite.config.js devApiPlugin（完整 mock 覆盖所有 API）

---

## 已完成 Phase

### Phase 3: NAI 元数据解析 ✅
### Phase 4: Admin 上传面板 ✅
### Phase 6: Cloudflare 部署 ✅
### Phase 7: 架构优化 ✅
### Phase 8: 社区功能 ✅
### Phase 9: 内容模块 ✅
### Phase 10: UX 收尾 ✅
- 删除按钮 hover 才显示
- 批次备注移到密码弹窗
- 导航栏重构 + 搜索覆盖层
- AdminView 设置图标换齿轮
- 桌面 Grid 尺寸优化
- 自定义 404 页面
- PWA manifest

### Phase 11: 社区收尾 ✅
- 抽卡后端（draw.js）
- 许愿墙 Mock 补齐 + 反馈 Mock
- 提示词过滤分组（filter_words + grouping.js）
- 反馈管理（AdminView 查看/删除）
- 批次密码重置 backend
- Discord 身份组验证 — OAuth scope + callback guild/role 检查 + LandingView 错误提示


---

## 待修复

（无已知 bug — 所有已知问题已修复 ✅）

---

## 待做新功能

（所有新功能已完成 ✅）

---

## 待优化

（所有优化已完成 ✅）

---

## 管理员初始化

站长先 Discord 登录一次，然后在 D1 手动执行：

```sql
UPDATE users SET role = 'admin' WHERE discord_id = '你的DiscordID';
```
