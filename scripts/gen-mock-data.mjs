#!/usr/bin/env node
/**
 * gen-mock-data.mjs —— 示例（mock）数据生成器【开发期可选，npm run build 不需要它】
 *
 * 作用：把知识库 data/index.sqlite 中已索引的真实资产元数据（1193 个 MKV 的标题 / 系列 / 时长）
 *      导出为站点示例数据 src/data/videos.json，并为已有转写 / 场景 / 视觉理解结果的视频生成示例场景卡。
 *
 * 重要：
 *  - 真实数据由知识库流水线导出后，直接覆盖 src/data/*.json 即可，无需改站点代码；
 *  - 构建期（npm run build）不会调用本脚本，不访问网络、不访问数据库；
 *  - 没有流水线结果时，摘要 / 标签 / 场景描述均为“模板生成的占位文本”，不是事实陈述。
 *
 * 用法：node scripts/gen-mock-data.mjs [--kb=/root/dsh/liwenya-kb] [--db=...] [--data=...]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const KB = arg('kb', path.resolve(SITE, '..'));
const DB = arg('db', path.join(KB, 'data', 'index.sqlite'));
const DATA_DIR = arg('data', path.join(KB, 'data'));
const OUT = path.join(SITE, 'src', 'data');

/* 0. 确定性伪随机（保证每次生成的示例数据一致） */
function rng(seed) {
  let s = (seed * 2654435761) % 4294967296;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const round1 = (n) => Math.round(n * 10) / 10;
const safeJson = (s) => { try { return JSON.parse(s); } catch { return []; } };

/* 1. 只读导出数据库内容（失败则退化到内置种子） */
const PY = [
  'import sqlite3,json,sys',
  "con=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True)",
  'cur=con.cursor()',
  'cur.execute(sys.argv[2])',
  'print(json.dumps(cur.fetchall(),ensure_ascii=False))',
].join('\n');

function dump(sql) {
  const out = execFileSync('python3', ['-c', PY, DB, sql], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return JSON.parse(out);
}

function loadFromDb() {
  const assets = dump(
    'select id,relpath,series,title,duration,width,height,vcodec,acodec,size,asr_done,frames_done,vision_done from asset order by id'
  ).map((r) => ({
    id: String(r[0]), relpath: r[1], series: r[2], title: r[3], duration: r[4],
    width: r[5], height: r[6], vcodec: r[7], acodec: r[8], size: r[9],
    asrDone: !!r[10], framesDone: !!r[11], visionDone: !!r[12],
  }));
  const transcripts = {};
  for (const row of dump('select asset_id,start,end,text from transcript order by asset_id,start')) {
    const k = String(row[0]);
    (transcripts[k] || (transcripts[k] = [])).push({ t0: round1(row[1]), t1: round1(row[2]), text: row[3] });
  }
  const scenes = {};
  for (const row of dump('select asset_id,idx,t0,t1,keyframes from scene order by asset_id,idx')) {
    const k = String(row[0]);
    (scenes[k] || (scenes[k] = [])).push({ idx: row[1], t0: round1(row[2]), t1: round1(row[3]), frames: safeJson(row[4]) });
  }
  return { assets, transcripts, scenes };
}

function loadVision() {
  const dir = path.join(DATA_DIR, 'vision');
  const byAsset = {};
  if (!existsSync(dir)) return byAsset;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
    for (const line of readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let row; try { row = JSON.parse(line); } catch { continue; }
      const cap = typeof row.caption === 'string' ? safeJson(row.caption) : row.caption || {};
      const k = String(row.asset_id);
      (byAsset[k] || (byAsset[k] = [])).push({ t: row.t, scene: row.scene, cap });
    }
  }
  return byAsset;
}

const FALLBACK_ASSETS = [
  { id: '1', series: '核心视频本体', title: '0001_无标题_2024年11月', duration: 351.2 },
  { id: '2', series: '核心视频本体', title: '0002_科学研究_2024年11月', duration: 168.2 },
  { id: '5', series: '核心视频本体', title: '0005_推翻开普勒定律_2024年12月', duration: 640.6 },
  { id: '1186', series: '番外视频/采访系列', title: '视频采访 李文亚教授', duration: 1171.2 },
  { id: '1190', series: '番外视频/采访系列', title: '话疗李文亚：李文亚单方面通话', duration: 63.8 },
];

/* 2. 文本模板 */
const TOPIC_RULES = [
  [/万有引力/, '万有引力定律'],
  [/开普勒/, '开普勒定律'],
  [/能量守恒/, '能量守恒定律'],
  [/倾斜/, '地球的倾斜'],
  [/近日点/, '地球近日点的测定'],
  [/银河|星系|恒星/, '银河系与恒星分布'],
  [/太阳/, '太阳的东升西落'],
  [/月球/, '月球运动'],
  [/运动轨迹|星球运动|地球的运动/, '地球与星球的运动轨迹'],
  [/起源/, '星球的起源'],
  [/评论|回复/, '对网友评论的逐条回复'],
  [/写作|反动落后势力/, '写作受阻与外部干扰'],
  [/研究/, '科学研究方法'],
];
const topicOf = (title) => (TOPIC_RULES.find((pair) => pair[0].test(title)) || [null, '天体运动与自创理论'])[1];

const TAG_BANK = {
  '万有引力定律': ['万有引力', '引力', '推翻教科书', '力学'],
  '开普勒定律': ['开普勒', '行星运动', '轨道', '推翻教科书'],
  '能量守恒定律': ['能量守恒', '热力学', '推翻教科书'],
  '地球的倾斜': ['地球自转轴', '黄赤交角', '四季', '日照'],
  '地球近日点的测定': ['近日点', '天文测量', '轨道', '观测'],
  '银河系与恒星分布': ['银河系', '恒星', '星系结构', '宇宙尺度'],
  '太阳的东升西落': ['太阳', '周日视运动', '地心说', '日心说'],
  '月球运动': ['月球', '公转', '天文'],
  '地球与星球的运动轨迹': ['运动轨迹', '螺旋运动', '坐标系', '天文'],
  '星球的起源': ['星球起源', '星云', '演化', '猜想'],
  '对网友评论的逐条回复': ['评论回复', '互动', '澄清', '辩论'],
  '写作受阻与外部干扰': ['写作', '干扰', '声明'],
  '科学研究方法': ['方法论', '实验', '观测', '论证'],
  '天体运动与自创理论': ['天体运动', '自创理论', '观测', '论证'],
};

const VISUAL_BANK = [
  '固定机位室内自拍，白色墙面与张贴的手绘天文示意图',
  '录屏画面：一张手绘的地球公转轨道示意图，鼠标指针在图上移动',
  '近景特写：桌面上的纸质手稿与圆规、量角器',
  '画面为一张打印的星系结构图，镜头缓慢推近',
  '半身景：人物戴眼镜、穿深色上衣，正对镜头讲解',
  '画面切换为一页手写公式的纸张，边缘有折痕',
];
const AUDIO_BANK = ['纯人声讲解，无背景音乐', '人声讲解，伴有轻微环境噪声', '人声为主，间或翻动纸张的声音', '人声讲解，结尾出现短促提示音'];
const OCR_BANK = ['画面下方字幕条：“地球的运动轨迹”', '画面右上角叠加文字：“李文亚 理论研究”', '手稿上可见手写文字与箭头标注', ''];
const DIALOGUE_BANK = [
  '我们今天就来讲清楚这个问题，教科书上的说法是完全错误的。',
  '大家看这张图，注意地球在这个位置的时候，太阳光是怎么照射的。',
  '我用最简单的办法就能测出来，不需要他们的那些仪器。',
  '这个问题我已经研究了很长时间，结论是非常明确的。',
  '下面我逐条回应网友的评论。',
];

function makeScene(assetId, i, t0, t1, opts) {
  opts = opts || {};
  const r = rng(Number(assetId) * 97 + i * 13 + 7);
  const scene = { t0, t1 };
  if (!opts.dropVisual) scene.visual = pick(r, VISUAL_BANK);
  if (!opts.dropDialogue) scene.dialogue = pick(r, DIALOGUE_BANK);
  if (!opts.dropAudio && r() > 0.25) scene.audio = pick(r, AUDIO_BANK);
  const ocr = pick(r, OCR_BANK);
  if (!opts.dropOcr && ocr) scene.ocr = ocr;
  if (!opts.dropPeople && r() > 0.3) scene.people = ['liwenya'];
  return scene;
}

/* 3. 主流程 */
function buildVideos() {
  let assets, transcripts = {}, scenes = {};
  if (existsSync(DB)) {
    try {
      const d = loadFromDb();
      assets = d.assets; transcripts = d.transcripts; scenes = d.scenes;
      console.log('[gen-mock-data] 已从 index.sqlite 读取 ' + assets.length + ' 条资产元数据');
    } catch (err) {
      console.warn('[gen-mock-data] 读取数据库失败，使用内置种子数据：' + err.message);
      assets = FALLBACK_ASSETS;
    }
  } else {
    console.warn('[gen-mock-data] 未找到 ' + DB + '，使用内置种子数据');
    assets = FALLBACK_ASSETS;
  }
  const vision = loadVision();

  const videos = assets.map((a, index) => {
    const id = String(a.id);
    const rawTitle = a.title || '';
    const m = rawTitle.match(/^(\d{3,4})_(.*?)_(\d{4}年\d{1,2}月)$/);
    const topic = m ? m[2] : rawTitle;
    const date = m ? m[3] : undefined;
    const isExtra = (a.series || '').indexOf('番外') === 0;
    const r = rng(Number(id) || index + 1);

    const v = { id: id };
    if (rawTitle) v.title = rawTitle;
    if (a.series && Number(id) % 13 !== 0) v.series = a.series;
    if (typeof a.duration === 'number' && Number(id) % 17 !== 0) v.duration = round1(a.duration);
    if (date) v.date = date;
    if (a.relpath) v.relpath = a.relpath;
    if (a.vcodec) v.meta = { width: a.width, height: a.height, vcodec: a.vcodec, acodec: a.acodec };

    const tr = transcripts[id];
    if (Number(id) % 7 !== 0) {
      if (tr && tr.length) {
        const head = tr.map((x) => x.text).join('').replace(/\s+/g, '').slice(0, 90);
        v.summary = '转写开头节选：' + head + '……（示例数据，正式摘要由流水线生成）';
      } else if (isExtra) {
        v.summary = '番外 / 互动系列素材：' + (topic || '未命名') + '。示例占位摘要，正式版本由多模态理解流水线生成。';
      } else {
        v.summary = '本期围绕「' + topicOf(topic) + '」展开：' + (topic || '无标题') + '。示例占位摘要，正式版本由多模态理解流水线生成。';
      }
    }
    if (Number(id) % 11 !== 0) {
      v.tags = isExtra ? ['番外', '互动', topicOf(topic)] : (TAG_BANK[topicOf(topic)] || ['天体运动']);
    }
    if (isExtra && Number(id) % 23 === 0) v.bilibili = 'BV1i3SeB2Epb';
    if (Number(id) % 101 === 0) v.thumb = '/img/thumb-sample.svg';

    const realScenes = scenes[id] || [];
    const visionRows = vision[id] || [];
    if (realScenes.length) {
      v.scenes = realScenes.slice(0, 6).map((s, i) => {
        const scene = { t0: s.t0, t1: s.t1 };
        const vs = visionRows.filter((x) => x.scene === s.idx);
        if (vs.length) {
          const c = vs[Math.floor(vs.length / 2)].cap || {};
          if (c.scene) scene.visual = c.scene;
          if (c.action) scene.action = c.action;
          if (c.onscreen_text) scene.ocr = c.onscreen_text;
          if (Array.isArray(c.people) && c.people.length) scene.people = ['liwenya'];
          if (c.mood) scene.mood = c.mood;
        } else {
          Object.assign(scene, makeScene(id, i, s.t0, s.t1, { dropOcr: i % 3 === 2, dropPeople: i % 4 === 3 }));
        }
        const t = tr && tr[Math.min(i, tr.length - 1)];
        if (t && !scene.dialogue) scene.dialogue = t.text.slice(0, 120);
        if (s.frames && s.frames.length) scene.keyframes = s.frames.slice(0, 5).map((f) => path.basename(f));
        return scene;
      });
    } else if (Number(id) % 9 < 2) {
      const dur = v.duration || 600;
      const n = 2 + Math.floor(r() * 3);
      v.scenes = Array.from({ length: n }, (_, i) =>
        makeScene(id, i, round1((dur / n) * i), round1((dur / n) * (i + 1)), {
          dropVisual: Number(id) % 5 === 0,
          dropDialogue: Number(id) % 6 === 0,
          dropOcr: i % 2 === 1,
          dropPeople: i % 3 === 2,
        })
      );
    }
    return v;
  });

  const hours = round1(videos.reduce((s, v) => s + (v.duration || 0), 0) / 3600);
  const withScenes = videos.filter((v) => v.scenes && v.scenes.length).length;
  console.log('[gen-mock-data] 视频 ' + videos.length + ' 条 / 有时长 ' + videos.filter((v) => v.duration).length + ' 条 / 合计 ' + hours + ' 小时 / 含场景卡 ' + withScenes + ' 条');
  return { videos, hours };
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const built = buildVideos();
  writeFileSync(path.join(OUT, 'videos.json'), JSON.stringify(built.videos) + '\n');
  console.log('[gen-mock-data] 已写出 src/data/videos.json');
  console.log('[gen-mock-data] 提示：people / theories / events / glossary / graph / site 为人工示例，需按同一契约替换。');
}

main();
