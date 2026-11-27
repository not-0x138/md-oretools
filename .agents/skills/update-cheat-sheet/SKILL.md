---
name: update-cheat-sheet
description: >-
  md-oretools の誘発カンペ初期データ（src/features/cheat-sheet/）を最新の遊戯王マスターデュエル環境に合わせて定期更新する標準手順。
  環境差分チェック（scripts/check-meta-updates.mjs）、新テーマ追加、Tier更新、手札誘発カタログ更新、既存ID互換維持、品質ゲート検証までを一貫して実施するときに使用する。
---

# 誘発カンペ環境アップデート手順（update-cheat-sheet）

## 1. 事前準備・差分確認

1. 最新の `main` から作業ブランチを作成する（例: `chore/update-cheat-sheet-YYYYMM` または `feat/cheat-sheet-meta-update`）。
2. 以下の差分チェックスクリプトを実行し、最新環境との差分（未登録の Tier 1〜4 テーマ・Tier 変動・未登録の上位手札誘発）を把握する。

```powershell
node scripts/check-meta-updates.mjs
```

- 参照元 URL:
  - 環境デッキランキング: `https://game8.jp/yugioh-masterduel/423817`
  - 手札誘発ランキング: `https://game8.jp/yugioh-masterduel/641142`

## 2. 厳守ルール（品質・互換性・著作権）

1. **既存テンプレートの `id` は絶対に変更・削除しない**
   - ユーザーがブラウザに保存した編集済みメモ（`cheatSheetOverrides`）はテンプレート `id` で紐付く。
   - Tier が下がったテーマも削除せず、`tier` を更新するか `templatesClassicTier.ts` へ移動して `id` を維持する。
2. **著作権配慮（丸コピー禁止）**
   - 攻略サイトの文章をそのまま転載しない。カード名・テーマ名・弱点メカニズムなどの事実情報のみを参照し、プレイヤーが対戦中に 1 秒で判断できる簡潔な独自カンペ文言として書き下ろす。
3. **`signatureCards` に汎用カードを含めない**
   - 画面認識（Phase 3 デュエル画面）は `signatureCards` を元に相手デッキを自動類推する。
   - 灰流うらら・増殖するG・無限泡影・S：Pリトルナイト等の汎用カードは絶対に含めず、そのテーマ固有のカード（5〜10枚程度）のみを登録する。
4. **現行リミットレギュレーション（禁止カード）を遵守する**
   - 禁止カード（例：墓穴の指名者・ディメンション・アトラクター等）は `STANDARD_HAND_TRAPS`・`HAND_TRAP_CATALOG`・各テーマの推奨対策に含めない。リミット改訂で新たに禁止になったカードがあれば除外・代替カードへ差し替える。
4. **手札誘発の二層管理を守る**
   - 全テーマ共通の `STANDARD_HAND_TRAPS`（`src/features/cheat-sheet/domain/types.ts`）は視認性維持のため 10 種前後に厳選する。
   - 環境限定・特効メタ誘発は `HAND_TRAP_CATALOG` に追加し、特に刺さるテーマへ `createStandardHandTrapMemos(presets, extras)` の第2引数 `extras` として同梱する。
5. **UI 文言規約の遵守**
   - `.agents/rules/ui-copywriting.md` に従い、開発者向け用語を出さず平易な日本語で記述する。

## 3. データ更新先のファイル構成

更新内容に応じて以下のファイルを編集する（`TEMPLATE_TIMESTAMP` も更新日に揃える）。

- 手札誘発定義・カタログ: `src/features/cheat-sheet/domain/types.ts`
- Tier 1〜Tier 3 テーマ: `src/features/cheat-sheet/data/templatesTopTier.ts`
- Tier 4 ＋ Tier 5 前半: `src/features/cheat-sheet/data/templatesMidTier.ts`
- Tier 5 後半 ＋ 定番テーマ: `src/features/cheat-sheet/data/templatesClassicTier.ts`
- 統合エクスポート: `src/features/cheat-sheet/data/defaultTemplates.ts`

### 新テーマ追加時のチェック項目

- `id`: `"tpl-<english-kebab-name>"` 形式で一意であること
- `themeName`: ゲーム内・一般的なテーマ表記
- `aliases`: ひらがな読み・略称・代表的な別名（検索用）
- `signatureCards`: テーマ固有カード 5〜10 枚（汎用カード除外）
- `tier` / `deckType` / `summonMethods`: 環境ランク目安・デッキタイプ・主要召喚法
- `summary`: 対面で最初に意識すべき止めどころ・注意点を 1〜2 文で簡潔に記載
- `handTraps`: `createStandardHandTrapMemos(...)` で全標準誘発の打ちどころと優先度（`high` / `medium` / `low`）を記載し、特効メタがあれば `extras` に追記

## 4. 検証と完了条件

編集後、以下の品質ゲートをすべて通過させる。

```powershell
npm run check:ci
npm run typecheck
npm test
npm run build:only
```

- `src/features/cheat-sheet/domain/search.test.ts` のテンプレート整合性テスト（Zod スキーマ・ID 重複なし・全標準誘発枠完備・既存 ID 互換）がすべて合格すること。
- もう一度 `node scripts/check-meta-updates.mjs` を実行し、意図した差分が解消されていることを確認する。
- `.github/pull_request_template.md` に沿って Pull Request を作成し、関連する環境更新検知 Issue があれば `Closes #<番号>` を記載する。
