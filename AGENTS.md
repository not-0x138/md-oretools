# md-oretools - Antigravity プロジェクトルール

このリポジトリは、遊戯王マスターデュエルを便利にする個人用ポータルWebアプリ（FF14俺Tools風）である **md-oretools** の開発プロジェクトです。

## プロジェクト方針・大原則

1. **安全・非侵襲なアプローチを厳守する**
   - ゲームクライアントのプロセス・メモリ読み取りや、通信パケットの解析・改ざんは**一切行わない**。
   - 自動化・認識機能はすべて、ブラウザ標準の Screen Capture API（`getDisplayMedia`）による画面映像の読み取り（画像解析・OCR）のみで完結させる。
2. **完全フロントエンド完結（個人利用ファースト）**
   - サーバーレス・ブラウザ完結で動作するSPAとして設計する。
   - 戦績データや自分用カンペメモなどの永続化にはブラウザストレージ（`IndexedDB` / `localStorage`）を使用し、JSONでのエクスポート／インポート機能を備える。
3. **ボトムアップ型で段階的に開発する**
   - 詳細は [docs/spec.md](docs/spec.md) を参照し、フェーズ順に実装・検証を進める。

## 想定技術スタック

- **フレームワーク / ビルド**: Vite + React + TypeScript
- **スタイリング**: Tailwind CSS
- **画面認識 / 検索**: Screen Capture API (`getDisplayMedia`) + Canvas API + Tesseract.js（OCR） + Fuse.js（あいまい検索）
- **状態管理 / 永続化**: IndexedDB（Dexie.js 等） / localStorage

## コーディング・ドキュメント規約

- UI文言、コメント、ドキュメント、コミットメッセージは**日本語**で記述する。
- 文字コードは **BOMなし UTF-8**、改行コードは **LF (`\n`)** を徹底する。
- コンポーネントやロジックは機能単位（`simulator`, `cheat-sheet`, `tracker`, `screen-capture` など）で疎結合に保つ。
- 仕様変更や新しいフェーズに入る際は、[docs/spec.md](docs/spec.md) を最新の状態に保つ。
