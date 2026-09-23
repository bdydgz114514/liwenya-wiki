# 李文亚 Wiki · 静态站点（site/）

> 仿 **amd.com** 视觉语言的深色科技风百科站点：超大 hero 标题、参数式数据条、卡片网格、
> 深色底 + 高饱和朱红强调色。内容为**纯静态生成**，构建期只读取 `src/data/*.json`，
> **不访问网络、不查询数据库**。

---

## 1. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | **Astro 5**（`output: 'static'`） | 零客户端框架运行时；1224 个页面约 2.5s 构建完成 |
| 样式 | **Tailwind CSS v4** + `@tailwindcss/vite` | 设计令牌写在 `src/styles/global.css` 的 `@theme` 中，组件类用 `@layer components` |
| 搜索 | **Pagefind**（构建后索引）+ **本地 JSON 兜底** | 见 `scripts/postbuild.mjs` 与 `src/pages/search-index.json.ts` |
| 交互 | 原生 JS（Astro 打包） | 滚动出现动画用 IntersectionObserver；无 React/Vue、无 UI 库 |
| 字体 | 系统字体栈 | `system-ui / PingFang SC / Microsoft YaHei / Source Han Sans SC…`，**不依赖任何外网字体 CDN** |
| 运行时 | Node 22 + npm（registry.npmmirror.com） | 仅构建期需要；产物为纯静态文件 |

设计要点（对齐 AMD 官网语言）：

- 背景 `#0b0b0f / #111318`，正文高对比白字 `#f5f6f8`，行高 1.7；
- 强调色朱红 `#E23A2E`（hover 用 `#ff5a3c`）；
- hero 标题 `clamp(2.6rem, 7.4vw, 6rem)`，收紧字距 `-0.035em`；
- 参数面板 `.spec-bar`：`1193 视频 / 168.6 小时 / 实体数 / 事件数 / 词条数`；
- 卡片圆角 12–16px（`--radius-card: 14px`），hover 抬升 + 描边高亮 + 红色辉光；
- 顶部固定导航（滚动后加深 + 进度条）、移动端抽屉菜单、克制网格纹理与径向渐变。

---

## 2. 目录结构

```text
site/
├── astro.config.mjs          # Astro 配置（静态输出 + Tailwind v4 vite 插件 + site 域名）
├── package.json              # 脚本：dev / build / preview / data:mock
├── tsconfig.json             # 严格模式 + @/* 路径别名
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── img/thumb-sample.svg  # 视频缩略图占位（示例）
├── scripts/
│   ├── gen-mock-data.mjs     # 【开发期可选】从知识库导出示例数据 → src/data/videos.json
│   └── postbuild.mjs         # 构建后：生成 Pagefind 索引 + 打印 dist 统计（失败不影响退出码）
└── src/
    ├── data/                 # ★ 唯一数据源（数据契约见第 4 节）
    │   ├── site.json  people.json  theories.json  events.json
    │   ├── glossary.json  videos.json  graph.json
    ├── lib/
    │   ├── data.ts           # 数据访问层：类型、判空归一化、格式化、派生查询
    │   └── pinyin.ts         # 梗词典首字母筛选用的极简拼音首字母表
    ├── styles/global.css     # 设计系统（令牌 / 组件类 / 动画 / Pagefind 深色主题适配）
    ├── layouts/BaseLayout.astro   # <head>、导航、页脚、滚动进度、抽屉、reveal 动画
    ├── components/
    │   ├── SiteHeader.astro  SiteFooter.astro
    │   ├── PageHero.astro     # 内页 hero（eyebrow + 大标题 + meta）
    │   ├── SectionHeading.astro  StatBar.astro  EmptyState.astro
    │   ├── VideoCard.astro    # 视频卡（缩略图占位 / 系列 / 时长 / 标签）
    │   ├── TimelineList.astro # 事件时间线（按年或按月）
    │   ├── SceneTimeline.astro# 逐场景理解结果（画面/台词/声音/画面文字/人物）
    │   └── SourceList.astro   # 来源与出处
    └── pages/
        ├── index.astro                 # /            首页
        ├── people/index.astro          # /people      人物志
        ├── people/[id].astro           # /people/:id  人物详情
        ├── theories/index.astro        # /theories    理论体系
        ├── theories/[id].astro         # /theories/:id
        ├── timeline.astro              # /timeline    事件年表（按年份分组）
        ├── glossary.astro              # /glossary    梗词典（搜索 + 首字母筛选）
        ├── videos/index.astro          # /videos      视频库（搜索 + 系列/标签筛选 + 加载更多）
        ├── videos/[id].astro           # /videos/:id  视频详情（摘要 + 逐场景时间轴 + 来源路径）
        ├── sources.astro               # /sources     来源与参考
        ├── about.astro                 # /about       方法论 / 免责 / 隐私
        ├── search.astro                # /search      本地索引 + Pagefind 全文检索
        ├── search-index.json.ts        # /search-index.json（构建期生成的兜底索引）
        ├── sitemap.xml.ts              # /sitemap.xml
        └── 404.astro
```

