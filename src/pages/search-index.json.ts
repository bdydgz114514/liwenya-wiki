import type { APIRoute } from 'astro';
import {
  events,
  formatDuration,
  glossary,
  novelChapters,
  people,
  theories,
  titleParts,
  videos,
} from '../lib/data';

/**
 * 构建期生成的本地搜索索引（Pagefind 不可用时的兜底）。
 * 输出：/search-index.json
 */
export const GET: APIRoute = () => {
  const items = [
    ...videos.map((v) => {
      const t = titleParts(v);
      return {
        title: t.main,
        url: '/videos/' + v.id,
        type: '视频',
        desc: v.summary ?? '',
        meta: ['#' + v.id, v.series ?? '未归类', formatDuration(v.duration), t.dateLabel].filter(Boolean).join(' · '),
      };
    }),
    ...people.map((p) => ({
      title: p.name ?? p.id,
      url: '/people/' + p.id,
      type: '人物',
      desc: p.summary ?? '',
      meta: [p.type ?? '', (p.aliases ?? []).join(' / ')].filter(Boolean).join(' · '),
    })),
    ...theories.map((t) => ({
      title: t.name ?? t.id,
      url: '/theories/' + t.id,
      type: '理论',
      desc: t.summary ?? '',
      meta: [(t.aliases ?? []).join(' / '), (t.evidence ?? []).length + ' 处证据'].filter(Boolean).join(' · '),
    })),
    ...events.map((e) => ({
      title: e.title ?? e.id,
      url: '/timeline#' + e.id,
      type: '事件',
      desc: e.summary ?? '',
      meta: e.date ?? '',
    })),
    ...glossary.map((g) => ({
      title: g.term ?? g.id,
      url: '/glossary#' + g.id,
      type: '词条',
      desc: g.definition ?? '',
      meta: (g.aliases ?? []).join(' / '),
    })),
    ...novelChapters.map((c) => ({
      title: '第' + c.no + '章　' + (c.title ?? ''),
      url: '/novel/' + c.id,
      type: '传记',
      desc: c.epigraph ?? '',
      meta: ['卷' + (c.volume ?? 1) + ' ' + (c.volumeTitle ?? ''), (c.chars ?? 0) + ' 字'].filter(Boolean).join(' · '),
    })),
  ];

  return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
