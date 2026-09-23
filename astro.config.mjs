// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// 纯静态站点：不在构建期访问网络，所有内容来自 src/data/*.json
export default defineConfig({
  // 部署域名可通过环境变量覆盖（如帽子云/自有域名），默认保持 GitHub Pages 地址
  site: process.env.SITE_URL || 'https://bdydgz114514.github.io',
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
