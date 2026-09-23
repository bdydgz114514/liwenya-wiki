#!/usr/bin/env node
/**
 * postbuild.mjs —— 构建后处理：生成 Pagefind 全文索引。
 *
 * - 只读取 dist/ 下的静态 HTML，不访问网络；
 * - 若 Pagefind 不可用（未安装 / 二进制缺失），保持退出码 0：
 *   站点仍可通过 /search 的本地 JSON 兜底索引搜索（/search-index.json）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const DIST = path.join(SITE, 'dist');
const BIN = path.join(SITE, 'node_modules', '.bin', 'pagefind');

if (!existsSync(DIST)) {
  console.error('[postbuild] 未找到 dist/，请先运行 astro build');
  process.exit(1);
}

function walk(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

function countHtml(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countHtml(full);
    else if (entry.name.endsWith('.html')) n += 1;
  }
  return n;
}

const htmlPages = countHtml(DIST);
console.log('[postbuild] 静态页面：' + htmlPages + ' 个 HTML');

let pagefindOk = false;
if (existsSync(BIN)) {
  try {
    const out = execFileSync(BIN, ['--site', DIST, '--output-subdir', 'pagefind'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15 * 60 * 1000,
    });
    const tail = out.trim().split('\n').slice(-6).join('\n');
    if (tail) console.log(tail);
    pagefindOk = existsSync(path.join(DIST, 'pagefind', 'pagefind.js'));
  } catch (err) {
    console.warn('[postbuild] Pagefind 执行失败，将使用 JSON 兜底搜索：' + (err && err.message ? err.message : err));
  }
} else {
  console.warn('[postbuild] 未安装 pagefind（node_modules/.bin/pagefind 不存在），跳过全文索引。');
}

const stats = walk(DIST);
console.log(
  '[postbuild] dist 体积：' + (stats.bytes / 1024 / 1024).toFixed(1) + ' MB / ' + stats.files + ' 个文件'
);
console.log(
  '[postbuild] 搜索索引：' +
    (pagefindOk ? 'Pagefind（dist/pagefind/）' : 'JSON 兜底（dist/search-index.json）')
);
