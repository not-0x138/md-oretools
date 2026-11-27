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
