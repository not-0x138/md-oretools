const NEURON_CARD_SEARCH_BASE_URL =
  "https://www.db.yugioh-card.com/yugiohdb/card_search.action";

// 「深淵の獣（ビーステッド）」のような補足括弧は公式DB検索・ID照合でノイズになるため除去する
const PARENTHETICAL_NOTE_PATTERN = /[（(][^）)]*[）)]/g;
const CARD_LABEL_SEPARATOR_PATTERN = /[/／]/;

export interface NeuronCardLink {
  /** 画面上に表示するカード名ラベル */
  label: string;
  /** 公式カードデータベースへ渡す検索キーワード */
  keyword: string;
  /** 遊戯王ニューロン（公式カードDB）の詳細ページまたは検索ページURL */
  url: string;
  /** 公式カード詳細ページ（ope=2&cid=...）へ直接遷移する場合は true */
  isDirectDetail: boolean;
}

export type CardLinkTextSegment =
  | { type: "text"; text: string; start: number }
  | { type: "card"; text: string; start: number; link: NeuronCardLink };

export interface CardLinkTokenizerOptions {
  cidMap?: Readonly<Record<string, number>>;
  /** 現在表示中テーマの主なカード一覧（フルネームおよび安全な略称もハイライト対象にする） */
  signatureCards?: readonly string[];
}

/**
 * カード固有 ID（cid）から遊戯王ニューロン（公式カードデータベース日本語版）の
 * カード詳細ページ URL を生成する。
 */
export function buildNeuronCardDetailUrl(cid: number): string {
  const params = new URLSearchParams({
    ope: "2",
    cid: String(cid),
    request_locale: "ja",
  });
  return `${NEURON_CARD_SEARCH_BASE_URL}?${params.toString()}`;
}

/**
 * カード名から遊戯王ニューロン（公式カードデータベース日本語版）のカード名検索 URL を生成する。
 * cid 未登録カードのフォールバック先として使用する。
 */
export function buildNeuronCardSearchUrl(cardName: string): string {
  const keyword = normalizeNeuronKeyword(cardName);
  const params = new URLSearchParams({
    ope: "1",
    sess: "1",
    stype: "1",
    keyword,
    request_locale: "ja",
  });
  return `${NEURON_CARD_SEARCH_BASE_URL}?${params.toString()}`;
}

/**
 * カード名に対応する公式 cid がマップにあれば詳細ページへ直行する URL を返し、
 * 見つからない場合はカード名検索 URL へフォールバックする。
 */
export function resolveNeuronCardLink(
  cardName: string,
  cidMap?: Readonly<Record<string, number>>,
): NeuronCardLink | null {
  const label = cardName.trim();
  if (!label) {
    return null;
  }
  const keyword = normalizeNeuronKeyword(label);
  if (!keyword) {
    return null;
  }

  const cid = lookupNeuronCid(keyword, cidMap);
  if (cid !== undefined) {
    return {
      label,
      keyword,
      url: buildNeuronCardDetailUrl(cid),
      isDirectDetail: true,
    };
  }

  return {
    label,
    keyword,
    url: buildNeuronCardSearchUrl(keyword),
    isDirectDetail: false,
  };
}

/**
 * 単一カード名または「無限泡影 / エフェクト・ヴェーラー」のような複合表記から、
 * 遊戯王ニューロンへのリンク一覧を抽出する。
 */
export function extractNeuronLinksFromLabel(
  rawLabel: string,
  cidMap?: Readonly<Record<string, number>>,
): NeuronCardLink[] {
  const parts = rawLabel.split(CARD_LABEL_SEPARATOR_PATTERN);
  const links: NeuronCardLink[] = [];
  const seenKeywords = new Set<string>();

  for (const part of parts) {
    const resolved = resolveNeuronCardLink(part, cidMap);
    if (!resolved || seenKeywords.has(resolved.keyword)) {
      continue;
    }
    seenKeywords.add(resolved.keyword);
    links.push(resolved);
  }

  return links;
}

function normalizeNeuronKeyword(raw: string): string {
  return raw.replace(PARENTHETICAL_NOTE_PATTERN, "").trim();
}

function lookupNeuronCid(
  keyword: string,
  cidMap?: Readonly<Record<string, number>>,
): number | undefined {
  if (!cidMap) {
    return undefined;
  }
  const direct = cidMap[keyword];
  if (direct !== undefined) {
    return direct;
  }
  const nfkc = keyword.normalize("NFKC");
  return cidMap[nfkc];
}

const MIN_AUTO_LINK_LENGTH = 3;
const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const DELIMITED_SUFFIX_PATTERN = /[・･\-－―\s]([ァ-ヶー]{3,}|[A-Za-z0-9]{4,})$/;
const KANJI_TRAILING_KATAKANA_PATTERN = /[\u4e00-\u9faf]([ァ-ヶー]{3,})$/;

