/**
 * 数据访问层 —— 站点唯一的“数据契约”实现处。
 *
 * 契约（src/data/*.json，字段全部可缺失）：
 *   site.json      { title, tagline, stats:{videos,hours,entities,events,glossary}, updatedAt }
 *   people.json    [{ id, name, aliases[], type, summary, tags[], sources[], videoRefs[] }]
 *   theories.json  [{ id, name, aliases[], summary, detail, evidence[{videoId,t}], sources[] }]
 *   events.json    [{ id, date, title, summary, people[], sources[], videoRefs[] }]
 *   glossary.json  [{ id, term, definition, aliases[], sources[] }]
 *   videos.json    [{ id, title, series, duration, date?, bilibili?, thumb?, summary, tags[],
 *                      relpath?, meta?, scenes:[{t0,t1,visual,dialogue,audio,ocr,people[]}] }]
 *   graph.json     { nodes:[{id,label,type}], links:[{source,target,type}] }
 *
 * 所有读取都经过空值归一化，页面渲染不需要再做判空。
 */
import eventsJson from '../data/events.json';
import glossaryJson from '../data/glossary.json';
import graphJson from '../data/graph.json';
import peopleJson from '../data/people.json';
import siteJson from '../data/site.json';
import textbookJson from '../data/textbook.json';
import theoriesJson from '../data/theories.json';
import videosJson from '../data/videos.json';

export type SourceRef = string | { title?: string; url?: string; note?: string; label?: string };

export interface Person {
  id: string;
  name?: string;
  aliases?: string[];
  type?: string;
  summary?: string;
  tags?: string[];
  sources?: SourceRef[];
  videoRefs?: string[];
}
export interface Evidence { videoId?: string; t?: number; note?: string }
export interface Theory {
  id: string;
  name?: string;
  aliases?: string[];
  summary?: string;
  detail?: string;
  evidence?: Evidence[];
  sources?: SourceRef[];
}
export interface EventItem {
  id: string;
  date?: string;
  title?: string;
  summary?: string;
  people?: string[];
  sources?: SourceRef[];
  videoRefs?: string[];
}
export interface GlossaryItem {
  id: string;
  term?: string;
  definition?: string;
  aliases?: string[];
  sources?: SourceRef[];
}
export interface Scene {
  t0?: number;
  t1?: number;
  visual?: string;
  action?: string;
  dialogue?: string;
  audio?: string;
  ocr?: string;
  mood?: string;
  people?: string[];
  keyframes?: string[];
}
export interface Video {
  id: string;
  title?: string;
  series?: string;
  duration?: number;
  date?: string;
  bilibili?: string;
  thumb?: string;
  summary?: string;
  tags?: string[];
  relpath?: string;
  meta?: { width?: number; height?: number; vcodec?: string; acodec?: string };
  scenes?: Scene[];
}
export interface GraphNode { id: string; label?: string; type?: string }
export interface GraphLink { source: string; target: string; type?: string }
export interface SiteInfo {
  title?: string;
  tagline?: string;
  description?: string;
  stats?: { videos?: number; hours?: number; entities?: number; events?: number; glossary?: number };
  sources?: SourceRef[];
  updatedAt?: string;
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() ? v : fallback);

/* ------------------------------------------------------------------ */
/* 站点                                                                */
/* ------------------------------------------------------------------ */
export const site: SiteInfo = (siteJson ?? {}) as SiteInfo;
export const siteTitle = str(site.title, '李文亚 Wiki');
export const siteTagline = str(site.tagline, '文亚宇宙知识库');
export const stats = {
  videos: site.stats?.videos ?? 0,
  hours: site.stats?.hours ?? 0,
  entities: site.stats?.entities ?? 0,
  events: site.stats?.events ?? 0,
  glossary: site.stats?.glossary ?? 0,
};
export const updatedAt = str(site.updatedAt, '—');

/* ------------------------------------------------------------------ */
/* 集合（过滤掉缺少 id 的脏数据，保证列表页不会崩）                     */
/* ------------------------------------------------------------------ */
export const people: Person[] = arr<Person>(peopleJson).filter((x) => x && str(x.id));
export const theories: Theory[] = arr<Theory>(theoriesJson).filter((x) => x && str(x.id));
export const events: EventItem[] = arr<EventItem>(eventsJson).filter((x) => x && str(x.id));
export const glossary: GlossaryItem[] = arr<GlossaryItem>(glossaryJson).filter((x) => x && str(x.id));
export const videos: Video[] = arr<Video>(videosJson).filter((x) => x && str(x.id));
export const graph: { nodes: GraphNode[]; links: GraphLink[] } = {
  nodes: arr<GraphNode>((graphJson as any)?.nodes),
  links: arr<GraphLink>((graphJson as any)?.links),
};

