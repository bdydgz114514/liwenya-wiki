// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 纯静态站点：不在构建期访问网络，所有内容来自 src/data/*.json
//
// site（影响 canonical / sitemap / og:url）优先级：
//   1. 环境变量 SITE_URL —— 帽子云等平台的构建配置里可覆盖
//   2. 默认值 —— 当前主站是帽子云（大陆优化线路），GitHub Pages 视为镜像
// 换主站时只改这一处，或用 SITE_URL 覆盖；不要两个域名各写一份，否则两边互相竞争。
const DEFAULT_SITE = 'https://6st1svrof-liwenyawiki-3r3y2wu.maozi.io';

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
