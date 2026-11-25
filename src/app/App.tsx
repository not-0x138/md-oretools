import { BookOpen, Calculator, MonitorSmartphone, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TOOLS = [
  {
    id: "simulator",
    title: "手札確率シミュレータ",
    phase: "Phase 1",
    description:
      "デッキ枚数・初手枚数・カードグループのAND/OR条件から初手確率を厳密計算＆モンテカルロ試算。",
    icon: Calculator,
  },
  {
    id: "cheat-sheet",
    title: "誘発カンペ",
    phase: "Phase 1",
    description:
      "対面テーマ別の手札誘発（うらら・増G・泡影・ニビル等）の打ちどころ辞書と自分用メモ編集。",
    icon: BookOpen,
  },
  {
    id: "tracker",
    title: "戦績トラッカー",
    phase: "Phase 2",
    description:
      "使用デッキ別・先攻/後攻別・対面別の勝率集計とIndexedDB永続化（JSONバックアップ対応）。",
    icon: Trophy,
  },
  {
    id: "screen-capture",
    title: "画面認識・リアルタイム連携",
    phase: "Phase 3",
    description:
      "ブラウザの画面共有（getDisplayMedia）のみでコイン・勝敗・相手デッキを非侵襲に自動認識。",
    icon: MonitorSmartphone,
  },
] as const;

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              MD
            </span>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                md-oretools
              </h1>
              <p className="text-xs text-muted-foreground">
                遊戯王マスターデュエル 個人用ツールポータル
              </p>
            </div>
          </div>
          <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            Phase 0 基盤構築完了
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-8 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">ツール一覧</h2>
          <p className="text-sm text-muted-foreground">
            ブラウザ完結・非侵襲アプローチで段階的にツールを追加していきます。
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="transition-colors hover:bg-card/80"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{tool.title}</CardTitle>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {tool.phase}
                    </span>
                  </div>
                  <CardDescription className="pt-1">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    準備中 — ロードマップに沿って順次実装予定
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
