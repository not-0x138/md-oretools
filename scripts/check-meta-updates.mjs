#!/usr/bin/env node
/**
 * 誘発カンペの初期テンプレートと最新環境ランキング（Game8）を比較し、
 * 新規テーマ・Tier 変動・未登録の手札誘発を検知して Markdown レポートを出力する。
 *
 * 使い方:
 *   node scripts/check-meta-updates.mjs
 *   node scripts/check-meta-updates.mjs --output meta-report.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const DECK_RANKING_URL = "https://game8.jp/yugioh-masterduel/423817";
const HAND_TRAP_RANKING_URL = "https://game8.jp/yugioh-masterduel/641142";

const TEMPLATE_FILES = [
  "src/features/cheat-sheet/data/templatesTopTier.ts",
  "src/features/cheat-sheet/data/templatesMidTier.ts",
  "src/features/cheat-sheet/data/templatesClassicTier.ts",
];
const CATALOG_FILE = "src/features/cheat-sheet/data/handTrapCatalog.ts";

const TIER_LABELS = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
  tier4: "Tier 4",
  tier5: "Tier 5",
  other: "その他",
};

function normalizeName(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・･\-－ー()（）]/g, "")
    .replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60),
    );
}

/**
 * 既存テンプレートファイルからテーマ名・別名・Tier を読み取る。
 * ビルド前の Node 単体実行で動くよう、依存ゼロのソース解析で抽出する。
 */
