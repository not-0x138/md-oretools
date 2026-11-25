import { createStandardHandTrapMemos } from "../domain/search";
import type { CheatSheetEntry } from "../domain/types";

const TEMPLATE_TIMESTAMP = "2026-11-25T00:00:00.000Z";

export const DEFAULT_CHEAT_SHEET_TEMPLATES: readonly CheatSheetEntry[] = [
  {
    id: "tpl-snake-eye",
    themeName: "スネークアイ",
    aliases: ["罪宝", "蛇眼", "炎王スネークアイ", "デモンスミススネークアイ"],
    signatureCards: [
      "スネークアイ・エクセル",
      "蛇眼の炎燐",
      "スネークアイ・オーク",
      "蛇眼の炎龍",
      "原罪宝－スネークアイ",
      "黒魔女ディアベルスター",
      "罪宝狩りの悪魔",
    ],
    summary:
      "原罪宝へのアクセスとエクセルのデッキリクルート効果を抑えるのが基本。炎王型の場合は孤島やポニクスへの連鎖も意識する。",
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
      "imperm-veiler": {
        target:
          "スネークアイ・エクセル（召喚時サーチ） / 蛇眼の炎燐 / 賜炎の咎姫",
        priority: "high",
      },
      belle: {
        target: "賜炎の咎姫の墓地蘇生 / 蛇眼の炎龍の墓地効果",
        priority: "medium",
      },
      nibiru: {
        target: "アポロウーサ成立前（リンク値が伸びたタイミング）",
        priority: "medium",
      },
      "called-by": {
        target: "賜炎の咎姫 / 蛇眼の炎龍 / 炎王神獣キリン",
        priority: "high",
      },
      droll: {
        target: "篝火・エクセル・罪宝狩り等の最初のサーチ後",
        priority: "medium",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
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
    summary:
      "メインフェイズ1に燦幻荘があると炎属性ドラゴンは効果を受けない。バトルフェイズに入ってから誘発や除去を使う。",
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
      "imperm-veiler": {
        target:
          "天盃龍パイドラ（燦幻荘がない時） / バトルフェイズ中のファドラ・チュンドラ",
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
      "called-by": {
        target: "墓地のファドラ蘇生対象 / チュンドラ",
        priority: "medium",
      },
      droll: {
        target: "燦幻荘・パイドラの最初のサーチ後（連打抑制）",
        priority: "low",
      },
    }),
    updatedAt: TEMPLATE_TIMESTAMP,
  },
  {
    id: "tpl-yubel",
    themeName: "ユベル",
    aliases: ["ファントムユベル", "スピリットオブユベル", "破械ユベル"],
    signatureCards: [
      "スピリット・オブ・ユベル",
      "サクリファイス・D・ロータス",
      "ナイトメア・スローン",
      "ナイトメア・ペイン",
      "ファントム・オブ・ユベル",
      "七精の解門",
    ],
    summary:
      "ファントム・オブ・ユベルが出るとモンスター効果を書き換えられるため、出る前のロータスや解門を止める。",
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
      "imperm-veiler": {
        target: "サクリファイス・D・ロータス / 暗黒の招来神 / 破械神王ヤマ",
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
      "called-by": {
        target: "スピリット・オブ・ユベル（ファントム素材阻止） / ロータス",
        priority: "high",
      },
      droll: {
        target: "ナイトメア・スローン / 招来神サーチ後（追加サーチを広く停止）",
        priority: "high",
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
      "デスピアの導化アルベル",
      "アルバスの落胤",
      "氷剣竜ミラジェイド",
      "赫の聖女カルテシア",
      "導きの聖女クエム",
    ],
    summary:
      "「烙印融合」まで灰流うららを温存するのが最優先。うららがない場合はアルベルやクエムの展開を止める。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "烙印融合（最優先・基本温存）",
        priority: "high",
      },
      "maxx-c": {
        target: "烙印融合チェーン / 赫の聖女カルテシア特殊召喚時",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "デスピアの導化アルベル / 神炎竜ルベリオン / 導きの聖女クエム",
        priority: "high",
      },
      belle: {
        target: "赫の烙印 / 烙印追放 / 導きの聖女クエムの蘇生効果",
        priority: "high",
      },
      nibiru: {
        target: "5回召喚到達しづらいため優先度低め（展開が伸びた時のみ）",
        priority: "low",
      },
      "called-by": {
        target:
          "赫の烙印の対象（アルバス等） / 悲劇のデスピアン / 鉄獣鳥メルクーリエ",
        priority: "high",
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
    summary:
      "ビッグウェルカム・ラビュリンスを灰流うららや屋敷わらしで止めるとリソース循環が大きく鈍る。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target:
          "ビッグウェルカム・ラビュリンス（最優先） / ウェルカム・ラビュリンス",
        priority: "high",
      },
      "maxx-c": {
        target: "家具効果やウェルカム発動時（ドロー枚数は伸びにくい）",
        priority: "low",
      },
      "imperm-veiler": {
        target: "白銀の城の召使い アリアンナ（召喚時サーチ）",
        priority: "medium",
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
      "called-by": {
        target: "墓地の家具（ストービー/シャンドラ） / 白銀の城の狂時計",
        priority: "medium",
      },
      droll: {
        target: "デッキから直接セットする効果が中心で、効果を発揮しにくい",
        priority: "low",
      },
    }),
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
    summary:
      "ローガーディアン・ロー・結界が揃うと対象耐性と無効効果で突破しにくくなる。サフィラや宣告者の神巫を止めて儀式召喚を防ぐ。",
    handTraps: createStandardHandTrapMemos({
      urara: {
        target: "粛声の竜賢姫サフィラ / 宣告者の神巫 / 儀式の下準備",
        priority: "high",
      },
      "maxx-c": {
        target: "儀式召喚チェーン（ただし1〜2ドローで止まりやすい）",
        priority: "medium",
      },
      "imperm-veiler": {
        target: "宣告者の神巫 / 粛声の祈り手ロー（結界が張られる前）",
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
      "called-by": {
        target: "墓地の粛声の祈り手ロー / サフィラ",
        priority: "high",
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
