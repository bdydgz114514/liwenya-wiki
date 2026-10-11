import type { APIRoute } from 'astro';
import { siteConfig } from '../lib/data';

/**
 * 构建期生成的 /robots.txt（替换原 public/robots.txt 静态文件）。
 *
 * 为什么改成生成：静态文件里的 Sitemap 只好写死一个域名，换主站（GitHub Pages ↔ 帽子云 ↔ 自有域名）
 * 就必然漏改，而 robots 里的 Sitemap 前缀一旦不对，等于没告诉搜索引擎 sitemap 在哪。
 * 这里用 Astro 解析好的 site（即 astro.config.mjs 的 SITE_URL 环境变量或默认值），
 * 与 canonical / sitemap.xml 三处永远一致，只需维护一个域名。
 */
export const GET: APIRoute = ({ site }) => {
  const origin = site ? site.origin : '';

  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# 视频库未公开期间，详情页不进站内搜索索引（Pagefind），',
    '# 但本文件不额外封禁：视频页对搜索引擎是开放的，只是当前没有入口。',
    ...(siteConfig.videoLibraryLive ? [] : ['# 详见 /about 的板块开关说明。']),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
