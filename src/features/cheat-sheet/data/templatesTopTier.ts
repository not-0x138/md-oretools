import { createStandardHandTrapMemos } from "../domain/search";
import type { CheatSheetEntry } from "../domain/types";

const TEMPLATE_TIMESTAMP = "2026-11-27T00:00:00.000Z";

/**
 * Tier 1〜Tier 3 の環境上位テーマ（10テーマ）
 */
export const TOP_TIER_TEMPLATES: readonly CheatSheetEntry[] = [
  // --- Tier 1 ---
  {
    id: "tpl-dragon-tail",
    themeName: "ドラゴンテイル",
    aliases: ["星辰", "ファイメナ", "ドラテ"],
    signatureCards: [
      "星辰砲手ファイメナ",
      "星辰槍手ルキアス",
      "星辰竜ムルル",
      "星辰竜ウルグラ",
      "星辰竜パーン",
      "羅睺星辰",
      "星辰爪竜アルザリオン",
      "計都星辰",
    ],
    tier: "tier1",
    deckType: "ミッド型",
    summonMethods: ["融合"],
    summary:
      "融合素材が墓地へ送られると魔法・罠をセットして継戦する融合テーマ。ファイメナやラーフへ繋ぐルキアス・ケートゥを止めて融合自体をさせないのが基本。墓地除外も強く刺さる。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target:
            "羅睺星辰（ラーフ） / 星辰槍手ルキアス / 計都星辰（ケートゥ）",
          priority: "high",
        },
        "maxx-c": {
          target: "融合効果チェーン / ファイメナの相手ターン融合発動時",
          priority: "high",
        },
        fuwalos: {
          target: "融合召喚の連続展開前（EXからの特殊召喚でドローを狙う）",
          priority: "medium",
        },
        "imperm-veiler": {
          target: "星辰槍手ルキアス / 星辰竜ムルル / 星辰爪竜アルザリオン",
          priority: "high",
        },
        impulse: {
          target: "羅睺星辰 / ファイメナの融合効果（特殊召喚を直接無効）",
          priority: "high",
        },
        ogre: {
          target: "場の融合モンスター起動効果 / 永続系サポート",
          priority: "low",
        },
        belle: {
          target: "墓地からの回収効果（アルザリオン等）",
          priority: "medium",
        },
        nibiru: {
          target: "召喚回数が5回未満で止まりやすいため優先度低め",
          priority: "low",
        },
        droll: {
          target: "ルキアスやケートゥの最初のサーチ後（追加サーチを抑制）",
          priority: "medium",
        },
      },
      [
        {
          id: "dd-crow",
          label: "D.D.クロウ",
          target:
            "融合素材として墓地へ送られた星辰モンスターや回収対象を除外して継戦を断つ",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },

  // --- Tier 2 ---
  {
    id: "tpl-elfen-notes",
    themeName: "エルフェンノーツ",
    aliases: ["耀聖", "獄神精", "メディウス"],
    signatureCards: [
      "耀聖の風詩レギナ",
      "耀聖の花詩ルキナ",
      "耀聖の波詩ディーナ",
      "耀聖の月詩フォルトナ",
      "燿ける聖詩の獄神精",
      "無垢なる者 メディウス",
      "混絶獄神ヴィードリウム",
      "絶解なる獄神門－テルミナス",
    ],
    tier: "tier2",
    deckType: "展開型",
    summonMethods: ["シンクロ", "リンク"],
    summary:
      "中央のメインモンスターゾーンが空いている条件で手札展開するシンクロテーマ。獄神精への妨害や、ニビル等で中央ゾーンを埋める動きが強烈に刺さる。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "燿ける聖詩の獄神精 / 耀聖の花詩ルキナ / 絶解なる獄神門－テルミナス",
        priority: "high",
      },
      "maxx-c": {
        target: "手札からの特殊召喚チェーン / シンクロ展開の起点",
        priority: "high",
      },
      fuwalos: {
        target: "EXデッキからのシンクロ・リンク展開開始前",
        priority: "high",
      },
      "imperm-veiler": {
        target: "燿ける聖詩の獄神精（最優先） / 無垢なる者 メディウス / レギナ",
        priority: "high",
      },
      impulse: {
        target: "手札・デッキからの特殊召喚効果 / 獄神精の展開効果",
        priority: "high",
      },
      ogre: {
        target: "主力の永続魔法・罠 / 場の中央ゾーンで発動した効果",
        priority: "high",
      },
      belle: {
        target: "墓地からの蘇生・回収効果",
        priority: "medium",
      },
      nibiru: {
        target:
          "5体展開後（トークンで中央ゾーンを埋められると後続も停止しやすい）",
        priority: "high",
      },
      droll: {
        target: "ルキナやテルミナスの最初のサーチ後",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-artmegia",
    themeName: "アルトメギア",
    aliases: ["神芸学徒", "神芸学都", "メディウス"],
    signatureCards: [
      "神芸学都アルトメギア",
      "神芸学徒 ファインメルト",
      "神芸学徒 グラフレア",
      "神芸学徒 リテラ",
      "アルトメギアの獄神獣",
      "アルトメギア・バーニッシュ－改変－",
      "無垢なる者 メディウス",
    ],
    tier: "tier2",
    deckType: "ミッド型",
    summonMethods: ["融合", "リンク"],
    summary:
      "フィールド魔法「神芸学都アルトメギア」による連続サーチで複数種族を揃えて制圧する融合テーマ。学都への妨害とドロールによるサーチ封鎖が最優先。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "神芸学都アルトメギアのサーチ / バーニッシュ－改変－ / 獄神獣",
        priority: "high",
      },
      "maxx-c": {
        target: "特殊召喚効果チェーン（複数展開するため通りやすい）",
        priority: "high",
      },
      fuwalos: {
        target: "融合・リンク展開に入るタイミング",
        priority: "high",
      },
      "imperm-veiler": {
        target: "無垢なる者 メディウス / ファインメルト / リテラ",
        priority: "high",
      },
      impulse: {
        target: "融合召喚・リクルートを含む展開効果",
        priority: "high",
      },
      ogre: {
        target: "神芸学都アルトメギア（サーチ効果発動時に破壊が直撃）",
        priority: "high",
      },
      belle: {
        target: "墓地からの蘇生・融合素材回収効果",
        priority: "medium",
      },
      nibiru: {
        target: "制圧融合モンスターの無効効果が並ぶ前に5体目で発動",
        priority: "high",
      },
      droll: {
        target: "学都などの最初のサーチ後（連続サーチを丸ごと封鎖できる）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-sky-striker",
    themeName: "閃刀姫",
    aliases: ["せんとうき", "レイ", "エンゲージ", "カガリ"],
    signatureCards: [
      "閃刀姫－レイ",
      "閃刀姫－ロゼ",
      "閃刀起動－エンゲージ",
      "閃刀起動－リンケージ",
      "閃刀機－ウィドウアンカー",
      "閃刀機－ホーネットビット",
      "閃刀亜式－レムニスゲート",
      "閃刀姫－カガリ",
      "閃刀姫－シズク",
    ],
    tier: "tier2",
    deckType: "ミッド型",
    summonMethods: ["リンク"],
    summary:
      "エンゲージのサーチと墓地レイの自己蘇生で戦う魔法軸リンクテーマ。エンゲージを止めることと、墓地のレイを除外して後続を断つことが攻略の鍵。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target: "閃刀起動－エンゲージ（最優先） / 閃刀姫－シズク",
          priority: "high",
        },
        "maxx-c": {
          target:
            "リンケージやホーネットビット発動時（ドロー枚数は伸びにくい）",
          priority: "low",
        },
        fuwalos: {
          target: "リンク召喚連打時（ただし1〜2ドローで止まりやすい）",
          priority: "low",
        },
        "imperm-veiler": {
          target: "閃刀姫－カガリ（エンゲージ回収阻止） / 閃刀姫－シズク",
          priority: "high",
        },
        impulse: {
          target: "閃刀起動－リンケージ / レイの墓地蘇生効果",
          priority: "medium",
        },
        ogre: {
          target: "マルチロール / エリアゼロの起動効果",
          priority: "medium",
        },
        belle: {
          target: "閃刀姫－カガリの墓地回収 / レイの墓地蘇生 / レムニスゲート",
          priority: "high",
        },
        nibiru: {
          target: "召喚回数が少なく発動機会はほぼない",
          priority: "low",
        },
        droll: {
          target:
            "エンゲージや増援の最初のサーチ後（連打・ドローを完全に封鎖）",
          priority: "high",
        },
      },
      [
        {
          id: "bystial",
          label: "深淵の獣（ビーステッド）",
          target:
            "墓地の閃刀姫－レイ（闇属性）をフリーチェーン除外して継戦を断つ",
          priority: "high",
        },
        {
          id: "dd-crow",
          label: "D.D.クロウ",
          target: "墓地の閃刀姫－レイ / カガリ対象のエンゲージを除外",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },

  // --- Tier 3 ---
  {
    id: "tpl-witchcrafter",
    themeName: "ウィッチクラフト",
    aliases: ["ウィッチ", "魔女の聖夜行", "バイスマスター"],
    signatureCards: [
      "魔女の聖夜行",
      "ウィッチクラフト・シュミッタ",
      "ウィッチクラフト・ピットレ",
      "ウィッチクラフト・ジェニー",
      "ウィッチクラフト・ハイネ",
      "ウィッチクラフトマスター・ヴェール",
      "ウィッチクラフト・バイスマスター",
      "ウィッチクラフト・バイストリート",
      "ウィッチクラフト・マルカ",
    ],
    tier: "tier3",
    deckType: "ミッド型",
    summonMethods: ["融合"],
    summary:
      "下級のコスト付きリクルート効果と「魔女の聖夜行」を軸に魔法を循環させるテーマ。初動の下級共通効果を止めると手札消費が大きく、聖夜行へのうさぎも直撃する。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "下級ウィッチクラフトのリクルート共通効果（コストが重く大打撃）",
        priority: "high",
      },
      "maxx-c": {
        target: "下級リクルート効果チェーン / 融合召喚時",
        priority: "medium",
      },
      fuwalos: {
        target: "デッキからのリクルート・EXからのバイスマスター展開時",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "下級ウィッチクラフトの共通効果 / バイスマスター / ヴェール",
        priority: "high",
      },
      impulse: {
        target: "下級リクルート効果 / コンフュージョン等の融合効果",
        priority: "high",
      },
      ogre: {
        target: "魔女の聖夜行（最優先で破壊） / バイスマスター",
        priority: "high",
      },
      belle: {
        target: "ウィッチクラフト・ジェニーの墓地効果 / 墓地蘇生・回収魔法",
        priority: "medium",
      },
      nibiru: {
        target: "召喚回数が5回に達しにくいため優先度低め",
        priority: "low",
      },
      droll: {
        target:
          "クリエイション等のサーチ後（ただしエンド回収は止まらない点に注意）",
        priority: "low",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-invoked",
    themeName: "召喚獣",
    aliases: ["アレイスター", "召喚魔術", "メルカバー"],
    signatureCards: [
      "召喚師アレイスター",
      "召喚魔術",
      "暴走魔法陣",
      "召喚獣メルカバー",
      "召喚獣アウゴエイデス",
      "追憶のアレイスター",
      "法の神霊アイワス",
    ],
    tier: "tier3",
    deckType: "ミッド型",
    summonMethods: ["融合"],
    summary:
      "アレイスター1枚から召喚魔術へ繋ぎメルカバー等の融合体で制圧する安定型テーマ。アレイスターのサーチ阻止か、召喚魔術の墓地融合対象を除外すると動きが止まる。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "召喚師アレイスター（サーチ効果） / 暴走魔法陣",
        priority: "high",
      },
      "maxx-c": {
        target: "召喚魔術発動時（1〜2ドローで止まりやすいため優先度低め）",
        priority: "low",
      },
      fuwalos: {
        target: "融合召喚・リンク召喚連打時（ドロー数は控えめ）",
        priority: "low",
      },
      "imperm-veiler": {
        target: "召喚師アレイスター（召喚時効果） / 召喚獣メルカバー",
        priority: "high",
      },
      impulse: {
        target: "召喚魔術（融合召喚を直接無効化）",
        priority: "high",
      },
      ogre: {
        target: "暴走魔法陣（発動時のサーチを破壊で不発にする）",
        priority: "high",
      },
      belle: {
        target: "召喚魔術（墓地除外を含む融合） / 墓地の召喚魔術の回収効果",
        priority: "high",
      },
      nibiru: {
        target: "召喚回数が少なく発動機会はほぼない",
        priority: "low",
      },
      droll: {
        target: "暴走魔法陣のサーチ後（続くアレイスターのサーチを封鎖）",
        priority: "high",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-yummy",
    themeName: "ヤミー",
    aliases: ["カプシー", "クッキィ", "ロリポー", "スナッチー"],
    signatureCards: [
      "カプシー☆ヤミー",
      "クッキィ☆ヤミー",
      "ロリポー☆ヤミー",
      "マシュマオ☆ヤミー",
      "ヤミー★スナッチー",
      "ヤミー☆サプライズ",
      "カプシー★ヤミーウェイ",
    ],
    tier: "tier3",
    deckType: "ミッド型",
    summonMethods: ["シンクロ", "リンク"],
    summary:
      "リンク1とレベル2シンクロの分離・再シンクロを繰り返す展開テーマ。スナッチー成立前の初動下級への着地狩りや、盤面ごと流す全体除去が有効。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "カプシー☆ヤミーのサーチ / ヤミーウェイのサーチ効果",
        priority: "high",
      },
      "maxx-c": {
        target: "下級ヤミーの手札特殊召喚・リンク展開開始時",
        priority: "high",
      },
      fuwalos: {
        target: "EXデッキからのリンク・シンクロ連打前（非常に刺さりやすい）",
        priority: "high",
      },
      "imperm-veiler": {
        target: "ヤミー★スナッチー / カプシー★ヤミーウェイ",
        priority: "high",
      },
      impulse: {
        target: "シンクロ体の分離蘇生効果 / ヤミー☆サプライズ",
        priority: "high",
      },
      ogre: {
        target:
          "初動の下級ヤミーやスナッチー（場の種を消して手札SS条件を崩す）",
        priority: "high",
      },
      belle: {
        target: "シンクロ体の墓地蘇生分離効果 / ヤミー☆サプライズ",
        priority: "high",
      },
      nibiru: {
        target: "妨害が揃う前の5体展開タイミング",
        priority: "medium",
      },
      droll: {
        target: "最初のサーチ後（後続ヤミー確保を阻害）",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-branded",
    themeName: "烙印",
    aliases: ["デスピア", "アルバス", "烙印ビーステッド"],
    signatureCards: [
      "烙印融合",
      "烙印の気炎",
      "デスピアの導化アルベル",
      "アルバスの落胤",
      "白き竜の落胤",
      "氷剣竜ミラジェイド",
      "赫の聖女カルテシア",
      "導きの聖女クエム",
    ],
    tier: "tier3",
    deckType: "ミッド型",
    summonMethods: ["融合"],
    summary:
      "「烙印融合」まで灰流うららや霊王の波動を温存するのが最優先。気炎スタートの場合は気炎を止める選択肢もある。墓地融合・蘇生へのわらしやビーステッドも強力。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "烙印融合（最優先・基本温存） / 烙印の気炎",
        priority: "high",
      },
      "maxx-c": {
        target: "烙印融合チェーン / 赫の聖女カルテシア特殊召喚時",
        priority: "medium",
      },
      fuwalos: {
        target: "EXからの融合連打前（特に展開が伸びる手札に対して有効）",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "デスピアの導化アルベル / 神炎竜ルベリオン / 導きの聖女クエム",
        priority: "high",
      },
      impulse: {
        target: "烙印融合（最優先） / 赫の烙印 / 導きの聖女クエムの蘇生",
        priority: "high",
      },
      ogre: {
        target: "失烙印 / 赫の聖女カルテシアの起動効果",
        priority: "low",
      },
      belle: {
        target: "赫の烙印 / 烙印追放 / 導きの聖女クエムの蘇生効果",
        priority: "high",
      },
      nibiru: {
        target: "5回召喚到達しづらいため優先度低め（展開が伸びた時のみ）",
        priority: "low",
      },
      droll: {
        target:
          "烙印開幕やアルベルサーチ後（ただし烙印融合は止まらない点に注意）",
        priority: "low",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-fairy-tail",
    themeName: "妖精伝姫",
    aliases: ["フェアリーテイル", "シラユキ", "カグヤ", "マチリル"],
    signatureCards: [
      "妖精伝姫－シラユキ",
      "妖精伝姫－カグヤ",
      "妖精伝姫－マチリル",
      "指環の精霊ジーニャ",
      "妖精伝姫－ターリア",
      "妖精伝姫－シンデレラ",
    ],
    tier: "tier3",
    deckType: "ミッド型",
    summonMethods: ["融合", "エクシーズ"],
    summary:
      "攻撃力1850の魔法使い族を軸に、相手モンスターを巻き込む融合やシラユキの妨害で戦うテーマ。召喚時サーチへの無効妨害と、墓地シラユキへの対処が重要。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "妖精伝姫－カグヤ / マチリルのサーチ・展開効果",
        priority: "high",
      },
      "maxx-c": {
        target: "展開効果チェーン / マギストス等の混合ギミック展開時",
        priority: "medium",
      },
      fuwalos: {
        target: "EXからの融合・エクシーズ展開に入るタイミング",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "妖精伝姫－カグヤ / マチリル / ゾロア等の展開起点",
        priority: "high",
      },
      impulse: {
        target: "妖精伝姫－シラユキの蘇生 / 融合・特殊召喚効果",
        priority: "high",
      },
      ogre: {
        target: "装備・永続系サポート / 場で発動したカグヤ",
        priority: "medium",
      },
      belle: {
        target: "妖精伝姫－シラユキの墓地蘇生効果",
        priority: "high",
      },
      nibiru: {
        target: "展開が伸びる混合型の場合のみ5体目で発動",
        priority: "low",
      },
      droll: {
        target: "カグヤやマチリルの最初のサーチ後",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-clown-troupe",
    themeName: "道化の一座",
    aliases: ["ホワイトフェイス", "下稽古", "開演", "どうけのいちざ"],
    signatureCards: [
      "道化の一座 ホワイトフェイス",
      "道化の一座 フレア",
      "道化の一座 ハット",
      "道化の一座『下稽古』",
      "道化の一座『開演』",
      "道化の一座『極芸』",
      "道化の一座『怪演』",
      "道化の一座『新加入』",
    ],
    tier: "tier3",
    deckType: "ミッド型",
    summonMethods: ["アドバンス"],
    summary:
      "特殊召喚とアドバンス召喚を絡め、大量ドローとリリース時デッキバウンスで戦うテーマ。サーチ・ドローを全て封じるドロールが天敵で、初動の『下稽古』止めも最優先。",
    handTraps: createStandardHandTrapMemos(
      {
        urara: {
          target: "道化の一座『下稽古』（最優先） / 『開演』のドロー効果",
          priority: "high",
        },
        "maxx-c": {
          target:
            "特殊召喚効果チェーン（ただしアドバンス召喚自体はドロー対象外）",
          priority: "medium",
        },
        fuwalos: {
          target: "デッキ・EXからの展開時（アドバンス中心の場面は控えめ）",
          priority: "low",
        },
        "imperm-veiler": {
          target: "道化の一座 ホワイトフェイス / フレア",
          priority: "high",
        },
        impulse: {
          target: "特殊召喚を伴う『怪演』『新加入』などの展開札",
          priority: "medium",
        },
        ogre: {
          target: "道化の一座『開演』 / 永続サポート札の起動効果",
          priority: "high",
        },
        belle: {
          target: "墓地からの回収・蘇生効果",
          priority: "low",
        },
        nibiru: {
          target: "アドバンス召喚も召喚回数に含まれるため展開が伸びたら有効",
          priority: "medium",
        },
        droll: {
          target:
            "『下稽古』などのサーチ後（大量ドロー軸を完全に封鎖できる天敵）",
          priority: "high",
        },
      },
      [
        {
          id: "purge",
          label: "聖王の粉砕",
          target: "道化の一座『下稽古』 / 『開演』のサーチ・ドローを無効",
          priority: "high",
        },
      ],
    ),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
];