function escapeRegExp(text: string): string {
  return text.replace(REGEXP_SPECIAL_CHARS, "\\$&");
}

/**
 * テーマ固有カード名から、打ちどころメモでよく使われる安全な短縮表記（3文字以上の固有カタカナ末尾など）を抽出する。
 * 例: 「星辰砲手ファイメナ」→「ファイメナ」、「スネークアイ・エクセル」→「エクセル」
 * 2文字以下（「レイ」「ロー」等）は一般語への誤爆を防ぐため抽出しない。
 */
function extractSafeCardAliases(cardName: string): string[] {
  const aliases: string[] = [];
  const delimited = cardName.match(DELIMITED_SUFFIX_PATTERN);
  if (delimited?.[1]) {
    aliases.push(delimited[1]);
  }
  const trailingKata = cardName.match(KANJI_TRAILING_KATAKANA_PATTERN);
  if (trailingKata?.[1] && !aliases.includes(trailingKata[1])) {
    aliases.push(trailingKata[1]);
  }
  return aliases;
}

/**
 * 対策メモ・誘発打ちどころ本文中のカード名を検出し、ニューロン詳細リンク付きセグメントへ分割する関数を生成する。
 * 同じテーマ内の複数メモに対して正規表現を1回だけ構築して使い回す用途を想定している。
 */
export function createCardLinkTokenizer(
  options: CardLinkTokenizerOptions = {},
): (text: string) => CardLinkTextSegment[] {
  const { cidMap, signatureCards = [] } = options;
  const tokenToCardName = new Map<string, string>();

  // 1. 公式 cid マップの全登録カード（3文字以上）を候補にする
  if (cidMap) {
    for (const cardName of Object.keys(cidMap)) {
      if (cardName.length >= MIN_AUTO_LINK_LENGTH) {
        tokenToCardName.set(cardName, cardName);
      }
    }
  }

  // 2. 表示中テーマの主なカード（未登録の自作カード含む）を優先登録する
  for (const rawCard of signatureCards) {
    const cardName = rawCard.trim();
    if (cardName.length >= MIN_AUTO_LINK_LENGTH) {
      tokenToCardName.set(cardName, cardName);
    }
  }

  // 3. 表示中テーマ内で一意に定まる安全な略称のみを追加する（重複する略称は誤リンク防止のため除外）
  const aliasCandidates = new Map<string, string | null>();
  for (const rawCard of signatureCards) {
    const cardName = rawCard.trim();
    if (!cardName) {
      continue;
    }
    for (const alias of extractSafeCardAliases(cardName)) {
      if (tokenToCardName.has(alias)) {
        continue;
      }
      if (!aliasCandidates.has(alias)) {
        aliasCandidates.set(alias, cardName);
      } else if (aliasCandidates.get(alias) !== cardName) {
        aliasCandidates.set(alias, null);
      }
    }
  }
  for (const [alias, target] of aliasCandidates) {
    if (target) {
      tokenToCardName.set(alias, target);
    }
  }

  if (tokenToCardName.size === 0) {
    return (text: string) => (text ? [{ type: "text", text, start: 0 }] : []);
  }

  // 長い表記を先に並べることで最長一致を優先する（例: 「スネークアイ・エクセル」を部分分割しない）
  const sortedTokens = [...tokenToCardName.keys()].sort(
    (a, b) => b.length - a.length,
  );
  const matcher = new RegExp(
    `(${sortedTokens.map(escapeRegExp).join("|")})`,
    "g",
  );

  return (text: string): CardLinkTextSegment[] => {
    if (!text) {
      return [];
    }
    const segments: CardLinkTextSegment[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(matcher)) {
      const matchedText = match[0];
      const startIndex = match.index ?? 0;
      if (startIndex > lastIndex) {
        segments.push({
          type: "text",
          text: text.slice(lastIndex, startIndex),
          start: lastIndex,
        });
      }
      const targetCardName = tokenToCardName.get(matchedText) ?? matchedText;
      const resolved = resolveNeuronCardLink(targetCardName, cidMap);
      if (resolved) {
        segments.push({
          type: "card",
          text: matchedText,
          start: startIndex,
          link: resolved,
        });
      } else {
        segments.push({ type: "text", text: matchedText, start: startIndex });
      }
      lastIndex = startIndex + matchedText.length;
    }

    if (lastIndex < text.length) {
      segments.push({
        type: "text",
        text: text.slice(lastIndex),
        start: lastIndex,
      });
    }

    return segments;
  };
}

export function tokenizeTextWithCardLinks(
  text: string,
  options: CardLinkTokenizerOptions = {},
): CardLinkTextSegment[] {
  return createCardLinkTokenizer(options)(text);
}
