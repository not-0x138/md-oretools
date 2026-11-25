# md-oretools

遊戯王マスターデュエルを快適にする個人用ツールポータル（FF14俺Tools風）。  
ブラウザ完結で動作し、インストール不要・ゲームプロセス非侵襲で安全に使えることを目指しています。

## 主な機能（予定）

1. **手札確率シミュレータ**
   - デッキ枚数・初手枚数・カードグループごとの条件から初手率を計算
2. **誘発カンペ**
   - デッキタイプ別の手札誘発（うらら・増G・泡影・ニビル等）の打ちどころ辞書＆自分用メモ
   - 画面認識トラッカーと連携したリアルタイム自動表示
3. **画面認識・戦績トラッカー**
   - ブラウザの画面共有（`getDisplayMedia`）を利用したコイントス・先攻/後攻・勝敗の自動記録
   - 出現カード名のOCR＋あいまい検索による相手デッキの自動類推と戦績集計

## 技術スタック

- **フロントエンド**: Vite / React / TypeScript（厳格設定）/ Tailwind CSS / shadcn/ui
- **品質・テスト**: npm / Biome / Vitest / Zod / lefthook
- **永続化（予定）**: IndexedDB（Dexie.js）/ localStorage
- **画面認識 / 検索（予定）**: Screen Capture API (`getDisplayMedia`) / Tesseract.js / Fuse.js
- **ホスティング / CI**: Cloudflare Pages（HTTPS・$0）/ GitHub Actions / Dependabot

## 開発環境・コマンド

- 前提: **Node.js 24 LTS**（`.nvmrc` で指定）

```powershell
# 依存インストール
npm ci

# 開発サーバー起動
npm run dev

# 品質チェック（Biome Lint/Format + TypeScript 型チェック + Vitest）
npm run check
npm run typecheck
npm test

# 本番ビルド
npm run build
```

## Cloudflare Pages デプロイ設定

- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node.js**: `.nvmrc`（`24`）または環境変数 `NODE_VERSION=24`
- GitHub 側のブランチ保護ルール（Required status checks: `quality`）を有効にして運用します。

## ドキュメント

- [仕様書・開発ロードマップ](docs/spec.md)
- [アーキテクチャ設計書](docs/architecture.md)
- [Antigravity プロジェクトルール](AGENTS.md)

## ライセンス

[MIT License](LICENSE)
