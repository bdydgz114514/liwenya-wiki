import type { APIRoute } from 'astro';
import { novelChapters, people, siteConfig, theories, updatedAt, videos } from '../lib/data';

/**
 * 构建期生成的站点地图：/sitemap.xml
 *
 * 收录策略（2026-10 修订）：
 *   · 收录：首页、各板块首页、novel 全部章节（30 章正文，站内最厚的内容）、people 全部条目、theories 全部条目
 *   · 不收录：videos —— 视频库未公开（siteConfig.videoLibraryLive=false），详情页带 noindex，收进来是自相矛盾
 *   · 不再收录：# 锚点 URL —— timeline#event:xxx / glossary#term:xxx 会被搜索引擎折叠成同一个页面，
 *     在 sitemap 里重复列出属于噪声，且其中一条锚点含隐私替换文本（「[已隐去健康信息]」），不宜外露
 */
export const GET: APIRoute = ({ site }) => {
  const origin = site ? site.origin : '';
  const lastmod = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(updatedAt || '');
    return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
  })();

  /** 板块首页 + 栏目页 */
  const pages: string[] = [
    '/',
    '/people',
    '/theories',
    '/timeline',
    '/glossary',
    '/novel',
    '/film',
    '/kb',
    '/videos',
    '/sources',
    '/about',
  ];

  const urls: string[] = [
    ...pages,
    ...novelChapters.map((c) => '/novel/' + c.id),
    ...people.map((p) => '/people/' + p.id),
    ...theories.map((t) => '/theories/' + t.id),
    ...(siteConfig.videoLibraryLive ? videos.map((v) => '/videos/' + v.id) : []),
  ];

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // 章节与条目页用数据版本日期，其余页不给 lastmod（避免全站同一个假日期）
  const dated = new Set<string>([
    ...novelChapters.map((c) => '/novel/' + c.id),
  ]);

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => {
        const lm = lastmod && dated.has(u) ? `\n    <lastmod>${lastmod}</lastmod>` : '';
        return `  <url>\n    <loc>${esc(origin + u)}</loc>${lm}\n  </url>`;
      })
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
