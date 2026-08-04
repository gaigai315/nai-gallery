# The Glasshouse — NAI 私人画廊

基于 Cloudflare Pages + D1 + R2 的轻量级私人图片分享平台。Discord 登录、批次密码解锁、画廊/提示词/Vibe 专区、许愿墙、抽卡。

---

## ⚠️ 使用许可

- ✅ 个人学习、研究、非商业使用
- ✅ 二改前后端代码（修改后仍需开源、保留本许可）
- ❌ 严禁商业化：不得售卖访问权限、捆绑付费产品、或以此提供收费服务

详见 [LICENSE](LICENSE) 和 [PRIVACY.md](PRIVACY.md)。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vue Router + Vite |
| 后端 | Cloudflare Pages Functions (Node.js) |
| 数据库 | Cloudflare D1 (SQLite) |
| 存储 | Cloudflare R2 |
| 认证 | Discord OAuth2 |

---

## 本地开发

### 快速启动（Vite HMR + Mock API）

```powershell
npm install
npm run dev
```

浏览器打开 http://localhost:5173。开发服务器内置内存 Mock API，点击首页「Dev Mode」可模拟管理员登录，无需真实后端。

### 完整本地栈（Wrangler + D1 + R2）

```powershell
npm install
cp .env.example .dev.vars   # 编辑填入真实值
npx wrangler d1 execute nai-gallery --local --file migrations/0001_initial.sql
npx wrangler d1 execute nai-gallery --local --file migrations/0002_notes_cover.sql
# ... 依次执行所有 migration
npm run build
npx wrangler pages dev dist --d1=DB --r2=GALLERY_BUCKET
```

---

## 部署

详见 [部署手册.md](部署手册.md)，7 步上线：登录 → D1 → 迁移 → R2 → CORS → Secrets → 部署。

---

## 项目结构

```
nai-gallery/
├── src/                  # Vue 3 前端
│   ├── views/            # 页面组件
│   ├── components/       # 通用组件
│   ├── lib/              # 工具函数（API、上传、PNG 解析）
│   └── stores/           # Pinia stores
├── functions/            # Cloudflare Pages Functions
│   ├── api/              # 公开 API
│   ├── api/admin/        # 管理员 API
│   └── _lib/             # 共享库（密码、会话、限流等）
├── migrations/           # D1 数据库迁移
└── public/               # 静态资源
```

---

## 功能概览

- 🎨 画廊：批次密码解锁、Grid/塔罗双视图、无限滚动分页
- 🎴 抽卡：从已解锁图片中随机抽取，翻牌展示
- 📝 提示词专区：管理员发布、用户浏览复制
- 📦 Vibe 专区：文件上传下载、配图展示
- 💬 许愿墙：便利贴风格，站长可回复
- 🔍 全局搜索：跨画廊/提示词/Vibe 搜索
- 🔔 公告弹窗：管理员编辑，用户登录轮播
- 📜 密令宣誓：自定义宣誓文本，逐字输入后方可登录
- 🛡 图片级管理：单图/批量删除、移动分组、压缩归档
- 🏷 提示词过滤：忽略指定 tag，自动合并同串不同变体

---

## 管理员初始化

首次 Discord 登录后，通过 D1 提升权限：

```powershell
npx wrangler d1 execute nai-gallery --remote --command="UPDATE users SET role='admin' WHERE discord_id='你的ID';"
```

开发模式下点击首页「Dev Mode」直接模拟管理员登录。

---

## 隐私

[PRIVACY.md](PRIVACY.md)