---

## 3. 开发 / 构建 / 预览

```bash
cd /root/dsh/liwenya-kb/site

npm install          # 依赖安装（npm 已配置 registry.npmmirror.com）

npm run dev          # 开发服务器 http://localhost:4321
npm run build        # ① astro build 产出 dist/ ② postbuild 生成 Pagefind 索引
npm run preview      # 预览产物：http://127.0.0.1:4321
npm run data:mock    # 【可选】从知识库 index.sqlite 重新生成示例 videos.json
```

预览命令（验收用，已实测可启动）：

```bash
cd /root/dsh/liwenya-kb/site && npm run preview
# → http://127.0.0.1:4321
```

构建产物：

- `dist/` —— 约 1224 个 HTML + 静态资源，`npm run build` 全流程约 5 秒；
- `dist/pagefind/` —— Pagefind 全文索引与 UI（构建后由 `scripts/postbuild.mjs` 生成）；
- `dist/search-index.json` —— 本地兜底搜索索引（`/search` 页面默认使用它，中文子串匹配）。

> Pagefind 安装/执行失败时，`postbuild.mjs` 只打印警告并保持退出码 0，站点仍可正常构建；
> `/search` 会自动检测 `/pagefind/pagefind-ui.js` 是否可用，不可用时展示提示并继续使用本地 JSON 索引。

---

## 4. 数据契约（`src/data/*.json`）

**所有字段都可能缺失**；`src/lib/data.ts` 做了统一判空，页面渲染不需要再判空。
若某条记录连 `id` 都没有，会被列表页安全过滤掉；空集合会渲染 `EmptyState` 而不是报错。