export const videoById = new Map(videos.map((v) => [v.id, v]));
export const personById = new Map(people.map((p) => [p.id, p]));
export const theoryById = new Map(theories.map((t) => [t.id, t]));

/** 教科书级讲解（按理论名索引，可选） */
export interface TextbookSection { h?: string; p?: string[]; list?: string[]; table?: { a?: string; b?: string; c?: string }[] }
export interface Textbook {
  intro?: string;
  sections?: TextbookSection[];
  formulas?: { tex?: string; note?: string }[];
  model3d?: { kind?: string; caption?: string };
}
const textbookMap = (textbookJson ?? {}) as Record<string, Textbook>;
export function textbookOfTheory(id: string): Textbook | undefined {
  return textbookMap[id];
}
export const eventById = new Map(events.map((e) => [e.id, e]));
export const glossaryById = new Map(glossary.map((g) => [g.id, g]));

export const getVideo = (id?: string): Video | undefined => (id ? videoById.get(id) : undefined);
export const getPerson = (id?: string): Person | undefined => (id ? personById.get(id) : undefined);

export const videoTitle = (v?: Video): string => (v ? str(v.title, '视频 ' + v.id) : '未知视频');
export const personName = (id?: string): string => (id ? str(personById.get(id)?.name, id) : '—');

/* ------------------------------------------------------------------ */
/* 格式化                                                              */
/* ------------------------------------------------------------------ */
export function formatDuration(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds <= 0) return '时长未知';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + ' 小时 ' + m + ' 分';
  if (m > 0) return m + ' 分 ' + String(sec).padStart(2, '0') + ' 秒';
  return sec + ' 秒';
}

export function formatClock(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
}

export function formatTimecode(t?: number | null): string {
  if (typeof t !== 'number' || !isFinite(t) || t < 0) return '--:--';
  const s = Math.floor(t);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export function formatNumber(n?: number | null): string {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('zh-CN');
}

export function formatDateLabel(date?: string): string {
  if (!date) return '时间待考';
  const m = String(date).match(/^(\d{4})[-年]?(\d{1,2})?[-月]?(\d{1,2})?/);
  if (!m) return String(date);
  const [, y, mo, d] = m;
  if (!mo) return y + ' 年';
  const month = String(Number(mo));
  if (!d) return y + ' 年 ' + month + ' 月';
  return y + ' 年 ' + month + ' 月 ' + String(Number(d)) + ' 日';
}

export function eventYear(date?: string): string {
  const m = String(date ?? '').match(/(\d{4})/);
  return m ? m[1] : '年份待考';
}
export function eventMonth(date?: string): string {
  const m = String(date ?? '').match(/\d{4}[-年](\d{1,2})/);
  return m ? String(Number(m[1])).padStart(2, '0') + ' 月' : '';
}

/** 视频标题：去掉 “0001_” 前缀与 “_2025年10月” 后缀，返回可读标题与日期标签 */
export function titleParts(v: Video): { index: string; main: string; dateLabel: string } {
  const raw = str(v.title, '视频 ' + v.id);
  const m = raw.match(/^(\d{3,4})_(.*?)(?:_(\d{4}年\d{1,2}月))?$/);
  if (!m) return { index: String(v.id), main: raw, dateLabel: str(v.date, '') };
  return { index: m[1], main: m[2] || raw, dateLabel: str(v.date, m[3] ?? '') };
}

/* ------------------------------------------------------------------ */
/* 来源                                                                */
/* ------------------------------------------------------------------ */
export interface ResolvedSource { label: string; href?: string; external: boolean; note?: string }

export function resolveSource(src: SourceRef | null | undefined): ResolvedSource {
  if (!src) return { label: '未标注来源', external: false };
  if (typeof src === 'string') {
    const external = /^https?:\/\//.test(src);
    return { label: external ? src.replace(/^https?:\/\//, '').replace(/\/$/, '') : src, href: src, external };
  }
  const url = str(src.url);
  const label = str(src.title) || str(src.label) || url || '未命名来源';
  return { label, href: url || undefined, external: /^https?:\/\//.test(url), note: src.note };
}

export function resolveSources(list?: SourceRef[] | null): ResolvedSource[] {
  return arr<SourceRef>(list).map(resolveSource);
}

/* ------------------------------------------------------------------ */
/* 派生数据                                                            */
/* ------------------------------------------------------------------ */
export function allTags(limit = 0): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of videos) for (const t of arr<string>(v.tags)) map.set(t, (map.get(t) ?? 0) + 1);
  const list = [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return limit > 0 ? list.slice(0, limit) : list;
}

export function seriesList(): { name: string; count: number; hours: number }[] {
  const map = new Map<string, { count: number; seconds: number }>();
  for (const v of videos) {
    const key = str(v.series, '未归类');
    const cur = map.get(key) ?? { count: 0, seconds: 0 };
    cur.count += 1;
    cur.seconds += typeof v.duration === 'number' ? v.duration : 0;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, count: v.count, hours: Math.round((v.seconds / 3600) * 10) / 10 }))
    .sort((a, b) => b.count - a.count);
}

/** 首页精选：优先挑有场景卡 / 有缩略图 / 有摘要的视频 */
export function featuredVideos(n = 6): Video[] {
  const scored = videos.map((v, i) => {
    let score = 0;
    if (arr(v.scenes).length) score += 4;
    if (v.thumb) score += 3;
    if (typeof v.duration === 'number' && v.duration > 600) score += 2;
    if (v.summary) score += 1;
    if (v.bilibili) score += 2;
    return { v, score, i };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, n)
    .map((x) => x.v);
}

export function latestEvents(n = 4): EventItem[] {
  return [...events].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))).slice(0, n);
}