function loadLocalTemplates() {
  const entries = [];
  for (const relPath of TEMPLATE_FILES) {
    const content = fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
    const blocks = content.split(/\n\s*\{\s*\n\s*id:\s*"/).slice(1);
    for (const block of blocks) {
      const id = block.match(/^([^"]+)"/)?.[1];
      const themeName = block.match(/themeName:\s*"([^"]+)"/)?.[1];
      const tier = block.match(/tier:\s*"([^"]+)"/)?.[1] ?? "other";
      const aliasesBlock = block.match(/aliases:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
      const aliases = [...aliasesBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      if (id && themeName) {
        entries.push({
          id,
          themeName,
          tier,
          aliases,
          normalizedNames: new Set([
            normalizeName(themeName),
            ...aliases.map(normalizeName),
          ]),
        });
      }
    }
  }
  return entries;
}

/**
 * handTrapCatalog.ts から HAND_TRAP_CATALOG のラベル・短縮名を読み取る。
 */
function loadLocalHandTraps() {
  const content = fs.readFileSync(path.join(ROOT_DIR, CATALOG_FILE), "utf8");
  const start = content.indexOf("export const HAND_TRAP_CATALOG");
  const end = content.indexOf("];", start);
  const section = start >= 0 && end > start ? content.slice(start, end) : "";
  const names = new Set();
  for (const m of section.matchAll(/(?:label|shortLabel):\s*"([^"]+)"/g)) {
    for (const part of m[1].split("/")) {
      names.add(normalizeName(part));
    }
  }
  return names;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "md-oretools-meta-checker/1.0 (+https://github.com)",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${url})`);
  }
  return res.text();
}

/**
 * Game8 環境最強ランキング早見表から Tier1〜Tier4 のテーマ一覧を抽出する。
 */
function parseDeckTierTable(html) {
  const start = html.indexOf("環境最強ランキング早見表");
  const end = html.indexOf("評価基準", start);
  if (start < 0 || end < 0) {
    return { updatedDate: null, tiers: [] };
  }

  const updatedDate =
    html.match(/最終更新日[：:]\s*([0-9]{4}\.[0-9]{2}\.[0-9]{2})/)?.[1] ?? null;

  const section = html.slice(start, end);
  const tierDefs = [
    { key: "tier1", marker: "Tier1" },
    { key: "tier2", marker: "Tier2" },
    { key: "tier3", marker: "Tier3" },
    { key: "tier4", marker: "Tier4" },
  ];

  const tiers = [];
  for (let i = 0; i < tierDefs.length; i += 1) {
    const cur = tierDefs[i];
    const next = tierDefs[i + 1];
    const curIdx = section.indexOf(`>${cur.marker}<`);
    if (curIdx < 0) {
      continue;
    }
    const nextIdx = next
      ? section.indexOf(`>${next.marker}<`, curIdx)
      : section.indexOf("Tier5", curIdx);
    const slice = section.slice(curIdx, nextIdx > curIdx ? nextIdx : undefined);

    const seen = new Set();
    const decks = [];
    for (const m of slice.matchAll(
      /<a[^>]+href="(https:\/\/game8\.jp\/yugioh-masterduel\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const url = m[1];
      const name = m[2].replace(/<[^>]+>/g, "").trim();
      if (name && name !== "-" && !seen.has(url)) {
        seen.add(url);
        decks.push({ name, url, tier: cur.key });
      }
    }
    tiers.push({ tier: cur.key, decks });
  }

  return { updatedDate, tiers };
}

/**
 * Game8 手札誘発ランキング（ランクSS〜B）からカード名を抽出する。
 */
function parseHandTrapRanking(html) {
  const start = html.indexOf("手札誘発の解説");
  const end = html.indexOf("手札誘発の一覧", start);
  if (start < 0 || end < 0) {
    return { updatedDate: null, traps: [] };
  }

  const updatedDate =
    html.match(/最終更新日[：:]\s*([0-9]{4}\.[0-9]{2}\.[0-9]{2})/)?.[1] ?? null;

  const section = html.slice(start, end);
  const rankDefs = [
    { rank: "SS", marker: "ランクSS" },
    { rank: "S", marker: "ランクS" },
    { rank: "A", marker: "ランクA" },
    { rank: "B", marker: "ランクB" },
  ];

  const traps = [];
  for (let i = 0; i < rankDefs.length; i += 1) {
    const cur = rankDefs[i];
    const next = rankDefs[i + 1];
    const curIdx = section.indexOf(cur.marker);
    if (curIdx < 0) {
      continue;
    }
    const nextIdx = next
      ? section.indexOf(next.marker, curIdx)
      : section.length;
    const slice = section.slice(curIdx, nextIdx > curIdx ? nextIdx : undefined);
    const seen = new Set();
    for (const m of slice.matchAll(/alt="([^"]+?)画像"/g)) {
      const name = m[1].trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        traps.push({ name, rank: cur.rank });
      }
    }
  }

  return { updatedDate, traps };
}

function buildReport({
  localTemplates,
  localHandTraps,
  deckRanking,
  handTrapRanking,
}) {
  const missingDecks = [];
  const tierChanges = [];

  for (const group of deckRanking.tiers) {
    for (const remote of group.decks) {
      const norm = normalizeName(remote.name);
      const matched = localTemplates.find((tpl) =>
        tpl.normalizedNames.has(norm),
      );
      if (!matched) {
        missingDecks.push(remote);
      } else if (matched.tier !== remote.tier) {
        tierChanges.push({
          themeName: matched.themeName,
          localTier: matched.tier,
          remoteTier: remote.tier,
          url: remote.url,
        });
      }
    }
  }

  const missingHandTraps = handTrapRanking.traps.filter(
    (ht) => !localHandTraps.has(normalizeName(ht.name)),
  );

  const hasChanges =
    missingDecks.length > 0 ||
    tierChanges.length > 0 ||
    missingHandTraps.length > 0;

  const lines = [
    "## 誘発カンペ 環境アップデート差分レポート",
    "",
    `- チェック日時: ${new Date().toISOString().slice(0, 10)}`,
    `- 現在の登録テーマ数: ${localTemplates.length} 件`,
    `- デッキランキング参照元: ${DECK_RANKING_URL}（最終更新: ${deckRanking.updatedDate ?? "不明"}）`,
    `- 手札誘発ランキング参照元: ${HAND_TRAP_RANKING_URL}（最終更新: ${handTrapRanking.updatedDate ?? "不明"}）`,
    "",
  ];

  if (!hasChanges) {
    lines.push(
      "Tier 1〜Tier 4 のデッキおよび上位手札誘発に未反映の差分はありません。",
    );
  } else {
    if (missingDecks.length > 0) {
      lines.push("### 未登録の環境上位テーマ（Tier 1〜Tier 4）", "");
      for (const d of missingDecks) {
        lines.push(`- [ ] **${d.name}**（${TIER_LABELS[d.tier]}） - ${d.url}`);
      }
      lines.push("");
    }

    if (tierChanges.length > 0) {
      lines.push("### Tier 変動が検知された既存テーマ", "");
      for (const c of tierChanges) {
        lines.push(
          `- [ ] **${c.themeName}**: ${TIER_LABELS[c.localTier] ?? c.localTier} → **${TIER_LABELS[c.remoteTier]}**`,
        );
      }
      lines.push("");
    }

    if (missingHandTraps.length > 0) {
      lines.push("### 未登録の上位手札誘発（Tier SS〜B）", "");
      for (const ht of missingHandTraps) {
        lines.push(`- [ ] **${ht.name}**（ランク${ht.rank}）`);
      }
      lines.push("");
    }

    lines.push(
      "---",
      "### 更新手順",
      "ローカルで Antigravity に「この Issue の内容に沿って `update-cheat-sheet` スキルで誘発カンペを更新して」と指示してください。",
    );
  }

  return {
    hasChanges,
    missingDecks,
    tierChanges,
    missingHandTraps,
    markdown: `${lines.join("\n")}\n`,
  };
}

function parseArgs(argv) {
  let outputPath = null;
  let githubOutput = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--output" && argv[i + 1]) {
      outputPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--github-output" && argv[i + 1]) {
      githubOutput = argv[i + 1];
      i += 1;
    }
  }
  return { outputPath, githubOutput };
}

async function main() {
  const { outputPath, githubOutput } = parseArgs(process.argv.slice(2));
  const localTemplates = loadLocalTemplates();
  const localHandTraps = loadLocalHandTraps();

  const [deckHtml, handTrapHtml] = await Promise.all([
    fetchHtml(DECK_RANKING_URL),
    fetchHtml(HAND_TRAP_RANKING_URL),
  ]);

  const deckRanking = parseDeckTierTable(deckHtml);
  const handTrapRanking = parseHandTrapRanking(handTrapHtml);

  const report = buildReport({
    localTemplates,
    localHandTraps,
    deckRanking,
    handTrapRanking,
  });

  if (outputPath) {
    fs.writeFileSync(outputPath, report.markdown, "utf8");
  }
  if (githubOutput) {
    fs.appendFileSync(
      githubOutput,
      `has_changes=${report.hasChanges ? "true" : "false"}\n`,
      "utf8",
    );
  }

  console.log(report.markdown);
}

main().catch((err) => {
  console.error("[check-meta-updates] エラー:", err);
  process.exitCode = 1;
});
