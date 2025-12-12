<div align="center">

# 🌌 Aurora Pro &middot; 极光导航

**一款专为极客打造的新一代 AI 个人导航仪表盘**
<br>
*融合设计美学、智能算法与极致的个性化体验*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMar-ct%2FAurora-pro&env=API_KEY,ADMIN_PASSWORD&envDescription=Google%20Gemini%20API%20Key%20and%20Admin%20Password&envLink=https://aistudio.google.com/app/apikey)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Vercel KV](https://img.shields.io/badge/Vercel-KV_Sync-black)

</div>

<br/>

> **Aurora Pro** 将您的浏览器起始页，从一个简单的链接集合，转变为一个**会思考**、**懂习惯**的个人数字中枢。它不仅看起来赏心悦目，更能通过 AI 和算法自动优化您的使用效率。

---

## ✨ 核心亮点 (Core Features)

### 🧠 1. 智能常用推荐 (Smart Favorites) <span style="color: #8b5cf6; font-size: 0.8em; font-weight: bold;">NEW!</span>
告别手动整理！系统内置智能追踪算法：
- **自动学习**: 系统会自动记录您对每个网站的点击使用频率。
- **动态晋升**: 全站使用频率最高的 **8 个网站** 会自动晋升至首页顶部的「🔥 常用推荐」分类。
- **实时更新**: 随着您使用习惯的变化，推荐列表会自动调整，确保您最需要的工具永远触手可及。

### 🤖 2. 深度 AI 集成 (Powered by Gemini)
- **精准网站识别**: 只需粘贴一个 URL，AI 即可自动提取网站标题、生成**精准的中文简介**、并提取品牌主色调，同时自动过滤虚假链接。
- **智能分类填充**: 新建一个分类（如“设计灵感”），AI 可一键为您搜索并填充该领域最高质量的真实网站资源。
- **每日灵感寄语**: 拒绝生硬的翻译腔！经过调优的 AI 模型每天为您生成一句**纯中文**的开发者/设计师专属励志短语，包含名人名言与哲学思考。
- **图标自动匹配**: 根据分类名称，AI 自动从图标库中匹配最符合语境的图标。

### 🎨 3. 极致美学与交互
- **极光流体背景**: 默认启用优雅的极光动态背景，同时也支持**纯净单色**或**自定义壁纸**（支持上传图片）。
- **实时数字时钟**: 醒目的超大字体时钟，配合日期显示，让时间管理更直观。
- **沉浸式体验**: 精心调教的毛玻璃效果（Glassmorphism）、平滑的过渡动画以及完美的深色模式（Dark Mode）适配。

### ☁️ 4. 企业级云同步
- **多端无缝漫游**: 基于 **Redis (Upstash)** 数据库，您的所有配置、链接和点击数据均在云端加密存储。
- **即时同步**: 在公司电脑添加的链接，回家打开手机立刻就能看到。

---

## 🚀 部署指南 (保姆级教程)

只需简单的 5 步，您就可以免费拥有这个强大的导航站。无需任何编程基础。