```jsonc
// site.json
{ "title": "李文亚 Wiki", "tagline": "…", "stats": { "videos": 1193, "hours": 168.6,
  "entities": 21, "events": 13, "glossary": 18 }, "updatedAt": "2026-09-22",
  "sources": [{ "title": "wiki.liwenya.com", "url": "https://wiki.liwenya.com" }] }

// people.json
[{ "id": "liwenya", "name": "李文亚", "aliases": ["李文亚教授"], "type": "人物 · 主要记录对象",
   "summary": "…", "tags": ["民间科学爱好者"], "sources": [ … ], "videoRefs": ["1", "6"] }]

// theories.json
[{ "id": "heiti-shengwu", "name": "黑体生物理论", "aliases": [], "summary": "…", "detail": "…",
   "evidence": [{ "videoId": "812", "t": 45 }], "sources": [ … ] }]

// events.json
[{ "id": "ev-2024-12-overthrow-series", "date": "2024-12", "title": "「推翻」系列集中发布",
   "summary": "…", "people": ["liwenya"], "sources": [ … ], "videoRefs": ["5", "6"] }]

// glossary.json
[{ "id": "hualliao", "term": "话疗", "definition": "…", "aliases": [], "sources": [ … ] }]

// videos.json
[{ "id": "1017", "title": "1017_对我腿部皮肤黑体或白体生物研究_2026年3月",
   "series": "核心视频本体", "duration": 512.3, "date": "2026年3月",
   "bilibili": "BV1i3SeB2Epb", "thumb": "/img/thumb-sample.svg", "summary": "…",
   "tags": ["黑体生物"], "relpath": "核心视频本体/1017_….mkv",
   "meta": { "width": 1920, "height": 1080, "vcodec": "av1", "acodec": "opus" },
   "scenes": [{ "t0": 0, "t1": 12.5, "visual": "…", "action": "…", "dialogue": "…",
                "audio": "…", "ocr": "…", "mood": "…", "people": ["liwenya"],
                "keyframes": ["s000_00004.89.jpg"] }] }]

// graph.json
{ "nodes": [{ "id": "liwenya", "label": "李文亚", "type": "person" }],
  "links": [{ "source": "liwenya", "target": "heiti-shengwu", "type": "proposes" }] }
```

约定与容错：

| 约定 | 说明 |
|---|---|
| `id` | 视频 `id` 建议直接使用知识库 `asset.id`（字符串形式），便于 `videoRefs` / `evidence.videoId` 一一对应 |
| `sources` | 支持字符串或 `{ title, url, note }` 两种写法；外链自动加 `target=_blank rel="noopener nofollow"` |
| `date` | 支持 `2026-03` / `2026年3月` / `2026-03-15`，时间线按年分组、按月排序 |
| `duration` | 秒（number）；缺失时显示「时长未知」 |
| `scenes` | 缺失或空数组 → 详情页渲染空状态说明，不影响其余区块 |
| `thumb` | 缺失时用 CSS 生成的占位块（编号 + 播放按钮 + 网格纹理），不请求任何外部图片 |
| `evidence[].t` | 秒（number），渲染为 `HH:MM:SS`，链接形如 `/videos/1017?t=5`（打开后自动定位并高亮该场景） |
| `graph.json` | 用于人物/理论详情页的「关系图」区块；节点 `type` 支持 person / theory / event / glossary |

### 已覆盖的缺失场景（示例数据里刻意保留）

`videos.json`（1193 条）中 70 条无 `duration`、170 条无 `summary`、108 条无 `tags`、91 条无 `series`、
859 条无 `scenes`（其余 334 条含场景卡）；场景卡内部也随机缺失 `visual / dialogue / audio / ocr / people`。
`people.json` 中「王伟恒」缺 `aliases`/`tags`，`theories.json` 中「银河系的结构与观测」缺 `aliases`/`evidence`/`sources`。
以上均可正常构建与渲染。

---

## 5. 如何替换为真实数据

1. **只替换 JSON，不动代码**：把流水线导出的 7 个文件覆盖到 `src/data/`，字段名遵循第 4 节契约即可。
2. 视频 `id` 建议用知识库 `asset.id`；`people[].videoRefs`、`theories[].evidence[].videoId`、
   `events[].videoRefs` 都引用同一套 id。
3. 更新 `site.json.stats`（首页数据条与多处计数直接读它）与 `updatedAt`。
4. `site.json.sources` 会渲染到页脚「参考来源」；条目级来源写在各自的 `sources` 字段。
5. 重新构建：`npm run build`（视频详情页与搜索索引都会自动重建）。
6. 部署前把 `astro.config.mjs` 里的 `site` 改成真实域名（影响 canonical 与 `sitemap.xml`）。
7. 示例数据可随时用 `npm run data:mock` 从 `../data/index.sqlite` 重新生成（只读，不写库）。

