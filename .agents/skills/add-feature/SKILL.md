---
name: add-feature
description: >-
  md-oretools に新しい機能モジュール（src/features/<name>/）を追加・実装するときの標準手順。
  Feature-based アーキテクチャ、t-wada のテスト思想（Red-Green-Refactor / コード=How・テスト=What・コミット=Why・コメント=Why not）、
  依存方向ルール、品質ゲート検証までを一貫して実施するときに使用する。
---

# 新 Feature 追加・実装ガイド（add-feature）

## 1. 事前確認

1. `docs/spec.md` と `docs/architecture.md` を確認し、対象機能の要件・データ構造・他機能との境界を把握する。
2. GitHub Flow に従い、最新の `main` から作業ブランチを作成する（例: `feat/<feature-name>`）。

## 2. ディレクトリ構成と依存ルール

`src/features/<feature-name>/` 配下を以下の層に分離して作成する。

```text
src/features/<feature-name>/
├── domain/          # 純粋関数・型・Zodスキーマ・単体テスト（React / DOM / ストレージ非依存）
│   ├── *.ts
│   └── *.test.ts
├── hooks/           # 状態管理・ストレージ連携・UI向けアダプタ（camelCase.ts）
├── components/      # React 表示コンポーネント（PascalCase.tsx）
└── index.ts         # 外部（src/app/）へ公開する最小限のバレルエクスポート
```

### 厳守する依存ルール（`biome.json` で自動強制）

- **他 Feature への直接参照禁止**: `src/features/<other>/` を import しない。機能間連携は必ず `src/app/` 経由で行う。
- **`domain/` の純粋性**: `domain/` から `react`・`@/components/ui/*`・ブラウザストレージへ依存しない。
- **`shared/` の独立性**: `src/shared/` から `src/features/` を逆参照しない。

## 3. 実装手順（t-wada 原則ベース）

### 情報配置の 4 原則を常に意識する

- **コードには How**: 明確な命名と小さな関数で処理を表現する。自明な説明コメントは書かない。
- **テストコードには What**: 日本語のテスト名と AAA（Arrange / Act / Assert）構造で、仕様・期待する振る舞いを表現する。
- **コミットログには Why**: Conventional Commits（`feat:` / `test:` / `refactor:` 等）＋変更の背景・意図を記す。
- **コードコメントには Why not**: 一見自然に見える別案を選ばなかった理由・制約・エッジケースの根拠を記す。

### Step A: ドメインロジックをテストファーストで実装（Red → Green → Refactor）

1. `domain/` に型定義・Zod スキーマ（必要な場合）と最小限の関数シグネチャを用意する。
2. 仕様（正常系・境界値・異常系）を `domain/*.test.ts` に記述し、まず失敗することを確認する（**Red**）。
3. テストを通す最小限の実装を `domain/*.ts` に書き、グリーンにする（**Green**）。
4. 重複排除や可読性向上のためのリファクタリングを行う（**Refactor**）。
5. 外部入力を扱う場合は `any` / `as` を使わず Zod スキーマで検証する。

### Step B: Hooks / UI コンポーネントの実装

1. UI 部品は `src/components/ui/` の shadcn/ui コンポーネントと Tailwind CSS（ダークモード基調）を組み合わせて構築する。
2. 必要な shadcn/ui 部品が未導入なら `npx shadcn@latest add <component>` で追加する。
3. コンポーネントは表示とユーザーイベントの配線に専念し、計算・集計・バリデーションは必ず `domain/` に委譲する。
4. UI 文言・操作感は `.agents/rules/ui-copywriting.md`（NG→OK 用語辞書・数値入力ホイール対策・IME 確定 Enter 対策・破壊的操作確認）を遵守し、開発者向け用語を画面に出さないこと。

### Step C: `src/app/` への配線

1. `src/features/<feature-name>/index.ts` から必要な画面コンポーネント・型のみを公開する。
2. `src/app/` 側でナビゲーション・画面切り替え（およびバックアップ対象データがある場合はバックアップスキーマ統合）を配線する。

## 4. 検証と完了条件

作業完了前に以下をすべて通過させる（Windows PowerShell の場合は `;` で連結して実行）。

```powershell
npm run check:ci
npm run typecheck
npm run test:coverage
npm run build:only
```

- 文字コード（BOM なし UTF-8）・改行コード（LF）に違反がないこと。
- 仕様やアーキテクチャに更新があれば `docs/spec.md` / `docs/architecture.md` を同期すること。
- `.github/pull_request_template.md` に沿って Pull Request を作成し、CI・SonarQube・Cloudflare Pages プレビューの全グリーンを確認する。