### 准备工作
1.  拥有一个 **GitHub** 账号。
2.  拥有一个 **Vercel** 账号（可使用 GitHub 登录）。
3.  获取 **Google Gemini API Key** [点击获取](https://aistudio.google.com/app/apikey)。
    *   *提示：Google API 目前有免费额度，对于个人使用完全足够。*

---

### 第一步：一键克隆与部署

1.  点击页面顶部的蓝色 **[Deploy with Vercel]** 按钮。
2.  在 Vercel 页面中，在 **"Create Git Repository"** 处选择您的 GitHub 账号，并输入项目名称（例如 `my-nav`），点击 **Create**。
3.  **配置环境变量 (Environment Variables)**：
    Vercel 会自动识别出所需的变量，请填写以下内容：

    | 变量名 (Name) | 填写内容 (Value) | 说明 |
    | :--- | :--- | :--- |
    | `API_KEY` | `AIzaSy...` | 您的 Google Gemini API 密钥 |
    | `ADMIN_PASSWORD` | `yourpassword` | **自定义一个密码**，用于登录管理后台 |

4.  点击 **Deploy** 按钮，等待约 1 分钟，直到出现满屏的烟花 🎉。

---

### 第二步：连接云数据库 (实现数据同步)

**这一步至关重要！** 如果不配置，您的数据将在刷新后丢失。由于 Vercel 界面已更新，请严格按照以下步骤操作：

1.  部署完成后，点击 **"Continue to Dashboard"** 进入 Vercel 项目控制台。
2.  点击顶部导航栏的 **Storage** 选项卡。
3.  点击 **Connect Store** (或 Create New) 按钮。
4.  **注意：** 在弹出的 **"Browse Storage"** 窗口中，向下滚动找到 **Marketplace Database Providers** 部分（如文档截图所示）。
5.  点击选择 **"Upstash for Redis"**。
    *   *注：Vercel KV 的底层服务就是 Upstash，两者完全通用且免费额度一致。*
6.  在弹出的集成页面中：
    *   点击 **Install** 或 **Create**。
    *   选择 **Free (Hobby)** 计划。
    *   在 "Link to Project" 步骤中，确保勾选了您刚刚创建的项目（例如 `my-nav`），然后点击 **Connect**。
    *   *此时系统会自动将 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 等环境变量注入到您的项目中。*

---

### 第三步：重新部署 (让数据库生效)

Vercel 不会自动在运行中的项目上应用新连接的数据库，必须手动刷新一次。

1.  点击顶部导航栏的 **Deployments** 选项卡。
2.  找到列表最上方（最新）的那条部署记录。
3.  点击右侧的 **三个点 (···)** 图标，选择 **Redeploy**。
4.  在弹出的窗口中，直接点击 **Redeploy** (不要勾选 "Use existing Build Cache")。

**等待部署状态变成 "Ready" (绿色)。恭喜！您的专属 AI 导航站已就绪！**

---

### 第四步：开始使用

1.  访问您的 Vercel 域名（例如 `https://my-nav.vercel.app`）。
2.  点击右上角的 **"管理面板"** 按钮。
3.  输入您在第一步设置的 `ADMIN_PASSWORD`。
4.  **检查状态**：侧边栏底部应显示 **🟢 已连接 Vercel KV**。
5.  **开始配置**：
    *   点击 **"全局设置"** 修改网站标题、Logo。
    *   点击 **"AI 模型"** 测试 API 连接状态。
    *   点击 **"添加链接"** 体验 AI 自动填充的魔法。

---

## ⚙️ 高级配置 (环境变量)

如果您需要更高级的自定义，可以在 Vercel 的 `Settings` -> `Environment Variables` 中添加以下变量：

| 变量名 | 描述 |
| :--- | :--- |
| `API_KEY` | **(必填)** 默认的 Google Gemini API Key。 |
| `ADMIN_PASSWORD` | **(必填)** 管理后台登录密码。 |
| `CUSTOM_API_KEY_1` ~ `5` | (可选) 预留槽位。如果您想在设置面板中快速切换不同的 API Key，可在此预先填入。 |
| `KV_REST_API_URL` | (自动) 连接 Upstash/KV 数据库后自动生成，**请勿手动修改**。 |
| `KV_REST_API_TOKEN` | (自动) 连接 Upstash/KV 数据库后自动生成，**请勿手动修改**。 |

---

## 🛠️ 本地开发 (Developers)

如果您是开发者，想在本地运行或修改代码：

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/aurora-pro.git
cd aurora-pro

# 2. 安装依赖
npm install

# 3. 配置环境
# 在根目录新建 .env 文件，填入：
# VITE_API_KEY=your_key
# VITE_ADMIN_PASSWORD=your_password

# 4. 启动
npm run dev
```

---

## 常见问题 (FAQ)

**Q: 为什么“常用推荐”分类无法手动添加链接？**
A: “常用推荐”分类是由系统算法全自动管理的。它根据您的点击行为，实时筛选出全站点击率最高的 8 个链接。您只需正常使用导航站，爱用的网站会自动出现在这里。

**Q: AI 问候语显示英文或拼音？**
A: 我们已更新 Prompt 策略，强制 AI 仅输出简体中文的名人名句或励志语录。如果仍有极个别情况，请稍后刷新即可，AI 会不断自我修正。

**Q: 只有 Google Gemini 能用吗？**
A: 默认使用 Gemini (因为免费且强大)。但我们在设置面板中预留了 **OpenAI 格式** 的接口支持。您可以添加任何兼容 OpenAI 协议的 API（如 DeepSeek, Moonshot, OneAPI 等）。

---

<div align="center">
Made with ❤️ for efficiency and beauty.
</div>