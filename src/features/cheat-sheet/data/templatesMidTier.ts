import { createStandardHandTrapMemos } from "../domain/search";
import type { CheatSheetEntry } from "../domain/types";

const TEMPLATE_TIMESTAMP = "2026-11-27T00:00:00.000Z";

/**
 * Tier 4 全6テーマ ＋ Tier 5 前半の環境人気テーマ（計13テーマ）
 */
export const MID_TIER_TEMPLATES: readonly CheatSheetEntry[] = [
  // --- Tier 4 ---
  {
    id: "tpl-killer-tune",
    themeName: "キラーチューン",
    aliases: ["キラチュ", "トラックメイカー", "ジュークジョイント"],
    signatureCards: [
      "キラーチューン・ミクス",
      "キラーチューン・レコ",
      "キラーチューン・キュー",
      "キラーチューン・クリップ",
      "キラーチューン・ロタリー",
      "キラーチューン・シンクロ",
      "ジュークジョイント“Killer Tune”",
    ],
    tier: "tier4",
    deckType: "展開型",
    summonMethods: ["シンクロ"],
    summary:
      "チューナー同士で手札シンクロ・相手ターンシンクロを行うテーマ。初動下級（ミクス・レコ・キュー）のサーチやトラックメイカーへの着地妨害で展開を寸断したい。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "キラーチューン・ミクス / レコ / キュー / キラーチューン・シンクロ",
        priority: "high",
      },
      "maxx-c": {
        target: "初動展開・手札シンクロ開始時（相手ターンSでもドロー可能）",
        priority: "high",
      },
      fuwalos: {
        target: "EXからの連続シンクロ展開前（非常に有効）",
        priority: "high",
      },
      "imperm-veiler": {
        target: "キラーチューン・ミクス / レコ / トラックメイカー",
        priority: "high",
      },
      impulse: {
        target: "キューのリクルート / 相手ターンシンクロ効果",
        priority: "high",
      },
      ogre: {
        target: "ジュークジョイント / 場で起動するシンクロモンスター",
        priority: "medium",
      },
      belle: {
        target: "墓地からの回収・蘇生効果",
        priority: "medium",
      },
      nibiru: {
        target: "シンクロ連打の5体目（相手ターンS妨害が整う前に流す）",
        priority: "high",
      },
      droll: {
        target: "ミクスやレコの最初のサーチ後（手札シンクロ素材確保を阻害）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-blitzkrieg",
    themeName: "ブリッツクリーク",
    aliases: ["雷族", "クーロン", "ブリッツ"],
    signatureCards: [
      "エミ・ブリッツクリーク",
      "グレイン・ブリッツクリーク",
      "クラック・ブリッツクリーク",
      "サージ・ブリッツクリーク",
      "ウィスカ・ブリッツクリーク",
      "天空城塞クーロン",
      "神鳴り",
    ],
    tier: "tier4",
    deckType: "ミッド型",
    summonMethods: ["効果モンスター"],
    summary:
      "場のカードを対象破壊しながら手札から雷族を連続展開するテーマ。手札からの特殊召喚が主軸のため増殖するGとプルリアが直撃する一方、フワロスは刺さりにくい点に注意。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target: "サーチ効果持ちのブリッツクリーク / 天空城塞クーロン",
          priority: "high",
        },
        "maxx-c": {
          target: "手札公開からの共通展開効果チェーン（手札SSが多く高効率）",
          priority: "high",
        },
        fuwalos: {
          target:
            "手札からの特殊召喚中心のためドロー対象外になりやすい（注意）",
          priority: "low",
        },
        "imperm-veiler": {
          target: "場に着地した展開・サーチ要員のブリッツクリーク",
          priority: "medium",
        },
        impulse: {
          target: "手札からの共通特殊召喚効果（展開と破壊を同時にストップ）",
          priority: "high",
        },
        ogre: {
          target: "天空城塞クーロン / 場で起動する効果",
          priority: "medium",
        },
        belle: {
          target: "墓地回収・蘇生効果",
          priority: "low",
        },
        nibiru: {
          target: "手札展開で5体並んだタイミング",
          priority: "medium",
        },
        droll: {
          target: "最初のサーチ後（手札リソース補充を止めて息切れさせる）",
          priority: "high",
        },
      },
      [
        {
          id: "purulia",
          label: "マルチャミー・プルリア",
          target: "手札からの特殊召喚連打に大量ドローが狙える特効カード",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-mitsurugi",
    themeName: "巳剣",
    aliases: ["みつるぎ", "アメノムラクモ", "巳剣降臨"],
    signatureCards: [
      "天叢雲之巳剣",
      "布都御魂之巳剣",
      "天羽々斬之巳剣",
      "巳剣之尊 麁正",
      "巳剣之尊 佐士",
      "巳剣之尊 草那藝",
      "巳剣降臨",
      "巳剣之神鏡",
    ],
    tier: "tier4",
    deckType: "ミッド型",
    summonMethods: ["儀式", "エクシーズ"],
    summary:
      "リリース時効果と専用儀式魔法「巳剣降臨」で展開する爬虫類族・儀式テーマ。サーチ回数が非常に多いためドロールが天敵。墓地の儀式体の自己蘇生を除外する動きも致命傷。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target: "巳剣降臨（デッキ儀式） / 天羽々斬之巳剣 / 儀式の下準備",
          priority: "high",
        },
        "maxx-c": {
          target: "儀式召喚・自己蘇生チェーン",
          priority: "high",
        },
        fuwalos: {
          target: "デッキ儀式やランク4・8展開に入るタイミング",
          priority: "medium",
        },
        "imperm-veiler": {
          target: "巳剣之尊 麁正 / 佐士 / 場の儀式モンスター",
          priority: "high",
        },
        impulse: {
          target: "巳剣降臨 / 儀式モンスターの墓地自己蘇生",
          priority: "high",
        },
        ogre: {
          target: "永続サポート / エクシーズの起動効果",
          priority: "low",
        },
        belle: {
          target: "儀式モンスターの自己蘇生効果 / 墓地回収効果",
          priority: "high",
        },
        nibiru: {
          target: "エクシーズ展開まで伸ばした5体目",
          priority: "medium",
        },
        droll: {
          target: "最初のサーチ後（連鎖サーチを全て止める最大の天敵）",
          priority: "high",
        },
      },
      [
        {
          id: "bystial",
          label: "深淵の獣（ビーステッド）",
          target: "墓地の巳剣儀式モンスター（闇属性）を自己蘇生に合わせて除外",
          priority: "high",
        },
        {
          id: "dd-crow",
          label: "D.D.クロウ",
          target: "墓地の儀式モンスターの自己蘇生を除外で潰す",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-phantom-knights",
    themeName: "幻影騎士団",
    aliases: ["ファントムナイツ", "ティアースケイル", "バルディッシュ"],
    signatureCards: [
      "幻影騎士団ティアースケイル",
      "幻影騎士団サイレントブーツ",
      "幻影騎士団ダスティローブ",
      "幻影騎士団ラギッドグローブ",
      "幻影騎士団ラスティ・バルディッシュ",
      "幻影霧剣",
      "RUM－ファントム・フォース",
    ],
    tier: "tier4",
    deckType: "展開型",
    summonMethods: ["エクシーズ", "リンク"],
    summary:
      "レベル3闇属性と墓地除外効果を駆使してバルディッシュから制圧盤面を作る展開テーマ。バルディッシュへの無効妨害や、墓地除外を封じるロンギヌス・ビーステッドが刺さる。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "幻影騎士団ティアースケイル / ラスティ・バルディッシュ / サイレントブーツ",
          priority: "high",
        },
        "maxx-c": {
          target: "レベル3展開・ケルビーニやブレイクソード召喚前",
          priority: "high",
        },
        fuwalos: {
          target: "EXからのリンク・エクシーズ展開開始前",
          priority: "high",
        },
        "imperm-veiler": {
          target:
            "幻影騎士団ラスティ・バルディッシュ（最優先） / ティアースケイル",
          priority: "high",
        },
        impulse: {
          target: "ブレイクソードの蘇生効果 / RUMによるランクアップ",
          priority: "high",
        },
        ogre: {
          target: "ラスティ・バルディッシュ / ケルビーニの起動効果",
          priority: "medium",
        },
        belle: {
          target: "幻影霧剣の墓地蘇生 / ティアースケイルの自己蘇生",
          priority: "medium",
        },
        nibiru: {
          target: "アポロウーサや無効妨害成立前の5体目",
          priority: "high",
        },
        droll: {
          target: "ダスティローブやブーツのサーチ後",
          priority: "medium",
        },
      },
      [
        {
          id: "lancea",
          label: "アーティファクト－ロンギヌス",
          target: "墓地からの幻影騎士団・幻影罠の除外効果をまとめて封鎖",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-vsk9",
    themeName: "VSK9",
    aliases: [
      "ヴァンキッシュソウル",
      "K9",
      "VS",
      "イヅナ",
      "ホーリースー",
      "ラゼン",
    ],
    signatureCards: [
      "ＶＳ ラゼン",
      "ＶＳ Ｄｒ.マッドラヴ",
      "ＶＳ ヘヴィ・ボーガー",
      "ＶＳ 蛟龍",
      "VS ホーリー・スー",
      "K９－１７号 イヅナ",
      "K９－ØØ号 ルプス",
      "K９－０４号 咒",
      "K９－６６a号 ヨクル",
      "Ｓｔａｋｅ Ｙｏｕｒ Ｓｏｕｌ！",
    ],
    tier: "tier4",
    deckType: "ミッド型",
    summonMethods: ["エクシーズ", "リンク"],
    summary:
      "VSの属性公開ギミックとK9の相手ターン展開を組み合わせた中速テーマ。モンスター誘発にはイヅナ・ルプスが反応するため、無限泡影やドミナス系など罠誘発が特に有効。ドロールも直撃。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "Ｓｔａｋｅ Ｙｏｕｒ Ｓｏｕｌ！ / ＶＳ ラゼン（イヅナ反応に注意）",
          priority: "high",
        },
        "maxx-c": {
          target:
            "特殊召喚効果チェーン（ただしイヅナ誘発のトリガーになり得る点に注意）",
          priority: "medium",
        },
        fuwalos: {
          target: "EXからのK9エクシーズ・闘神の虚像展開前",
          priority: "medium",
        },
        "imperm-veiler": {
          target:
            "無限泡影はイヅナを踏まずにラゼン・マッドラヴ・ヨクルを止められて優秀",
          priority: "high",
        },
        impulse: {
          target:
            "罠誘発のためイヅナを踏まずにホーリー・スーや特殊召喚効果を無効化できる",
          priority: "high",
        },
        ogre: {
          target: "闘神の虚像 / 場のVSモンスター起動効果",
          priority: "medium",
        },
        belle: {
          target: "闘神の虚像の回収・蘇生効果",
          priority: "medium",
        },
        nibiru: {
          target:
            "5回未満で止まりやすく、K9展開でもケアされやすいため優先度低め",
          priority: "low",
        },
        droll: {
          target:
            "ラゼンやマッドラヴの最初のサーチ後（属性確保を崩せるため直撃）",
          priority: "high",
        },
      },
      [
        {
          id: "purge",
          label: "聖王の粉砕",
          target:
            "罠誘発のためイヅナを踏まずにラゼン・マッドラヴ・Stake Your Soulを無効",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-maliss",
    themeName: "M∀LICE",
    aliases: ["マリス", "ホワイトラビット", "ドーマウス", "マーチヘア"],
    signatureCards: [
      "M∀LICE＜P＞White Rabbit",
      "M∀LICE＜P＞Dormouse",
      "M∀LICE＜P＞Cheshire Cat",
      "M∀LICE＜P＞March Hare",
      "M∀LICE IN UNDERGROUND",
      "M∀LICE＜C＞MTP－０７",
      "M∀LICE＜Q＞HEARTS OF CRYPTER",
    ],
    tier: "tier4",
    deckType: "展開型",
    summonMethods: ["リンク"],
    summary:
      "自身の除外と帰還を繰り返して大量リンク展開するサイバーステーマ。除外を封じるロンギヌスが最大の天敵で、増殖するG・フワロス・ニビルなどの展開メタも強く刺さる。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "M∀LICE IN UNDERGROUND / サイバネット・マイニング / ドロー効果",
          priority: "high",
        },
        "maxx-c": {
          target:
            "除外からの帰還効果チェーン（展開回数が非常に多く致命傷になる）",
          priority: "high",
        },
        fuwalos: {
          target: "リンク展開開始前（EXからの連打で大量ドローが狙える）",
          priority: "high",
        },
        "imperm-veiler": {
          target: "M∀LICE＜P＞Dormouse / White Rabbit / リンク3マリス",
          priority: "high",
        },
        impulse: {
          target: "除外からの帰還効果 / 展開系リンクの蘇生効果",
          priority: "high",
        },
        ogre: {
          target: "M∀LICE IN UNDERGROUND / 展開途中のリンクモンスター",
          priority: "medium",
        },
        belle: {
          target: "墓地除外を伴うマリス罠・マーチヘアの起動効果",
          priority: "medium",
        },
        nibiru: {
          target: "リンク値が伸びたタイミング（無効妨害成立前に一掃）",
          priority: "high",
        },
        droll: {
          target:
            "マイニングやチェシャキャット後の追加サーチ抑制（ただし除外展開自体は止まりにくい）",
          priority: "low",
        },
      },
      [
        {
          id: "lancea",
          label: "アーティファクト－ロンギヌス",
          target:
            "スタンバイ〜初動で発動し、除外ギミック全体を1ターン完全停止（最優先メタ）",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },

  // --- Tier 5（前半） ---
  {
    id: "tpl-ryzeal",
    themeName: "ライゼオル",
    aliases: ["デッドネーダー", "デュオドライブ", "エクス", "アイス"],
    signatureCards: [
      "エクス・ライゼオル",
      "アイス・ライゼオル",
      "ソード・ライゼオル",
      "ノード・ライゼオル",
      "スター・ライゼオル",
      "ライゼオル・デッドネーダー",
      "ライゼオル・デュオドライブ",
      "ライゼオル・クロス",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["エクシーズ"],
    summary:
      "ランク4を高速展開してデッドネーダー＋クロスで制圧するエクシーズテーマ。2枚サーチの要であるデュオドライブをうらら・泡影・うさぎで止めるのが最重要。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "ライゼオル・デュオドライブ（2枚サーチ・最優先） / アイス・ライゼオル",
        priority: "high",
      },
      "maxx-c": {
        target: "手札からのSS効果チェーン / エクシーズ展開開始時",
        priority: "high",
      },
      fuwalos: {
        target:
          "ランク4エクシーズ連打前（デュオドライブ＋デッドネーダーで2ドロー以上）",
        priority: "high",
      },
      "imperm-veiler": {
        target:
          "ライゼオル・デュオドライブ（最優先） / デッドネーダー（捲り時）",
        priority: "high",
      },
      impulse: {
        target: "アイス・ライゼオルのリクルート / プラグインによる蘇生",
        priority: "high",
      },
      ogre: {
        target:
          "ライゼオル・デュオドライブ（処理時に素材を取り除けず不発にできる・超有効） / クロス",
        priority: "high",
      },
      belle: {
        target: "ライゼオル・プラグイン / ノード・ライゼオルの蘇生効果",
        priority: "medium",
      },
      nibiru: {
        target: "クロス（モンスター効果無効）成立前の5体目",
        priority: "medium",
      },
      droll: {
        target: "エクスやソードのサーチ後（デュオドライブの2枚サーチを封鎖）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-white-forest-azamina",
    themeName: "白き森アザミナ",
    aliases: ["白き森", "アザミナ", "リゼット", "シルヴィ", "ディアベルスター"],
    signatureCards: [
      "白き森の聖徒リゼット",
      "白き森のリゼット",
      "白き森のシルヴィ",
      "白き森の魔女",
      "白き森の罪宝",
      "罪宝の欺き",
      "アザミナ・オフェイレーテス",
      "白魔女ディアベルゼ",
    ],
    tier: "tier5",
    deckType: "展開型",
    summonMethods: ["シンクロ", "融合"],
    summary:
      "魔法・罠コストで展開する白き森と、万能無効シルヴィアを立てるアザミナギミックの複合テーマ。万能無効が立つ前の初動サーチ（欺き・リゼット・シルヴィ）やドロールが有効。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "罪宝の欺き / 白き森の聖徒リゼット / 白き森のシルヴィ",
        priority: "high",
      },
      "maxx-c": {
        target: "リゼット手札効果チェーン / シンクロ・融合展開開始時",
        priority: "high",
      },
      fuwalos: {
        target: "EXからの融合・シンクロ連打前",
        priority: "high",
      },
      "imperm-veiler": {
        target: "白き森のシルヴィ / 白き森の魔性ルシエラ / 魔狼シルウィア",
        priority: "high",
      },
      impulse: {
        target: "白き森の聖徒リゼット / 聖なる薊花の融合召喚",
        priority: "high",
      },
      ogre: {
        target: "罪宝の欺き（永続魔法のため破壊で効果不発） / 白き森の魔女",
        priority: "high",
      },
      belle: {
        target: "白き森モンスターの墓地蘇生効果 / アザミナ罠の墓地効果",
        priority: "medium",
      },
      nibiru: {
        target: "背信聖徒シルヴィア（万能無効）成立前の5体目",
        priority: "high",
      },
      droll: {
        target: "最初のサーチ後（白き森・罪宝双方の連続サーチを広く停止）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-primite-blue-eyes",
    themeName: "原石青眼",
    aliases: ["ブルーアイズ", "青眼", "原石", "アナザーベリル", "真の光"],
    signatureCards: [
      "青眼の白龍",
      "原石竜アナザー・ベリル",
      "原石の皇脈",
      "原石の穿光",
      "青き眼の賢士",
      "白き乙女",
      "青き眼の祈り",
      "真の光",
      "青眼の精霊龍",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["シンクロ", "リンク"],
    summary:
      "原石の継戦力と青眼のシンクロ制圧を合わせた安定テーマ。毎ターンアドを稼ぐ「真の光」の除去（破壊時は相手モンスターも全壊）と、祈り・皇脈・ベリルへの妨害が鍵。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "青き眼の祈り（最優先） / 原石の皇脈 / 青き眼の賢士",
        priority: "high",
      },
      "maxx-c": {
        target: "精霊龍・リンク展開開始時（ただし1〜2ドローで止まりやすい）",
        priority: "medium",
      },
      fuwalos: {
        target: "青眼龍轟臨やシンクロ展開に入るタイミング",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "青き眼の賢士 / 青き眼の精霊 / 原石竜アナザー・ベリル",
        priority: "high",
      },
      impulse: {
        target: "青眼龍轟臨 / 真の光の蘇生 / 精霊龍の変身効果",
        priority: "high",
      },
      ogre: {
        target:
          "真の光（破壊すると相手モンスター全破壊のデメリットが発動・最強） / 原石の皇脈",
        priority: "high",
      },
      belle: {
        target: "真の光の墓地蘇生 / 白き乙女の蘇生効果 / 原石の穿光回収",
        priority: "high",
      },
      nibiru: {
        target: "青眼の精霊龍（墓地・SS妨害）成立前の5体目",
        priority: "medium",
      },
      droll: {
        target: "賢士や皇脈のサーチ後（青き眼の祈り等の連鎖サーチを止める）",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-tearlaments",
    themeName: "ティアラメンツ",
    aliases: ["ティアラ", "シェイレーン", "キトカロス", "ルルカロス"],
    signatureCards: [
      "ティアラメンツ・シェイレーン",
      "ティアラメンツ・レイノハート",
      "ティアラメンツ・ハゥフニス",
      "ティアラメンツ・メイルゥ",
      "ティアラメンツ・クシャトリラ",
      "ティアラメンツ・キトカロス",
      "ティアラメンツ・ルルカロス",
      "壱世壊＝ペルレイノ",
    ],
    tier: "tier5",
    deckType: "展開型",
    summonMethods: ["融合"],
    summary:
      "墓地肥やしからの墓地融合で爆発的に展開する融合テーマ。キトカロスへの無効妨害や、墓地融合効果にチェーンして墓地モンスターを除外する動き（ビーステッド・D.D.クロウ・わらし）が直撃する。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "ティアラメンツ・キトカロス（墓地送り・サーチ） / シェイレーン",
          priority: "high",
        },
        "maxx-c": {
          target: "シェイレーンや墓地融合効果チェーン",
          priority: "high",
        },
        fuwalos: {
          target: "EXからの融合連打前",
          priority: "high",
        },
        "imperm-veiler": {
          target: "ティアラメンツ・キトカロス（最優先） / レイノハート",
          priority: "high",
        },
        impulse: {
          target: "ティアラメンツ下級の墓地融合効果 / シェイレーンの特殊召喚",
          priority: "high",
        },
        ogre: {
          target: "壱世壊＝ペルレイノ / 壱世壊を劈く弦声",
          priority: "medium",
        },
        belle: {
          target:
            "ティアラメンツ下級の墓地融合効果（デッキ戻しを含むため直撃）",
          priority: "high",
        },
        nibiru: {
          target: "ルルカロス（SS無効）成立前の5体目",
          priority: "medium",
        },
        droll: {
          target: "サーチより墓地肥やしが主体のため刺さりにくい",
          priority: "low",
        },
      },
      [
        {
          id: "bystial",
          label: "深淵の獣（ビーステッド）",
          target:
            "墓地融合を発動したティアラメンツ（闇属性）をチェーン除外して融合不発",
          priority: "high",
        },
        {
          id: "dd-crow",
          label: "D.D.クロウ",
          target:
            "墓地融合を発動したティアラメンツをチェーン除外して融合不発にする",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-kashtira",
    themeName: "クシャトリラ",
    aliases: ["クシャ", "フェンリル", "ユニコーン", "アライズハート"],
    signatureCards: [
      "クシャトリラ・ユニコーン",
      "クシャトリラ・フェンリル",
      "クシャトリラ・ライズハート",
      "クシャトリラ・オーガ",
      "六世壊＝パライゾス",
      "六世壊他化自在天",
      "クシャトリラ・バース",
      "クシャトリラ・アライズハート",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["エクシーズ"],
    summary:
      "裏側除外とアライズハートの全体除外で制圧するレベル7エクシーズテーマ。効果無効妨害を持たないため泡影や捲り札が通りやすく、パーピヤス（他化自在天）を止めるのが急所。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "六世壊他化自在天（パーピヤス・最優先） / 六世壊＝パライゾス",
        priority: "high",
      },
      "maxx-c": {
        target:
          "パーピヤス発動時（ユニコーン等はチェーンを組まないためドローフェイズ撃ちも検討）",
        priority: "medium",
      },
      fuwalos: {
        target: "パーピヤス発動時（デッキSS＋ランク7展開でドロー）",
        priority: "medium",
      },
      "imperm-veiler": {
        target:
          "クシャトリラ・ユニコーン / ライズハート / 捲り時のアライズハート",
        priority: "high",
      },
      impulse: {
        target: "六世壊他化自在天（パーピヤス） / クシャトリラ・バースの蘇生",
        priority: "high",
      },
      ogre: {
        target: "クシャトリラ・バース / 場で起動したユニコーン・フェンリル",
        priority: "high",
      },
      belle: {
        target: "クシャトリラ・バースの蘇生・帰還効果",
        priority: "medium",
      },
      nibiru: {
        target:
          "シャングリラ＋アライズハート成立後の5体目（5回未満で止まる場合もあり）",
        priority: "medium",
      },
      droll: {
        target: "パライゾスやユニコーンの最初のサーチ後",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-orcust",
    themeName: "オルフェゴール",
    aliases: ["オルフェ", "ギルス", "ガラテア", "ディンギルス"],
    signatureCards: [
      "宵星の騎士ギルス",
      "オルフェゴール・ディヴェル",
      "オルフェゴール・スケルツォン",
      "オルフェゴール・トロイメア",
      "オルフェゴール・バベル",
      "オルフェゴール・ガラテア",
      "宵星の機神ディンギルス",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["リンク", "エクシーズ"],
    summary:
      "墓地のオルフェゴールを除外してリンク・エクシーズ展開する闇属性機械族テーマ。分岐が少ないため初動のディヴェル・ガラテア止めや、墓地・除外メタ（ロンギヌス・ビーステッド）が致命傷。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "オルフェゴール・ディヴェル（最優先） / 宵星の騎士ギルス / ガラテア",
          priority: "high",
        },
        "maxx-c": {
          target: "ディヴェル・スケルツォン等の墓地除外展開チェーン",
          priority: "high",
        },
        fuwalos: {
          target: "デッキリクルート＋EXリンク展開に入るタイミング",
          priority: "high",
        },
        "imperm-veiler": {
          target: "宵星の騎士ギルス / オルフェゴール・ガラテア / ディンギルス",
          priority: "high",
        },
        impulse: {
          target: "オルフェゴール・ディヴェル / スケルツォン",
          priority: "high",
        },
        ogre: {
          target: "オルフェゴール・バベル / ガラテア",
          priority: "medium",
        },
        belle: {
          target: "オルフェゴール・スケルツォン / ガラテアのデッキ戻し効果",
          priority: "high",
        },
        nibiru: {
          target: "クリマクス（カウンター罠）セット前の5体目",
          priority: "medium",
        },
        droll: {
          target: "デッキから直接セット・墓地送りが多いため刺さりにくい",
          priority: "low",
        },
      },
      [
        {
          id: "lancea",
          label: "アーティファクト－ロンギヌス",
          target: "墓地除外コストを封じ、オルフェゴール共通展開を丸ごと停止",
          priority: "high",
        },
        {
          id: "bystial",
          label: "深淵の獣（ビーステッド）",
          target:
            "墓地のディヴェル・スケルツォン（闇属性）を除外して展開を寸断",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-millennium-exodia",
    themeName: "千年エクゾディア",
    aliases: ["千年", "エクゾディア", "千年の十字", "幻の召喚神"],
    signatureCards: [
      "千年の眠りから覚めし原人",
      "千年の宝を守りしゴーレム",
      "千年王朝の盾",
      "石版の神殿",
      "千年の十字",
      "幻の召喚神エクゾディア",
      "怒りの業火 エクゾード・フレイム",
    ],
    tier: "tier5",
    deckType: "ミッド型",
    summonMethods: ["融合"],
    summary:
      "千年モンスターから「千年の十字」をサーチし、幻の召喚神エクゾディア＋全体破壊罠で戦うテーマ。原人・ゴーレムのサーチを止めて十字へのアクセスを断つのが最優先。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "千年の宝を守りしゴーレム（石版の神殿サーチ） / 原人 / 千年の十字",
        priority: "high",
      },
      "maxx-c": {
        target:
          "千年モンスターの魔法罠ゾーンからのSS時（1〜2ドロー止まりが多い）",
        priority: "low",
      },
      fuwalos: {
        target: "千年の十字発動時（1ドローになりやすいため優先度低め）",
        priority: "low",
      },
      "imperm-veiler": {
        target:
          "幻の召喚神エクゾディア（魔法罠無効とセット効果を消す） / ゴーレム",
        priority: "high",
      },
      impulse: {
        target: "千年の十字（幻の召喚神エクゾディアの特殊召喚を直接無効）",
        priority: "high",
      },
      ogre: {
        target:
          "石版の神殿 / 魔法罠ゾーンから起動する原人・ゴーレム（破壊でSS不発）",
        priority: "high",
      },
      belle: {
        target: "エクゾード・フレイムの墓地効果",
        priority: "low",
      },
      nibiru: {
        target: "召喚回数が少なく発動機会がほとんどない",
        priority: "low",
      },
      droll: {
        target:
          "原人・ゴーレムの最初のサーチ後（千年の十字への連鎖サーチを停止）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
];
