# DEV.md — 开发者文档

XHS-TextCard 是纯前端、零后端的静态站点，将 Markdown 文本在浏览器本地渲染为 Canvas 图片卡片（小红书文字卡片），支持智能分页、多模板与批量导出。

## 技术栈

| 项 | 说明 |
|:--|:--|
| 语言 | TypeScript（ES 模块，strict） |
| 构建 | [Vite](https://vite.dev)（`@tailwindcss/vite` 插件） |
| 样式 | [Tailwind CSS v4](https://tailwindcss.com)（迁移进行中） |
| 运行时依赖 | 无后端；第三方库通过 `<script>` 以全局对象加载（不 npm 引入） |

## 目录结构

```
src/                      # 源码（TypeScript，ES 模块，唯一事实来源）
  main.ts                 # Vite 入口：引导 App + 引入样式
  App.ts                  # 核心调度器，编排各组件
  core/                   # 渲染与分页核心
    CanvasRenderer.ts     # 画布绘制引擎
    TextSplitter.ts       # Markdown → 分页 LayoutBlock[][]
    TemplateDefinitions.ts# 模板注册表（styleMap + getTemplate/getContentBox）
    CanvasTextEngine.ts   # Canvas 排版引擎
  services/               # 业务服务与控制器
    TemplateManager.ts    # 加载 templates/*.json 配置
    PreviewGenerator.ts   # 预览卡片 DOM 生成
    DownloadManager.ts    # 单张 / ZIP 批量下载
    EditorController.ts   # 侧边栏编辑面板
  templates/              # 每个模板一个类（实现 Template 接口）
  utils/                  # canvas_utils.ts / markdown_util.ts / template_utils.ts
  types.ts                # 共享接口（import type 引入）
  global.d.ts             # 第三方全局库的 ambient 类型（无 import/export）
  constants.ts            # 尺寸与默认参数
  styles/main.css         # Tailwind 源文件（@theme 令牌 + @source）
public/                   # 静态资源（构建时原样复制到 dist/）
  assets/                 # 封面图、图标（readme/ 留在仓库根，仅 README 用）
  css/                    # 旧手写 CSS（页面尚未迁移到 Tailwind，勿删）
  third-party/            # vendored 库：marked / jszip / mermaid / pickr
  templates/              # 模板 JSON（index.json + {id}.json）
  data/                   # default-text.md 等运行时 fetch 的数据
  about.html / guide.html / format-demo.html   # 纯静态页面（无 TS）
  robots.txt / sitemap.xml / d1e9ce…txt / og-image.png  # SEO/验证文件
editor.html               # 编辑器页面（Vite 入口，加载 src/main.ts）
index.html                # 重定向到 /editor.html
rich-blocks.html          # 手动测试页（引入 CanvasTextEngine）
vite.config.ts            # Vite 多页构建配置
tsconfig.json             # 类型检查配置（noEmit，moduleResolution: bundler）
dist/                     # 构建产物（gitignore）
```

> `js/*.js` 是 TS 迁移前的遗留产物，无任何引用，**不要编辑**。

## 架构

- **模块图**：`main.ts` → `App` →（`TemplateManager` / `PreviewGenerator` / `DownloadManager` / `EditorController` / `TextSplitter`）→ `CanvasRenderer` →（`TEMPLATE_DEFINITIONS` / `CANVAS_UTIL` / `CanvasTextEngine`）。
- **渲染管线**：`TextSplitter`（Markdown 经 `marked` 解析为 token → `LayoutBlock[][]` 分页）→ `CanvasRenderer`（依据 `TemplateDefinitions` 绘制每页画布）。
- **第三方库为全局对象**：在 `editor.html` 用 `<script>` 加载（vendored `public/third-party/` + CDN 的 highlight.js / MathJax / 字体），类型声明集中在 `src/global.d.ts`。代码中通过 `typeof marked !== 'undefined'` 等守卫兜底。
- **模板配置驱动**：`public/templates/index.json` 决定顺序，`{id}.json` 提供基础配置；绘制逻辑在 `src/templates/{Name}.ts` 的类中（实现 `Template` 接口），由 `src/core/TemplateDefinitions.ts` 的 `templateClasses` 数组统一注册（详见下方「模板开发」）。
- **持久化**：每模板配置存 `localStorage`（`xhs_tpl_config_<id>`、`xhs_last_template_id`、`xhs_edit_mode`）。

## 模板开发（定义新模板）

一个模板 = 一份 JSON 配置（`public/templates/{id}.json`）+ 一个绘制类（`src/templates/{Name}.ts`）。绘制类实现 `Template` 接口（定义见 `src/templates/type.d.ts`）：

```ts
interface Template {
    name: string;        // 必填，= 模板 id，作为注册 key
    getContentBox?: (config, width, height) => ContentBox;                          // 正文可用区域（分页与渲染共享）
    drawBackground?: (ctx, width, height, config) => void;                          // 背景（画在正文之下）
    drawTextAreaBackground?: (ctx, rect, config) => void;                           // 文本区背景（纸张/卡片）
    drawForeground?: (ctx, width, height, index, totalCount, config) => void;       // 前景装饰/页码
    getTextStyles?: (segment, config) => TextStyle;                                 // 按段定制颜色/字体
    terminalStyles?: TerminalStyle | ((cfg) => TerminalStyle);                      // 终端风格签名配色
}
```

### 绘制顺序

`CanvasRenderer.render` 按固定层级调用模板钩子：`drawBackground` → `drawTextAreaBackground` → 水印 → 正文/封面 → `drawForeground`（封面页不调用）→ 签名 → 社交图标。

### 关键参数

- `config` 为 `TemplateConfig`（`src/types.ts`）：`bgColor`/`textColor`/`accentColor`/`fontSize`/`lineHeight`/`letterSpacing`/`textPadding`/`fontFamily`/`hasCover`/`hasSignature` 等。
- 画布坐标统一按预览尺寸 `width`×`height`（500×667，常量 `PREVIEW_WIDTH`/`PREVIEW_HEIGHT` 见 `src/constants.ts`）；导出时由渲染器按 `scale` 放大，逻辑坐标不变。

### 可用工具

- `CANVAS_UTIL`（`src/utils/canvas_utils.ts`）：`drawRoundedRect` / `createGradient` / `measureTextWidth` / `hexToRgba`。
- `TEMPLATE_UTIL`（`src/utils/template_utils.ts`）：`drawPageNumber` / `getNoiseTexture` / `getPaperTexture`。

### getTextStyles（文本样式）

返回 `TextStyle`，可指定颜色与字体（字体为后加能力）：

```ts
interface TextStyle {
    textColor: string;
    highlightColor?: string;   // ==高亮== 背景色
    codeBgColor?: string;      // 行内代码背景色
    fontFamily?: string;       // 覆盖字体
    fontWeight?: string;       // 覆盖字重
    fontStyle?: string;        // 覆盖字形（italic 等）
}
```

优先级：`segment` 内联样式 > `getTextStyles` > `config` 全局值。

### 新增模板步骤

1. 建 `src/templates/{Name}.ts`，实现 `Template`，`name` = 模板 id：
   ```ts
   import type { TemplateConfig, TextSegment } from "../types";
   import { TEMPLATE_UTIL } from "../utils/template_utils";
   import type { Template, TextStyle } from "./type";

   export class Blank implements Template {
       name = 'blank';
       drawForeground(ctx, width, height, index, totalCount, config) {
           TEMPLATE_UTIL.drawPageNumber(ctx, width, height, index, totalCount, config);
       }
       getTextStyles(segment, config): TextStyle {
           return { textColor: config.textColor || '#1A1A1A' };
       }
   }
   ```
2. 在 `src/core/TemplateDefinitions.ts` 的 `templateClasses` 数组加入该类（`name` 会被作为 `styleMap` 的 key，重复会告警）。
3. 建 `public/templates/{id}.json`（提供基础 `config`）。
4. 在 `public/templates/index.json` 注册该 id（决定显示顺序）。

## 开发方式

```bash
npm install        # 安装依赖（Vite + Tailwind v4 + TypeScript）
npm run dev        # 开发服务器，访问 /editor.html、/、/rich-blocks.html
npm run typecheck  # tsc --noEmit（strict）类型检查
npm run build      # tsc 类型检查 + vite build → dist/
npm run preview    # 本地预览构建产物
```

约定：

- 源码只改 `src/*.ts`；`public/` 仅放静态资源，构建时原样复制。
- 所有模块使用 `export`/`import`（类型用 `import type`）；新增 `.ts` 文件无需再手动改 HTML 脚本顺序。
- 样式迁移：新代码用 Tailwind 工具类；`public/css/*.css` 在页面迁移完成前保留。

## 布署方式

项目是纯静态站点，构建产物在 `dist/`，任何静态托管平台均可部署：

```bash
npm install && npm run build   # 产出 dist/
```

- **Vercel / Netlify / Cloudflare Pages / GitHub Pages**：构建命令 `npm run build`，发布目录 `dist`。
- **Nginx / Caddy / 任意静态服务器**：直接服务 `dist/` 目录即可。
- 无运行时后端，无需环境变量或服务端配置。

> `public/` 内的 `robots.txt`、`sitemap.xml`、站点验证文件需保留在站点根（构建后即位于 `dist/` 根）。
