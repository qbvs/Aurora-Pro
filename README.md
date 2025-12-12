# 🌌 Aurora Pro 极光导航

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**Aurora Pro** 是一款专为个人开发者和设计师打造的**新一代智能导航仪表盘**。它融合了极光流体美学与 Google Gemini AI 的强大能力，让您的浏览器起始页不仅美观，而且极具效率。

---

## ✨ 核心亮点

### 🎨 仪表盘美学 (Dashboard Aesthetics)
*   **高度可定制**: 在全局设置中自定义**站点名称**与**Logo图标**，打造专属品牌感。
*   **实时时钟 & 统计**: 主页上优雅展示**大字体实时数字时钟**，并自动统计已收录的**网站总数**，信息一目了然。
*   **动态背景**: 内置优雅的**极光流体**动态背景，并支持**纯净单色**或**自定义壁纸**（URL或本地上传），满足个性化需求。
*   **智能图标系统**: 在管理模式下修改分类名称，AI 将自动为其匹配最合适的 Lucide 图标，告别手动查找。

### 🤖 AI 智能助理 (AI Smart Assistant)
*   **AI 智能问候**: 每次打开页面，AI 都会生成一句为开发者/设计师量身定制的短语，带来一天的好心情。
*   **一键链接填充**: 只需粘贴一个 URL，AI 即可自动识别网站标题、生成精准中文简介，并提取品牌主色调。
*   **分类内容建议**: 面对一个新分类无从下手？AI 可根据分类名称，自动推荐数个相关的高质量网站链接。
*   **智能搜索配置**: 添加新的搜索引擎时，AI 可自动分析并生成搜索串格式。

### ☁️ 无缝数据同步 (Seamless Data Sync)
*   **企业级云同步**: 基于 Vercel KV，实现所有设置和链接数据在云端存储，确保您在任何设备上（桌面、移动端）访问的都是最新版本。
*   **连接状态感知**: 管理侧边栏实时显示云同步连接状态，让您对数据安全了如指掌。

---

## 🚀 部署指南 (Vercel)

只需 5 分钟，即可拥有属于您的 Aurora Pro。

### 第一步：获取 AI 密钥
1.  前往 [Google AI Studio](https://aistudio.google.com/)。
2.  点击 "Get API Key" 创建并复制您的密钥。

### 第二步：一键部署
点击页面顶部的 **"Deploy with Vercel"** 按钮：
1.  Vercel 将自动为您 Fork 本仓库到您的 GitHub 账户。
2.  在 Vercel 部署页面，会提示输入环境变量，请填入以下两项：

| 变量名 | 必填 | 描述 |
| :--- | :---: | :--- |
| `API_KEY` | ✅ | 您在第一步获取的 Google Gemini API 密钥。 |
| `ADMIN_PASSWORD` | ✅ | 用于登录管理面板的密码，请设置一个安全的自定义字符串。 |

### 第三步：配置云同步 (Vercel KV) - **关键步骤**
为了让您的数据在多台设备间同步，需要绑定 Vercel KV 数据库。

1.  等待项目首次部署完成，然后进入您的 [Vercel Dashboard](https://vercel.com/dashboard)。
2.  点击进入刚部署的 **Aurora Pro** 项目。
3.  在项目页面的顶部导航栏中找到并点击 **Storage** (存储)。
4.  点击 **Create Database** (创建数据库)，然后选择 **KV (Redis)** 并点击 **Continue**。
5.  接受默认的数据库名称或自定义，Region (区域) 选择一个离您近的即可，然后点击 **Create**。
6.  **最重要的一步**: 在接下来的 "Connect to..." 页面，确保您的 Aurora Pro 项目被选中，然后点击 **Connect**。
    *   这一步操作，Vercel 会自动将 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 等环境变量注入到您的项目中。
    *   **您无需手动复制或填写这些 `KV_` 开头的变量**。

<br/>

> **⚠️ 重要提示：必须重新部署！**
> Vercel 不会自动将新连接的 KV 环境变量应用到旧的部署中。您**必须**手动触发一次 **Redeploy** (重新部署)。
> 
> *   前往项目的 **Deployments** 标签页。
> *   找到最新的那条部署记录，点击其右侧的 **`...`** 菜单。
> *   选择 **Redeploy**。
>
> 这一步会强制 Vercel 使用包含新环境变量的设置来**重新构建**您的整个应用。

<br/>

8.  等待重新部署完成后，打开您的网站。进入管理面板，侧边栏底部应显示 **🟢 已连接 Vercel KV** 的绿色状态提示。

---

## 🔒 安全说明

本应用采用纯客户端渲染 (SPA) 架构，所有逻辑均在您的浏览器中运行。

*   **API Key 安全**: 您的 `API_KEY` 在构建时会作为环境变量注入到前端代码中。这是静态网站部署的标准行为。为了最大化安全，强烈建议您在 Google Cloud Console 中为您的 API Key **设置 HTTP Referrer 限制**，只允许您的 Vercel 域名（例如 `your-project.vercel.app`）使用该密钥，防止被盗用。
*   **管理密码**: `ADMIN_PASSWORD` 同样作为环境变量注入，仅用于前端简单的访问控制，防止访客误操作。它并非一个高强度的后端验证机制，请知悉。

---

## 🛠️ 本地开发

```bash
# 1. 克隆您的仓库
git clone https://github.com/your-username/aurora-pro.git
cd aurora-pro

# 2. 安装依赖
npm install

# 3. 创建环境变量文件
# 在项目根目录新建一个名为 .env 的文件，并填入以下内容:
# API_KEY=your_gemini_api_key
# ADMIN_PASSWORD=your_secure_password

# 4. 启动开发服务器
npm run dev
```

## 🤝 贡献与支持

Aurora Pro 遵循 [MIT License](LICENSE) 开源协议。
如果您喜欢这个项目，请在 GitHub 上给一个 ⭐️ Star！这是对我最大的鼓励。