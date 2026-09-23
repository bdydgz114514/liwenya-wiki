import type { APIRoute } from 'astro';
import { events, glossary, people, theories, videos } from '../lib/data';

/** 构建期生成的站点地图：/sitemap.xml */
export const GET: APIRoute = ({ site }) => {
  const origin = site ? site.origin : '';
  const urls = [
    '/',
    '/people',
    '/theories',
    '/timeline',
    '/glossary',
    '/videos',
    '/sources',
    '/about',
    '/search',
    ...people.map((p) => '/people/' + p.id),
    ...theories.map((t) => '/theories/' + t.id),
    ...videos.map((v) => '/videos/' + v.id),
    ...events.map((e) => '/timeline#' + e.id),
    ...glossary.map((g) => '/glossary#' + g.id),
  ];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + origin + u + '</loc></url>').join('\n') +
    '\n</urlset>\n';
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
