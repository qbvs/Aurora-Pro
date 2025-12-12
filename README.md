<div align="center">

# 🌌 Aurora Pro &middot; 极光导航

**一款专为极客打造的新一代 AI 个人导航仪表盘，融合了设计美学、强大功能与极致的个性化体验。**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMar-ct%2FAurora-pro&env=API_KEY,ADMIN_PASSWORD&envDescription=Google%20Gemini%20API%20Key%20and%20Admin%20Password&envLink=https://aistudio.google.com/app/apikey)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

<br/>

> Aurora Pro 将您的浏览器起始页，从一个简单的链接集合，转变为一个智能、高效且赏心悦目的个人工作空间。它不仅是工具，更是您数字生活的美学延伸。

---

## ✨ 核心功能 (Core Features)

### 🎨 仪表盘美学 (Aesthetics)
- **高度可定制**: 在全局设置中自定义**站点名称**与**Logo图标**，打造专属品牌感。
- **实时时钟 & 统计**: 主页优雅展示**大字体实时数字时钟**，并自动统计已收录的**网站总数**，信息一目了然。
- **动态背景**: 内置优雅的**极光流体**动态背景，同时支持**纯净单色**或**自定义壁纸**（URL或本地上传），满足一切个性化需求。
- **智能图标系统**: 在管理模式下修改分类名称，AI 将自动为其匹配最合适的 [Lucide](https://lucide.dev/) 图标，告别手动查找。

### 🤖 AI 智能助理 (Powered by Google Gemini)
- **AI 智能问候**: 每次打开页面，AI 都会生成一句为开发者/设计师量身定制的短语，带来一天的好心情。
- **一键链接填充**: 只需粘贴一个 URL，AI 即可自动识别网站标题、生成精准中文简介，并提取品牌主色调。
- **分类内容建议**: 面对一个新分类无从下手？AI 可根据分类名称，自动推荐数个相关的高质量网站链接。
- **智能搜索配置**: 添加新的搜索引擎时，AI 可通过 URL 自动分析并生成搜索串格式。

### ☁️ 无缝云同步 (Seamless Cloud Sync)
- **企业级云同步**: 基于 **Vercel KV**，实现所有设置和链接数据在云端存储，确保您在任何设备上（桌面、移动端）访问的都是最新版本。
- **连接状态感知**: 管理侧边栏实时显示云同步连接状态，让您对数据安全了如指掌。

### ⚙️ 灵活的 AI 配置
- **多服务商支持**: 不仅仅是 Google Gemini！系统支持任何兼容 **OpenAI API 格式**的第三方服务商（如 Longcat, Deepseek 等）。
- **可视化管理**: 在设置面板中轻松添加、编辑、删除和切换不同的 AI 服务商配置。
- **连接测试**: 一键测试 API Key 和 Base URL 的连通性，并可自动拉取模型列表，配置过程清晰透明。

---

## 🛠️ 技术栈 (Tech Stack)

- **前端框架**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **UI & 样式**: [Tailwind CSS](https://tailwindcss.com/)
- **核心 AI 能力**: [Google Gemini API](https://ai.google.dev/)
- **云端数据同步**: [Vercel KV](https://vercel.com/storage/kv)
- **图标库**: [Lucide React](https://lucide.dev/)
- **语言**: TypeScript

---

## 🚀 Vercel 部署完全指南 (保姆级文字教程)

只需四步，即可拥有一个功能完整的私有 AI 导航站。

### 前置准备
1.  一个 **GitHub** 账户。
2.  一个 **Vercel** 账户，并已关联您的 GitHub。
3.  一个 **Google Gemini API Key**。
    - 前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建并复制您的密钥。
    - **强烈建议**: 前往 [Google Cloud Billing](https://console.cloud.google.com/billing) 为您的项目启用结算，以获取近乎无限的 API 调用额度，避免免费额度用尽。

---

### ✅ 第一步：一键部署项目

1.  点击页面顶部的 **"Deploy with Vercel"** 蓝色按钮。
2.  Vercel 将引导您创建一个新的代码仓库 (Repository)，请随意命名（例如 `my-aurora-pro`）。
3.  在 "Configure Project" 页面，展开 **Environment Variables** (环境变量) 部分，填入以下两项：

| 变量名          | 必填 | 描述                                       |
| :-------------- | :--: | :----------------------------------------- |
| `API_KEY`       |  ✅  | 您在上一步获取的 Google Gemini API 密钥。      |
| `ADMIN_PASSWORD`|  ✅  | 用于登录管理面板的**自定义密码**，请务必设置。 |

4.  点击 **Deploy**，等待约 1 分钟，Vercel 会完成首次构建和部署。

---

### ✅ 第二步：创建并连接云数据库 (Vercel KV) - 关键步骤

为了让您的导航数据能够在所有设备间同步，此步骤**至关重要**。我们将引导您完成每一个点击。

1.  **进入 Storage 页面**:
    *   项目部署成功后，您会自动进入 Vercel 的项目控制台。
    *   在顶部导航栏中找到并点击 **`Storage`** 标签页 (通常在 `Deployments` 和 `Logs` 之间)。

2.  **选择 KV 数据库**:
    *   在 Storage 页面，您会看到 Vercel 提供的几种存储选项。
    *   请找到 **`KV (Durable Redis)`** 这一项。
    *   点击它右侧的 **`Connect Store`** 按钮。

3.  **创建数据库**:
    *   此时会弹出一个创建数据库的窗口。
    *   **您无需修改任何内容**。Vercel 已经为您自动生成了数据库名称并选择了免费套餐。
    *   直接滚动到底部，点击右下角黑色的 **`Create`** 按钮。

4.  **连接到项目 (最关键！)**:
    *   创建成功后，Vercel 会立即显示一个 **"Connect to Project"** 的界面。
    *   在这个界面，请**确保**您的 `aurora-pro` (或您自定义的仓库名) 项目被选中。
    *   然后点击蓝色的 **`Connect`** 按钮。

5.  **自动配置完成**:
    *   恭喜！Vercel 已经自动将云同步所需的所有环境变量 (`KV_REST_API_URL` 等) 添加到了您的项目中。
    *   **您无需手动进行任何复制粘贴**。现在可以继续下一步了。

---

### ✅ 第三步：重新部署以应用更改 - 必须操作!

Vercel 不会自动将新连接的数据库密钥应用到旧的部署中。您**必须**手动触发一次 **Redeploy** (重新部署)，让新设置生效。

1.  **进入 Deployments 页面**:
    *   在您的 Vercel 项目控制台中，点击顶部的 **`Deployments`** 标签页。

2.  **找到并重新部署**:
    *   您会看到一个部署列表，找到**最顶部**的那一条记录（即最新的部署）。
    *   将鼠标移到该条记录上，点击其最右侧出现的 **`...`** (更多选项) 菜单按钮。
    *   在弹出的菜单中，选择 **`Redeploy`**。

3.  **确认重新部署**:
    *   Vercel 会弹出一个确认窗口。
    *   **请确保不要勾选** "Use existing Build Cache" (使用现有构建缓存) 这个选项。我们需要一次全新的构建来应用新变量。
    *   最后，点击右下角黑色的 **`Redeploy`** 按钮。

---

### ✅ 第四步：大功告成！
等待这次重新部署完成后 (状态变为 `Ready`)，访问您的网站 URL。点击“管理面板”，输入您设置的密码，侧边栏底部应显示 **🟢 已连接 Vercel KV** 的绿色状态。

恭喜，您的 AI 导航站已完美配置！

---

## 🔧 环境变量详解 (Environment Variables)

| 变量名                  | 描述                                                                          | 设置方式     |
| :---------------------- | :---------------------------------------------------------------------------- | :----------- |
| `API_KEY`               | **（必须）** 默认的 Google Gemini API Key。                                          | 手动添加     |
| `ADMIN_PASSWORD`        | **（必须）** 登录管理后台的密码。                                                     | 手动添加     |
| `KV_REST_API_URL`       | Vercel KV 数据库的 API 地址。                                                       | **自动注入** |
| `KV_REST_API_TOKEN`     | Vercel KV 数据库的访问令牌。                                                        | **自动注入** |
| `CUSTOM_API_KEY_1` ~ `5` | 用于在 UI 中配置自定义 AI 服务商的预留环境变量槽位，方便切换不同的付费 Key。 | (可选) 手动添加 |

---

## ⚠️ 重要：关于 API 额度与安全

### API 额度
Google 对 Gemini API 提供了免费套餐，但**免费额度非常有限**（例如，gemini-2.5-flash 模型每天仅有约 20 次的请求额度）。当您频繁使用“AI识别”、“AI填充”等功能后，很快就会遇到 `Quota Exceeded` (额度超限) 的错误。

**为了确保所有 AI 功能稳定、不间断地运行，强烈建议您为您的 Google API Key 启用结算功能。** 对于个人使用场景，API 的调用费用非常低廉（通常每月仅需几美分），但能将您的使用额度提升成千上万倍。

### 安全说明
- **API Key 安全**: 您的 `API_KEY` 在构建时会作为环境变量注入到前端代码中。这是 Vercel 部署静态网站的标准行为。为了最大化安全，强烈建议您在 Google Cloud Console 中为您的 API Key **设置 HTTP Referrer 限制**，只允许您的 Vercel 域名（例如 `your-project.vercel.app`）使用该密钥，防止被盗用。
- **管理密码**: `ADMIN_PASSWORD` 同样作为环境变量注入，仅用于前端简单的访问控制，防止访客误操作。它并非一个高强度的后端验证机制。

---

## 💻 本地开发

```bash
# 1. 克隆您的仓库
git clone https://github.com/your-username/aurora-pro.git
cd aurora-pro

# 2. 安装依赖
npm install

# 3. 创建环境变量文件
# 在项目根目录新建一个名为 .env 的文件，并填入以下内容:
# VITE_API_KEY=your_gemini_api_key
# VITE_ADMIN_PASSWORD=your_secure_password

# 4. 启动开发服务器
npm run dev
```

---

## 🤝 贡献与支持

Aurora Pro 遵循 [MIT License](LICENSE) 开源协议。
如果您喜欢这个项目，请在 GitHub 上给一个 ⭐️ Star！这是对我最大的鼓励和支持。
