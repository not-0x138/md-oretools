import { createStandardHandTrapMemos } from "../domain/search";
import type { CheatSheetEntry } from "../domain/types";

const TEMPLATE_TIMESTAMP = "2026-11-27T00:00:00.000Z";

/**
 * Tier 5 後半 ＋ 既存定番テーマ（計12テーマ）
 * 既存テンプレート（tpl-tenpai, tpl-snake-eye, tpl-yubel, tpl-labrynth, tpl-voiceless）の id を維持。
 */
export const CLASSIC_TIER_TEMPLATES: readonly CheatSheetEntry[] = [
  {
    id: "tpl-temple-of-the-kings",
    themeName: "王家の神殿",
    aliases: ["リシド", "セルケト", "アポピス", "王の遺宝祀りし聖域"],
    signatureCards: [
      "刻印を持つ者",
      "王の遺宝祀りし聖域",
      "ジャッジメント・オブ・アヌビス",
      "守護獣セルケト",
      "アポピスの蛇神",
      "アヌビスの審判",
      "王家の神殿",
    ],
    tier: "tier5",
    deckType: "罠ビート",
    summonMethods: ["融合"],
    summary:
      "「王の遺宝祀りし聖域」と罠モンスター群で制圧するコントロールテーマ。聖域・神殿へ繋ぐ刻印を持つ者やセルケトへのサーチ妨害と、罠を丸ごと封じるレッド・リブートが有効。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "刻印を持つ者（最優先） / 守護獣セルケト / ジャッジメント・オブ・アヌビス",
          priority: "high",
        },
        "maxx-c": {
          target: "罠モンスターや融合展開時（ドロー枚数は伸びにくい）",
          priority: "low",
        },
        fuwalos: {
          target: "EXからの展開が少ないため優先度低め",
          priority: "low",
        },
        "imperm-veiler": {
          target: "刻印を持つ者 / 守護獣セルケト / 原石竜アナザー・ベリル",
          priority: "high",
        },
        impulse: {
          target: "罠モンスターの特殊召喚 / 融合効果",
          priority: "medium",
        },
        ogre: {
          target: "王の遺宝祀りし聖域（最優先） / 原石の皇脈",
          priority: "high",
        },
        belle: {
          target: "墓地からの回収・蘇生効果",
          priority: "low",
        },
        nibiru: {
          target: "召喚回数が少なく発動機会がほぼない",
          priority: "low",
        },
        droll: {
          target:
            "刻印・皇脈などの最初のサーチ後（罠セットは止まらない点に注意）",
          priority: "medium",
        },
      },
      [
        {
          id: "red-reboot",
          label: "レッド・リブート",
          target: "アポピス等の罠発動に当ててそのターンの罠妨害を完全封鎖",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-gem-knight",
    themeName: "ジェムナイト",
    aliases: ["ファントムルーツ", "ネピリム", "ディスパージョン"],
    signatureCards: [
      "ジェムナイト・ファントムルーツ",
      "ジェムナイト・ネピリム",
      "ジェムナイト・ヴォイドルーツ",
      "ジェムナイト・クォーツ",
      "ジェムナイト・ディスパージョン",
      "ジェムレシス",
      "ジェムナイト・フュージョン",
    ],
    tier: "tier5",
    deckType: "展開型",
    summonMethods: ["融合", "リンク"],
    summary:
      "「ジェムナイト・ファントムルーツ」を起点に融合とリンクを連打する爆発力重視のテーマ。ファントムルーツやディスパージョンへの妨害と、墓地を封じるメタカードが強烈に刺さる。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "ジェムナイト・ファントムルーツ / ジェムナイト・ディスパージョン / ネピリム",
          priority: "high",
        },
        "maxx-c": {
          target: "展開起点（特殊召喚回数が多く大量ドローが狙える）",
          priority: "high",
        },
        fuwalos: {
          target: "EXからの融合・リンク展開開始前",
          priority: "high",
        },
        "imperm-veiler": {
          target:
            "ジェムナイト・ファントムルーツ（最優先） / ジェムナイト・ネピリム",
          priority: "high",
        },
        impulse: {
          target: "ディスパージョン / ファントムルーツの融合効果",
          priority: "high",
        },
        ogre: {
          target: "ジェムナイト・ファントムルーツの融合効果起動時",
          priority: "medium",
        },
        belle: {
          target: "ジェムナイト・フュージョンの墓地回収 / 墓地蘇生効果",
          priority: "high",
        },
        nibiru: {
          target: "無効妨害成立前の5体目（展開回数が多く通りやすい）",
          priority: "high",
        },
        droll: {
          target: "ジェムレシスやファントムルーツの最初のサーチ後",
          priority: "high",
        },
      },
      [
        {
          id: "dd-crow",
          label: "D.D.クロウ",
          target:
            "墓地のジェムナイト・フュージョンや回収コスト対象を除外して循環を止める",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-lunalight",
    themeName: "月光",
    aliases: ["ムーンライト", "ライガー", "月光彩雛", "月光虎"],
    signatureCards: [
      "月光彩雛",
      "月光虎",
      "月光金獅子",
      "月光銀狗",
      "月光黄鼬",
      "月光翠鳥",
      "月光香",
      "月光舞獅子神姫",
    ],
    tier: "tier5",
    deckType: "展開型",
    summonMethods: ["融合", "エクシーズ"],
    summary:
      "完全耐性＋全体破壊を持つ「月光舞獅子神姫」の着地を目指す融合・展開テーマ。着地してしまうと処理が難しいため、月光虎へのうさぎやドロール・ロンギヌスで融合前に止めたい。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target: "月光金獅子 / 月光香の墓地サーチ / 炎舞－「天璣」",
          priority: "high",
        },
        "maxx-c": {
          target: "月光虎の蘇生効果や展開開始時",
          priority: "high",
        },
        fuwalos: {
          target: "EXからの融合・エクシーズ連打前",
          priority: "high",
        },
        "imperm-veiler": {
          target:
            "月光金獅子 / 月光銀狗（ただし彩雛の墓地送りはコストなので注意）",
          priority: "medium",
        },
        impulse: {
          target: "月光融合 / 月光狼の融合効果 / 月光虎の蘇生",
          priority: "high",
        },
        ogre: {
          target: "月光虎（P効果発動時に破壊して蘇生ループを止める）",
          priority: "high",
        },
        belle: {
          target: "月光虎の蘇生 / 月光狼の墓地除外融合",
          priority: "high",
        },
        nibiru: {
          target: "完全耐性ライガー着地前の5体目",
          priority: "high",
        },
        droll: {
          target: "天璣・黄鼬・金獅子の最初のサーチ後（融合パーツ集めを封鎖）",
          priority: "high",
        },
      },
      [
        {
          id: "lancea",
          label: "アーティファクト－ロンギヌス",
          target: "月光狼の墓地除外融合や月光香の墓地効果をまとめて封鎖",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-kenran",
    themeName: "絢嵐",
    aliases: ["けんらん", "クローゼア", "サイクロン"],
    signatureCards: [
      "絢嵐たるクローゼア",
      "絢嵐たるスエン",
      "絢嵐たるエルダム",
      "絢嵐たるメガラ",
      "絢嵐豪火フォニクス",
      "絢嵐渦麗ヴァルルーン",
      "絢嵐たる見神",
      "絢嵐たる献詠",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["エクシーズ", "リンク"],
    summary:
      "速攻魔法「サイクロン」の再利用と「絢嵐たるクローゼア」のサーチを軸に戦うテーマ。クローゼアへの妨害を最優先し、可能であれば墓地のサイクロンを除外してギミックを断つ。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "絢嵐たるクローゼア（最優先） / 絢嵐たる見神 / 献詠",
        priority: "high",
      },
      "maxx-c": {
        target: "絢嵐モンスターの特殊召喚効果チェーン",
        priority: "high",
      },
      fuwalos: {
        target: "デッキ・EXからの展開開始時",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "絢嵐たるクローゼア（最優先） / スエン / エルダム",
        priority: "high",
      },
      impulse: {
        target: "特殊召喚を含む絢嵐モンスター効果",
        priority: "high",
      },
      ogre: {
        target: "場で起動する絢嵐モンスター / 永続サポート",
        priority: "medium",
      },
      belle: {
        target: "クローゼアやサイクロンを墓地から回収する効果",
        priority: "high",
      },
      nibiru: {
        target: "展開が伸びた5体目タイミング",
        priority: "medium",
      },
      droll: {
        target: "クローゼアや見神の最初のサーチ後",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-hero",
    themeName: "HERO",
    aliases: ["ヒーロー", "E・HERO", "D-HERO", "V・HERO", "ダークロウ"],
    signatureCards: [
      "E・HERO エアーマン",
      "V・HERO ファリス",
      "V・HERO インクリース",
      "V・HERO ヴァイオン",
      "E・HERO シャドー・ミスト",
      "D-HERO ディアボリックガイ",
      "M・HERO ダーク・ロウ",
      "D-HERO デストロイフェニックスガイ",
    ],
    tier: "tier5",
    deckType: "展開型",
    summonMethods: ["融合", "リンク"],
    summary:
      "ファリス→インクリース→ヴァイオンの連続展開からダーク・ロウやデスフェニを立てる融合テーマ。インクリースへのうさぎ、ヴァイオンへの泡影、そしてニビルが非常に刺さりやすい。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "フュージョン・デステニー / V・HERO インクリース / クロスガイ",
        priority: "high",
      },
      "maxx-c": {
        target: "ファリス手札効果チェーン（展開回数が非常に多く致命傷）",
        priority: "high",
      },
      fuwalos: {
        target: "インクリースやリンク・融合展開開始前",
        priority: "high",
      },
      "imperm-veiler": {
        target:
          "V・HERO ヴァイオン（最優先） / X・HERO クロスガイ / エアーマン",
        priority: "high",
      },
      impulse: {
        target: "フュージョン・デステニー / V・HERO インクリース / クロスガイ",
        priority: "high",
      },
      ogre: {
        target:
          "永続罠扱いのV・HERO インクリース（破壊すると後続SSが不発・大打撃）",
        priority: "high",
      },
      belle: {
        target: "X・HERO クロスガイの蘇生 / ディアボリックガイ除外展開の補助",
        priority: "medium",
      },
      nibiru: {
        target:
          "無効妨害が立ちにくいため5体展開後にほぼ確定で直撃（最優先メタ）",
        priority: "high",
      },
      droll: {
        target:
          "エアーマンやヒーローアライブ後のサーチ（ヴァイオン・シャドーミストを封鎖）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-dark-magician",
    themeName: "ブラック・マジシャン",
    aliases: ["ブラマジ", "ブラックマジシャン", "黒の魔導陣", "永遠の魂"],
    signatureCards: [
      "ブラック・マジシャン",
      "マジシャンズ・ロッド",
      "マジシャンズ・ソウルズ",
      "イリュージョン・オブ・カオス",
      "黒の魔導陣",
      "永遠の魂",
      "ティマイオスの眼光",
      "魔術師の弟子－ブラック・マジシャン・ガール",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["融合"],
    summary:
      "「黒の魔導陣」の除外と「永遠の魂」の蘇生サイクルで戦うテーマ。初動のマジシャンズ・ロッドを止めることと、永遠の魂を破壊して相手モンスターごと吹き飛ばす動きが最強。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "マジシャンズ・ロッド（最優先） / イリュージョン・オブ・カオス / 黒の魔導陣",
        priority: "high",
      },
      "maxx-c": {
        target: "永遠の魂やティマイオス発動時（ドロー数は控えめ）",
        priority: "low",
      },
      fuwalos: {
        target: "融合展開時（ドロー枚数が伸びにくいため優先度低め）",
        priority: "low",
      },
      "imperm-veiler": {
        target:
          "マジシャンズ・ロッド（召喚時サーチ阻止） / 竜騎士ブラック・マジシャン",
        priority: "high",
      },
      impulse: {
        target: "永遠の魂の蘇生効果 / ティマイオスの融合効果",
        priority: "medium",
      },
      ogre: {
        target: "永遠の魂（破壊すると相手モンスター全滅・最重要） / 黒の魔導陣",
        priority: "high",
      },
      belle: {
        target: "永遠の魂の墓地蘇生 / マジシャンズ・サルベーション",
        priority: "high",
      },
      nibiru: {
        target: "召喚回数が少なく発動機会はほぼない",
        priority: "low",
      },
      droll: {
        target: "イリュージョン・オブ・カオスやロッドの最初のサーチ後",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-tri-brigade",
    themeName: "鉄獣戦線",
    aliases: ["トライブリゲード", "鉄獣", "フラクトール", "シュライグ"],
    signatureCards: [
      "鉄獣戦線 フラクトール",
      "鉄獣戦線 キット",
      "鉄獣戦線 ナーベル",
      "鉄獣戦線 ケラス",
      "鉄獣戦線 凶鳥のシュライグ",
      "鉄獣の抗戦",
      "鉄獣の炎工 キット",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["リンク"],
    summary:
      "墓地の獣・獣戦士・鳥獣族を除外してリンク召喚するテーマ。場の下級鉄獣の共通効果への無効妨害（泡影・ヴェーラー・霊王の波動）や、墓地・除外封じが直撃する。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target: "鉄獣戦線 フラクトール / 鉄獣戦線 ナーベル / 鉄獣の抗戦",
          priority: "high",
        },
        "maxx-c": {
          target: "下級鉄獣の共通効果チェーン / ケラス手札効果",
          priority: "high",
        },
        fuwalos: {
          target: "下級共通効果からのEXリンク連打前",
          priority: "high",
        },
        "imperm-veiler": {
          target:
            "場の下級鉄獣（フラクトール・キット・ケラス等の共通効果に直撃）",
          priority: "high",
        },
        impulse: {
          target: "下級鉄獣の共通効果 / 鉄獣の抗戦（リンク召喚を直接無効）",
          priority: "high",
        },
        ogre: {
          target:
            "場の下級鉄獣（コスト除外後に破壊してもリンク召喚自体は成立する点に注意）",
          priority: "low",
        },
        belle: {
          target: "鉄獣の抗戦（墓地からの特殊召喚を含むため対応）",
          priority: "high",
        },
        nibiru: {
          target: "アポロウーサ成立前の5体目",
          priority: "medium",
        },
        droll: {
          target: "フラクトール→ナーベルのサーチ連鎖後",
          priority: "medium",
        },
      },
      [
        {
          id: "lancea",
          label: "アーティファクト－ロンギヌス",
          target: "墓地除外コストを封じ、鉄獣の共通効果と展開を完全停止",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },

  // --- 既存テンプレート（ID互換維持 + 最新標準枠10種へ拡張） ---
  {
    id: "tpl-tenpai",
    themeName: "天盃龍",
    aliases: ["てんぱい", "盃満ちる燦幻荘", "後攻ワンキル"],
    signatureCards: [
      "天盃龍パイドラ",
      "天盃龍チュンドラ",
      "天盃龍ファドラ",
      "盃満ちる燦幻荘",
      "燦幻開門",
      "燦幻超龍トランセンド・ドラギオン",
    ],
    tier: "tier5",
    deckType: "後攻ワンキル",
    summonMethods: ["シンクロ"],
    summary:
      "メインフェイズ1に燦幻荘があると炎属性ドラゴンは効果を受けない。バトルフェイズに入ってから誘発や除去を使うか、燦幻荘に幽鬼うさぎを当てる。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "燦幻開門 / 天盃龍チュンドラのデッキリクルート効果 / 盃満ちる燦幻荘のサーチ",
        priority: "high",
      },
      "maxx-c": {
        target: "チュンドラ特殊召喚 / バトルフェイズ中のシンクロ連打前",
        priority: "medium",
      },
      fuwalos: {
        target:
          "バトルフェイズのチュンドラ・シンクロ連打前（ワンキル阻止札を引く）",
        priority: "medium",
      },
      "imperm-veiler": {
        target:
          "天盃龍パイドラ（燦幻荘がない時） / バトルフェイズ中のファドラ・チュンドラ",
        priority: "high",
      },
      impulse: {
        target: "バトルフェイズ中のチュンドラ / バイデント・ドラギオンの蘇生",
        priority: "high",
      },
      ogre: {
        target: "盃満ちる燦幻荘（サーチ効果起動時に破壊して耐性を消す・最強）",
        priority: "high",
      },
      belle: {
        target: "天盃龍ファドラの蘇生効果 / バイデント・ドラギオンの蘇生",
        priority: "medium",
      },
      nibiru: {
        target:
          "メインフェイズで5回召喚した時（バトルフェイズ中は発動不可に注意）",
        priority: "low",
      },
      droll: {
        target: "燦幻荘・パイドラの最初のサーチ後（連打抑制）",
        priority: "low",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-snake-eye",
    themeName: "スネークアイ",
    aliases: [
      "罪宝",
      "蛇眼",
      "炎王スネークアイ",
      "Dスネークアイ",
      "デモンスミススネークアイ",
    ],
    signatureCards: [
      "スネークアイ・エクセル",
      "蛇眼の炎燐",
      "スネークアイ・オーク",
      "蛇眼の炎龍",
      "原罪宝－スネークアイ",
      "黒魔女ディアベルスター",
      "罪宝狩りの悪魔",
    ],
    tier: "tier5",
    deckType: "展開型",
    summonMethods: ["リンク"],
    summary:
      "原罪宝へのアクセスとエクセルのデッキリクルート効果を抑えるのが基本。デモンスミス型・炎王型の場合はレクイエムや孤島・ポニクスへの連鎖も意識する。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "原罪宝－スネークアイ / エクセルのリクルート効果 / 罪宝狩りの悪魔",
        priority: "high",
      },
      "maxx-c": {
        target:
          "ポプルス特殊召喚チェーン / ディアベルスター召喚時 / リンク展開開始時",
        priority: "high",
      },
      fuwalos: {
        target: "リンク展開・デモンスミス展開の開始前",
        priority: "high",
      },
      "imperm-veiler": {
        target:
          "スネークアイ・エクセル（召喚時サーチ） / 蛇眼の炎燐 / 賜炎の咎姫",
        priority: "high",
      },
      impulse: {
        target: "原罪宝－スネークアイ / 賜炎の咎姫 / デモンスミス・レクイエム",
        priority: "high",
      },
      ogre: {
        target: "蛇眼神殿スネークアイ / 炎王の孤島 / 閉ザサレシ天ノ月",
        priority: "medium",
      },
      belle: {
        target: "賜炎の咎姫の墓地蘇生 / 蛇眼の炎龍の墓地効果",
        priority: "medium",
      },
      nibiru: {
        target: "アポロウーサ成立前（リンク値が伸びたタイミング）",
        priority: "medium",
      },
      droll: {
        target: "篝火・エクセル・罪宝狩り等の最初のサーチ後",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-yubel",
    themeName: "ユベル",
    aliases: [
      "ファントムユベル",
      "スピリットオブユベル",
      "破械ユベル",
      "Dユベル",
    ],
    signatureCards: [
      "スピリット・オブ・ユベル",
      "サクリファイス・D・ロータス",
      "ナイトメア・スローン",
      "ナイトメア・ペイン",
      "ファントム・オブ・ユベル",
      "七精の解門",
    ],
    tier: "other",
    deckType: "展開型",
    summonMethods: ["リンク", "融合"],
    summary:
      "ファントム・オブ・ユベルが出るとモンスター効果を書き換えられるため、出る前のロータスや解門を止める。ナイトメア・ペインや解門への幽鬼うさぎも有効。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "サクリファイス・D・ロータス（リクルート） / ナイトメア・スローン / 破械神ヤマ",
        priority: "high",
      },
      "maxx-c": {
        target: "ロータス効果チェーン / 暗黒の招来神からの展開時",
        priority: "high",
      },
      fuwalos: {
        target: "ロータスやリンク展開に入るタイミング",
        priority: "high",
      },
      "imperm-veiler": {
        target: "サクリファイス・D・ロータス / 暗黒の招来神 / 破械神王ヤマ",
        priority: "high",
      },
      impulse: {
        target: "サクリファイス・D・ロータス / 七精の解門の蘇生",
        priority: "high",
      },
      ogre: {
        target: "ナイトメア・ペイン / 七精の解門（永続魔法のため破壊が直撃）",
        priority: "high",
      },
      belle: {
        target: "七精の解門の蘇生 / 破械神シャバラ・ヤマの墓地効果",
        priority: "medium",
      },
      nibiru: {
        target: "ファントム・オブ・ユベルやアポロウーサ成立前",
        priority: "medium",
      },
      droll: {
        target: "ナイトメア・スローン / 招来神サーチ後（追加サーチを広く停止）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-labrynth",
    themeName: "ラビュリンス",
    aliases: ["白銀の城", "家具ラビュ", "罠ビート"],
    signatureCards: [
      "白銀の城のラビュリンス",
      "迷宮城の白銀姫",
      "白銀の城の召使い アリアンナ",
      "ビッグウェルカム・ラビュリンス",
      "ウェルカム・ラビュリンス",
      "白銀の城の火吹炉",
    ],
    tier: "other",
    deckType: "罠ビート",
    summonMethods: ["効果モンスター"],
    summary:
      "ビッグウェルカム・ラビュリンスを灰流うらら・霊王の波動・屋敷わらしで止めるとリソース循環が大きく鈍る。罠主体なのでレッド・リブートも致命傷になる。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "ビッグウェルカム・ラビュリンス（最優先） / ウェルカム・ラビュリンス",
          priority: "high",
        },
        "maxx-c": {
          target: "家具効果やウェルカム発動時（ドロー枚数は伸びにくい）",
          priority: "low",
        },
        fuwalos: {
          target: "デッキ・EXからのSS回数が少ないため優先度低め",
          priority: "low",
        },
        "imperm-veiler": {
          target: "白銀の城の召使い アリアンナ（召喚時サーチ）",
          priority: "medium",
        },
        impulse: {
          target:
            "ビッグウェルカム・ラビュリンス（最優先） / ウェルカム・ラビュリンス",
          priority: "high",
        },
        ogre: {
          target: "白銀の迷宮城 / 場で発動した白銀姫",
          priority: "low",
        },
        belle: {
          target:
            "ビッグウェルカム・ラビュリンス（墓地蘇生含むため対応） / 白銀の城のラビュリンス",
          priority: "high",
        },
        nibiru: {
          target: "召喚回数が少なく、発動機会がほとんどない",
          priority: "low",
        },
        droll: {
          target: "デッキから直接セットする効果が中心で、効果を発揮しにくい",
          priority: "low",
        },
      },
      [
        {
          id: "red-reboot",
          label: "レッド・リブート",
          target: "ウェルカム系・通常罠の発動を止めてワンキルを通す",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-voiceless",
    themeName: "粛声",
    aliases: ["ローガーディアン", "粛声なる祈り", "儀式"],
    signatureCards: [
      "粛声の祈り手ロー",
      "粛声なる守護者ローガーディアン",
      "粛声の竜賢姫サフィラ",
      "粛声なる結界",
      "粛声なる威光",
    ],
    tier: "other",
    deckType: "ミッド型",
    summonMethods: ["儀式"],
    summary:
      "ローガーディアン・ロー・結界が揃うと対象耐性と無効効果で突破しにくくなる。サフィラや宣告者の神巫を止めて儀式召喚を防ぐか、結界を幽鬼うさぎで割る。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "粛声の竜賢姫サフィラ / 宣告者の神巫 / 儀式の下準備",
        priority: "high",
      },
      "maxx-c": {
        target: "儀式召喚チェーン（ただし1〜2ドローで止まりやすい）",
        priority: "medium",
      },
      fuwalos: {
        target: "デッキ・EXからの展開回数が少ないため優先度低め",
        priority: "low",
      },
      "imperm-veiler": {
        target: "宣告者の神巫 / 粛声の祈り手ロー（結界が張られる前）",
        priority: "high",
      },
      impulse: {
        target: "粛声なる祈りの儀式召喚 / ローの墓地蘇生",
        priority: "high",
      },
      ogre: {
        target:
          "粛声なる結界（永続魔法のため破壊でサーチ不発＆対象耐性も解除）",
        priority: "high",
      },
      belle: {
        target: "粛声なる祈りの墓地効果 / 粛声の祈り手ローの墓地蘇生",
        priority: "medium",
      },
      nibiru: {
        target: "召喚回数が少なく、発動条件を満たしにくい",
        priority: "low",
      },
      droll: {
        target:
          "結界・下準備・サフィラ等の最初のサーチ後（後続のサーチをまとめて止められる）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
];
