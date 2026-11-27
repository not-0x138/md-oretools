#!/usr/bin/env node
/**
 * 誘発カンペ内の全カード名から、遊戯王公式カードデータベース（ニューロン）の
 * カード固有 ID（cid）を完全一致で取得し、neuronCidMap.ts を生成・更新する開発用スクリプト。
 *
 * 使い方:
 *   node scripts/sync-neuron-cids.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "src/features/cheat-sheet/data");
const OUTPUT_FILE = path.join(DATA_DIR, "neuronCidMap.ts");

const SOURCE_FILES = [
  "templatesTopTier.ts",
  "templatesMidTier.ts",
  "templatesClassicTier.ts",
  "handTrapCatalog.ts",
  "cardSuggestCatalog.ts",
];

const CONCURRENCY = 4;
const DELAY_MS = 120;

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&forall;/g, "∀")
    .replace(/&Oslash;/g, "Ø")
    .replace(/&oslash;/g, "ø")
    .replace(/&alpha;/g, "α")
    .replace(/&beta;/g, "β")
    .replace(/&gamma;/g, "γ")
    .replace(/&delta;/g, "δ")
    .replace(/&epsilon;/g, "ε")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeForExactMatch(text) {
  return decodeHtmlEntities(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ø/g, "0")
    .replace(/∀/g, "a")
    .replace(/[\s・･\-－―‐ー<>＜＞"'“”「」『』]/g, "");
}

function stripParenthetical(raw) {
  return raw.replace(/[（(][^）)]*[）)]/g, "").trim();
}

function collectUniqueCardNames() {
  const names = new Set();

  for (const file of SOURCE_FILES) {
    const content = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    if (file.startsWith("templates")) {
      for (const block of content.matchAll(
        /signatureCards:\s*\[([\s\S]*?)\]/g,
      )) {
        for (const m of block[1].matchAll(/"([^"]+)"/g)) {
          const cleaned = stripParenthetical(m[1]);
          if (cleaned) {
            names.add(cleaned);
          }
        }
      }
    } else {
      for (const m of content.matchAll(/(?:name|label):\s*"([^"]+)"/g)) {
        for (const part of m[1].split(/[/／]/)) {
          const cleaned = stripParenthetical(part);
          if (cleaned) {
            names.add(cleaned);
          }
        }
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, "ja"));
}

function loadExistingCidMap() {
  const map = new Map();
  if (!fs.existsSync(OUTPUT_FILE)) {
    return map;
  }
  const content = fs.readFileSync(OUTPUT_FILE, "utf8");
  for (const m of content.matchAll(
    /^\s*(?:"([^"]+)"|([^:\s]+)):\s*(\d+),?\s*$/gm,
  )) {
    const key = m[1] ?? m[2];
    if (key) {
      map.set(key, Number(m[3]));
    }
  }
  return map;
}

function parseCardEntriesFromHtml(html) {
  const entries = [];
  const pattern =
    /<span class="card_name">([\s\S]*?)<\/span>[\s\S]*?<input type="hidden" class="cid" value="(\d+)">/g;
  for (const m of html.matchAll(pattern)) {
    const name = decodeHtmlEntities(m[1]).replace(/\s+/g, " ").trim();
    const cid = Number(m[2]);
    if (name && Number.isFinite(cid)) {
      entries.push({ name, cid });
    }
  }
  return entries;
}

async function queryCandidates(keyword) {
  const params = new URLSearchParams({
    ope: "1",
    sess: "1",
    stype: "1",
    keyword,
    request_locale: "ja",
  });
  const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "ja,en;q=0.5",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${keyword}`);
  }
  return parseCardEntriesFromHtml(await res.text());
}

async function fetchCidForCard(cardName) {
  const candidates = await queryCandidates(cardName);
  const exact = candidates.find((c) => c.name === cardName);
  if (exact) {
    return exact.cid;
  }

  const normalizedTarget = normalizeForExactMatch(cardName);
  const normalizedExact = candidates.find(
    (c) => normalizeForExactMatch(c.name) === normalizedTarget,
  );
  if (normalizedExact) {
    return normalizedExact.cid;
  }

  // 特殊記号（∀ / Ø / ＜＞ / “” 等）でDB検索が0件になる場合は、英数字・日本語の主要語だけで再検索して完全一致照合する
  const fallbackKeyword = cardName
    .replace(/[∀Ø<>＜＞“”"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (fallbackKeyword && fallbackKeyword !== cardName) {
    const retryCandidates = await queryCandidates(fallbackKeyword);
    const retryMatch = retryCandidates.find(
      (c) => normalizeForExactMatch(c.name) === normalizedTarget,
    );
    if (retryMatch) {
      return retryMatch.cid;
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeCidMapFile(cidMap) {
  const sortedEntries = [...cidMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "ja"),
  );
  const lines = [
    "/**",
    " * 遊戯王公式カードデータベース（遊戯王ニューロン）のカード名 → cid マッピング。",
    " * `node scripts/sync-neuron-cids.mjs` で自動生成・差分更新される。",
    " * 未収録のカードはカード名検索URLへフォールバックする。",
    " */",
    "export const NEURON_CID_MAP: Readonly<Record<string, number>> = {",
  ];
  for (const [name, cid] of sortedEntries) {
    lines.push(`  ${JSON.stringify(name)}: ${cid},`);
  }
  lines.push("};", "");
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf8");
}

async function main() {
  const allCards = collectUniqueCardNames();
  const cidMap = loadExistingCidMap();
  const missing = allCards.filter((name) => !cidMap.has(name));

  console.log(
    `対象カード: ${allCards.length}件 / 既存: ${cidMap.size}件 / 未取得: ${missing.length}件`,
  );

  const unresolved = [];
  let cursor = 0;

  async function worker() {
    while (cursor < missing.length) {
      const idx = cursor;
      cursor += 1;
      const cardName = missing[idx];
      try {
        const cid = await fetchCidForCard(cardName);
        if (cid !== null) {
          cidMap.set(cardName, cid);
        } else {
          unresolved.push(cardName);
        }
      } catch (err) {
        unresolved.push(`${cardName} (${err.message})`);
      }
      await sleep(DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  writeCidMapFile(cidMap);
  console.log(
    `保存完了: ${cidMap.size}件 -> ${path.relative(ROOT, OUTPUT_FILE)}`,
  );
  if (unresolved.length > 0) {
    console.log(`未解決 (${unresolved.length}件):`);
    for (const item of unresolved) {
      console.log(`  - ${item}`);
    }
  }
}

await main();
