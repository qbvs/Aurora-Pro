# Aurora Pro 导航 - AI 驱动的个人仪表盘

![Aurora Pro 主界面截图](https://i.imgur.com/k2j1q5F.png)

**Aurora Pro** 是一款美观、强大且高度可定制的个人导航仪表盘。它由 AI 驱动，能够智能分析链接、推荐内容，并提供每日灵感寄语。

## ✨ 功能亮点

-   **🤖 AI 强力驱动**:
    -   **每日 AI 寄语**: 每天访问时，由 AI 生成一句富有哲理的诗意短语。
    -   **智能链接分析**: 自动填充网站标题、描述、品牌色。
    -   **内容发现**: 批量推荐相关网站。
    -   **智能图标**: 自动匹配 Lucide 图标。

-   **🎨 高度可定制**: 日夜主题、极光背景、自定义 Logo。

-   **☁️ 全平台云同步**:
    -   **Vercel KV**: 适用于 Vercel 部署或 Cloudflare 混合部署。
    -   **Cloudflare KV**: 适用于 Cloudflare 原生部署 (免费且快速)。

---

## 🛠️ 部署第一步：准备工作 (所有方案通用)

在开始之前，请确保你完成了以下两项准备。别担心，我们一步步来。

### 1. 拥有一个 GitHub 账号
所有部署都基于 GitHub。如果你还没有，请先 [注册一个 GitHub 账号](https://github.com/join)。

### 2. Fork (复制) 本项目到你的仓库
这是关键一步，相当于把项目的代码复制一份到你自己的名下，这样部署平台才能读取它。

1.  登录你的 GitHub 账号。
2.  访问本项目页面。
3.  点击页面右上角的 **"Fork"** 按钮。
4.  在弹出的页面中，直接点击 **"Create fork"** 按钮。
5.  等待几秒钟，页面会自动跳转到你自己的仓库，URL 会变成 `https://github.com/你的用户名/aurora-pro`。**恭喜你，代码准备好了！**

### 3. 获取 Gemini API Key (AI 功能核心)
本项目的所有 AI 功能都由 Google Gemini 提供支持，你需要一个免费的 API Key。

1.  访问 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2.  使用你的 Google 账号登录。
3.  点击 **"Create API key"** 按钮。
4.  在弹出的窗口中，复制那串以 `AIza` 开头的字符。这就是你的 API Key。
5.  **请务必将这串 Key 保存到安全的地方**，比如记事本里，我们马上会用到它。

---

## 🚀 部署第二步：选择你的部署平台

我们提供三种方案，请根据你的偏好选择**其中一种**即可。

-   **方案 A: Vercel 完整部署 (⭐️ 强烈推荐新手)**: 部署和数据库都在 Vercel，一站式解决，配置最简单。
-   **方案 B: Cloudflare 原生部署**: 网站和数据库都在 Cloudflare，全球访问速度快，免费额度高。
-   **方案 C: Cloudflare + Vercel 混合部署**: 网站在 Cloudflare，数据库在 Vercel。适合希望利用 CF 网络，又想简化数据库配置的用户。

---

### 方案 A: Vercel 完整部署 (最简单)

#### 第 1 步: 导入项目到 Vercel
1.  访问 [Vercel 官网](https://vercel.com) 并用你的 GitHub 账号登录。
2.  登录后，你会看到 Vercel 的仪表盘 (Dashboard)。点击页面中间或右上角的 **"Add New..."** -> **"Project"**。
3.  在项目列表里，找到你刚刚 Fork 的 `aurora-pro` 项目，点击它右侧的 **"Import"** 按钮。

#### 第 2 步: 配置项目
1.  **项目名称 (Project Name)**: 可以保持默认，或者改成你喜欢的名字。
2.  **环境变量 (Environment Variables)**: 这是最重要的一步。找到这个区域，我们需要添加两个变量：
    -   **添加第一个变量**:
        -   在 `Name` (或 `Key`) 处输入 `API_KEY`。
        -   在 `Value` 处粘贴你之前保存的 **Google Gemini API Key**。
        -   点击 **"Add"**。
    -   **添加第二个变量**:
        -   在 `Name` 处输入 `ADMIN_PASSWORD`。
        -   在 `Value` 处输入一个**你自己设定的后台登录密码**，例如 `123456`。请记住这个密码。
        -   点击 **"Add"**。
3.  **开始部署**: 确认以上信息无误后，点击底部的 **"Deploy"** 按钮。等待 1-2 分钟，Vercel 会自动完成构建和部署。

#### 第 3 步: 创建并连接数据库
部署成功后，你会看到一个庆祝页面。但我们还需要最后一步来开启数据同步功能。

1.  点击庆祝页面上的 **"Continue to Dashboard"** 进入项目管理后台。
2.  在项目页面的顶部导航栏，找到并点击 **"Storage"**。
3.  在打开的页面中，选择 **"KV (Redis)"** 选项卡，然后点击 **"Create Database"**。
4.  选择一个离你最近的地区 (Region)，然后点击 **"Create"**。
5.  Vercel 会展示连接成功的界面，并自动帮你把数据库信息添加到了环境变量里。

#### 第 4 步: 重新部署使数据库生效
这是**必须操作**的一步，为了让网站能读取到刚刚创建的数据库信息。

1.  回到项目的主概览页面 (Overview) 或 **"Deployments"** 页面。
2.  找到最新的一次部署记录 (通常在列表最上方)，点击它右侧的 "..." 更多菜单。
3.  选择 **"Redeploy"**，然后在弹窗中再次点击 **"Redeploy"**。
4.  等待部署完成。现在，你的个人导航站已经完美运行在 Vercel 上，并支持数据云同步！

---

### 方案 B: Cloudflare 原生部署 (速度最快)

#### 第 1 步: 在 Cloudflare 创建 KV 数据库
在部署网站前，我们先创建好用于存储数据的“仓库”。

1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  在左侧菜单栏中，找到并点击 **"Workers & Pages"**。
3.  在二级菜单中，点击 **"KV"**。
4.  点击页面右侧蓝色的 **"Create a Namespace"** 按钮。
5.  在 **"Namespace name"** 输入框中，**必须准确输入 `AURORA_KV`** (这是代码里约定好的名字)。
6.  点击 **"Add"**。KV 数据库就创建好了。

#### 第 2 步: 创建 Pages 项目并部署
1.  回到 **"Workers & Pages"** 的概览 (Overview) 页面。
2.  点击 **"Create Application"** -> 选择 **"Pages"** 选项卡 -> 点击 **"Connect to Git"**。
3.  授权并选择你 Fork 的 `aurora-pro` 仓库。
4.  在 **"Set up builds and deployments"** 页面：
    -   **Project name**: 可以自定义。
    -   **Production branch**: 保持 `main`。
    -   **Framework preset**: 在下拉框中选择 `Vite`。Cloudflare 会自动填充下面的构建设置。
    -   **Build command**: 应该是 `npm run build`。
    -   **Build output directory**: 应该是 `dist`。
5.  展开 **"Environment variables (advanced)"**，添加两个变量：
    -   **添加第一个**: `Variable name` 填 `API_KEY`，`Value` 粘贴你的 **Gemini API Key**。
    -   **添加第二个**: `Variable name` 填 `ADMIN_PASSWORD`，`Value` 填你**自定义的后台密码**。
6.  点击 **"Save and Deploy"**。等待部署完成。

#### 第 3 步: 绑定 KV 数据库到 Pages 项目
网站部署好了，现在要把它们“连接”起来。

1.  在项目部署成功的页面，点击 **"Continue to project"**。
2.  在项目管理页面，点击顶部的 **"Settings"** -> 左侧的 **"Functions"**。
3.  向下滚动页面，找到 **"KV namespace bindings"** 部分，点击 **"Add binding"**。
4.  **Variable name**: **必须准确输入 `AURORA_KV`**。
5.  **KV namespace**: 在下拉框中，选择我们第 1 步创建的那个 KV 数据库。
6.  点击 **"Save"**。

#### 第 4 步: 重新部署使绑定生效
1.  回到项目顶部的 **"Deployments"** 页面。
2.  找到最新的一次部署，点击 **"Retry deployment"**。
3.  等待部署完成。现在，你的网站已在 Cloudflare 上运行，并使用 Cloudflare KV 进行数据同步。

---

### 方案 C: Cloudflare + Vercel 混合部署 (灵活方案)

#### 第 1 步: 在 Vercel 创建数据库并获取凭证
我们只需要 Vercel 的数据库，所以过程很简单。

1.  登录 Vercel，按照 **方案 A 的第 1 步和第 3 步** 操作，创建一个项目并为其创建一个 KV 数据库。
2.  进入这个 Vercel 项目的 **"Settings"** -> **"Environment Variables"**。
3.  在这里，你会看到 Vercel 自动创建的 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`。**分别复制这两个变量的值**，保存到记事本里。

#### 第 2 步: 在 Cloudflare 创建 Pages 项目
1.  按照 **方案 B 的第 2 步** 在 Cloudflare 上创建 Pages 项目。
2.  **关键区别在于环境变量**：在 Cloudflare 的环境变量设置中，你需要添加 **四个** 变量：
    -   `API_KEY`: 你的 Gemini Key。
    -   `ADMIN_PASSWORD`: 你的后台密码。
    -   `KV_REST_API_URL`: 从 Vercel 复制的 URL 值。
    -   `KV_REST_API_TOKEN`: 从 Vercel 复制的 Token 值。
3.  点击 **"Save and Deploy"**。
4.  等待部署完成即可。这个方案**不需要**在 Cloudflare 上创建或绑定 KV，也**不需要**重新部署。

---

## 🎉 部署完成！开始使用

无论你选择哪种方案，部署成功后：

1.  访问你的导航站网址。
2.  点击右上角的 **设置 `⚙️` 图标**。
3.  输入你设置的 `ADMIN_PASSWORD` 即可进入后台，开始自由定制你的专属导航！

## 💻 本地开发

给喜欢折腾的朋友：

1.  Clone 代码并安装依赖 (`pnpm install` 或 `npm install`)。
2.  创建 `.env.local` 文件:
    ```env
    API_KEY="AIza..."
    ADMIN_PASSWORD="123"
    # 如果想测试 Vercel 同步，请填入 Vercel 的 KV 变量
    ```
3.  启动: `npm run dev`。
    *(注: 本地开发默认只支持 Vercel KV 同步或 LocalStorage。Cloudflare KV 需要使用 `npx wrangler pages dev dist` 模拟环境)*

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。
