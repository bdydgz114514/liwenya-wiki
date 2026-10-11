// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 纯静态站点：不在构建期访问网络，所有内容来自 src/data/*.json
//
// site（影响 canonical / sitemap / og:url）优先级：
//   1. 环境变量 SITE_URL —— 帽子云等平台的构建配置里可覆盖
//   2. 默认值 —— 见下方 DEFAULT_SITE 的说明
//
// DEFAULT_SITE 的选择规则：**必须指向"构建链路可靠、推送即可生效"的那个域名**。
// 当前 = GitHub Pages：本地构建 → 产物直推 bdydgz114514.github.io 仓库，推送即生效。
// 帽子云（6st1svrof-liwenyawiki-3r3y2wu.maozi.io）虽为大陆优化线路、更适合做 SEO 主站，
// 但实测不会随本仓库 push 自动重建（2026-10 验证：推送后线上仍是旧版）。
// 因此帽子云侧必须在它的构建环境变量里显式加 SITE_URL=<候选主站>，并确认已重建，
// 再把这个默认值切过去——否则两个域名会互相指认对方为 canonical（循环 canonical，比不改更糟）。
const DEFAULT_SITE = 'https://bdydgz114514.github.io';

export default defineConfig({
  site: process.env.SITE_URL || DEFAULT_SITE,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // 1193 个视频详情页，避免 chunk 警告刷屏
      chunkSizeWarningLimit: 2048,
    },
  },
  devToolbar: { enabled: false },
});