> `scripts/gen-mock-data.mjs` 是**开发期工具**：它读取 `/root/dsh/liwenya-kb/data/index.sqlite`
> 的真实资产元数据（1193 条标题/系列/时长），并为已有转写、场景、视觉理解结果的视频生成示例场景卡，
> 其余为模板占位文本。**构建流程不依赖它**，也不会在构建期访问数据库或网络。

---

## 6. 页面清单

| 路由 | 内容 |
|---|---|
| `/` | hero（超大标题 + 归档概览参数卡）+ 数据条（1193 / 168.6h / 实体 / 事件 / 词条）+ 六个导航卡片 + 精选视频 + 最新事件 + 系列分布 + 免责 CTA |
| `/people` `/people/:id` | 人物志分组列表；详情含摘要、别名、关联视频、相关事件、关系图、来源、引用格式 |
| `/theories` `/theories/:id` | 理论卡片列表（含「教科书级讲解 + 3D」标识）；详情为**两段式栅格**：概述 / 详细整理 ｜ 关系图 → **教科书级讲解（全宽，含 3D 模型演示）** → 证据锚点 / 相关视频 ｜ 来源与出处 / 其他理论 |
| `/timeline` | 按年份分组的事件年表（年份锚点导航 + 月级时间线 + 视频/来源芯片） |
| `/glossary` | 梗词典：关键词搜索 + A–Z 首字母筛选 + 来源链接 |
| `/videos` `/videos/:id` | 视频库：关键词 / 系列 / 标签 / 排序 + 加载更多；详情含摘要、逐场景理解结果时间轴、元数据、来源路径（可复制）、同系列与前后导航 |
| `/sources` | 外部参考 wiki、B 站、L0–L7 采集与理解流程、归档构成、引用规范与免责 |
| `/about` | 方法论（可溯源 / 中立转述 / 分层理解 / 隐私优先）、免责声明、隐私声明、技术栈 |
| `/search` | 本地 JSON 索引即时搜索（类型筛选、中文子串）+ Pagefind 全文检索（含 Series / Type 过滤器） |
| `/404`、`/sitemap.xml`、`/search-index.json` | 错误页、站点地图、搜索索引 |

---

## 7. 教科书级讲解与 3D 模型演示

| 项 | 说明 |
|---|---|
| 数据 | `src/data/textbook.json`（由 `../kb/export/textbook.json` 同步，生成脚本 `../scripts/gen_textbook_p1.py`、`gen_textbook_p2.py`、`gen_textbook_p3.py`） |
| 结构 | 每个理论一个条目：`intro` + `sections[{h, p[], list[], table[{a,b,c}]}]` + `formulas[{tex,note}]` + `model3d{kind,caption}` |
| 渲染 | `src/components/TheoryTextbook.astro`（分节卡片 + 三列对照表 + 公式块），插在「关系图」与「来源与出处」之间，桌面端为跨两列的全宽 band（`lg:col-span-2 lg:row-start-2`） |
| 3D | `src/components/TheoryModel3D.astro`（three.js + OrbitControls，按 `kind` 分发场景：`triple_shell` / `particle_flow` / `earth_trapezoid` / `sun_scale` / `energy_law` / `microbe_body` / `leaf_stomata` / `math_surface`），独立懒加载 chunk（约 550 KB），不依赖 CDN |
| 写作口径 | 主张陈述与主流科学结论逐条对照（三列表格）、附「可检验性判据」与「本站不作真实性背书」的中立声明；健康类条目附风险提示 |

> 排版注意：右栏含长 URL（来源列表）时必须给轨道加 `minmax(0, …)` 并给链接加 `min-w-0 break-all`，否则长链接会把网格列撑爆（详见 `../docs/LESSONS.md` 第 33 条）。

---

## 8. 声明

站点内容为爱好者档案整理，**非官方、非营利**，与当事人无隶属关系；视频中的主张与指控按
「当事人陈述」记录并标注出处，不构成事实认定。隐私声明：不收录住址、联系方式、证件、健康与医疗等私密信息。
详见 `/about` 与 `/sources` 页面。