export function eventsByYear(): { year: string; items: EventItem[] }[] {
  const map = new Map<string, EventItem[]>();
  for (const e of [...events].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))) {
    const y = eventYear(e.date);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }));
}

export function videosOfPerson(id: string): Video[] {
  return arr<string>(personById.get(id)?.videoRefs)
    .map((vid) => videoById.get(vid))
    .filter((v): v is Video => Boolean(v));
}

export function videosOfTheory(id: string): Video[] {
  return arr<Evidence>(theoryById.get(id)?.evidence)
    .map((e) => (e.videoId ? videoById.get(e.videoId) : undefined))
    .filter((v): v is Video => Boolean(v));
}

export function eventsOfPerson(id: string): EventItem[] {
  return events.filter((e) => arr<string>(e.people).includes(id));
}

export function theoriesOfVideo(v: Video): Theory[] {
  return theories.filter((t) => arr<Evidence>(t.evidence).some((e) => e.videoId === v.id));
}

export function peopleOfVideo(v: Video): Person[] {
  const ids = new Set<string>();
  for (const s of arr<Scene>(v.scenes)) for (const p of arr<string>(s.people)) ids.add(p);
  for (const p of people) if (arr<string>(p.videoRefs).includes(v.id)) ids.add(p.id);
  return [...ids].map((id) => personById.get(id)).filter((p): p is Person => Boolean(p));
}

export function sameSeries(v: Video, n = 4): Video[] {
  const s = str(v.series);
  if (!s) return [];
  return videos.filter((x) => x.id !== v.id && str(x.series) === s).slice(0, n);
}

export function neighbors(v: Video): { prev?: Video; next?: Video } {
  const idx = videos.findIndex((x) => x.id === v.id);
  if (idx < 0) return {};
  return { prev: idx > 0 ? videos[idx - 1] : undefined, next: idx < videos.length - 1 ? videos[idx + 1] : undefined };
}

export function graphNeighbors(id: string): { node: GraphNode; type: string; direction: 'in' | 'out' }[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out: { node: GraphNode; type: string; direction: 'in' | 'out' }[] = [];
  for (const l of graph.links) {
    if (l.source === id && byId.has(l.target)) out.push({ node: byId.get(l.target)!, type: str(l.type, 'related'), direction: 'out' });
    else if (l.target === id && byId.has(l.source)) out.push({ node: byId.get(l.source)!, type: str(l.type, 'related'), direction: 'in' });
  }
  return out;
}

export const typeLabel: Record<string, string> = {
  person: '人物',
  theory: '理论',
  event: '事件',
  glossary: '词条',
  org: '组织',
  place: '地点',
  work: '作品',
};

export function entityHref(type: string | undefined, id: string): string {
  switch (type) {
    case 'person':
      return '/people/' + id;
    case 'theory':
      return '/theories/' + id;
    case 'glossary':
      return '/glossary#' + id;
    case 'event':
      return '/timeline#' + id;
    default:
      return '/search?q=' + encodeURIComponent(id);
  }
}

/** 搜索/筛选用的精简索引（客户端脚本使用，避免把整份 videos.json 塞进页面） */
export function slimVideos() {
  return videos.map((v) => {
    const t = titleParts(v);
    return {
      id: v.id,
      t: t.main,
      n: t.index,
      s: str(v.series, ''),
      d: typeof v.duration === 'number' ? Math.round(v.duration) : null,
      y: t.dateLabel,
      g: arr<string>(v.tags).slice(0, 4),
      b: v.bilibili ? 1 : 0,
      c: arr(v.scenes).length,
      x: str(v.summary).slice(0, 90),
    };
  });
}
