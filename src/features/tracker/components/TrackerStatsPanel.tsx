import { Coins, Shield, Swords, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrackerStatistics, WinLossSummary } from "../domain/types";
import { formatPercent, WinRateBar, WinRateRing } from "./WinRateBar";

interface TrackerStatsPanelProps {
  stats: TrackerStatistics;
}

function formatRecordCount(summary: WinLossSummary): string {
  return `${summary.wins}勝 ${summary.losses}敗（${summary.total}戦）`;
}

export function TrackerStatsPanel({ stats }: TrackerStatsPanelProps) {
  if (stats.overall.total === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          表示条件に一致する対戦ログがありません。対戦を記録すると勝率や対面相性がここに集計されます。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              全体勝率
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <WinRateRing
              rate={stats.overall.winRate}
              total={stats.overall.total}
            />
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-bold tabular-nums">
                {stats.overall.wins}勝 {stats.overall.losses}敗
              </p>
              <p className="text-xs text-muted-foreground">
                合計 {stats.overall.total} 試合
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Swords className="h-4 w-4 text-sky-400" />
              先攻勝率
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <p className="text-2xl font-bold tabular-nums">
              {formatPercent(stats.first.winRate, stats.first.total)}
            </p>
            <WinRateBar
              rate={stats.first.winRate}
              total={stats.first.total}
              tone="sky"
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatRecordCount(stats.first)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4 text-amber-400" />
              後攻勝率
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <p className="text-2xl font-bold tabular-nums">
              {formatPercent(stats.second.winRate, stats.second.total)}
            </p>
            <WinRateBar
              rate={stats.second.winRate}
              total={stats.second.total}
              tone="amber"
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatRecordCount(stats.second)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Coins className="h-4 w-4 text-emerald-400" />
              コイントス統計
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">表の確率</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPercent(stats.coin.headsRate, stats.coin.total)}
              </span>
            </div>
            <WinRateBar
              rate={stats.coin.headsRate}
              total={stats.coin.total}
              tone="emerald"
            />
            <div className="space-y-0.5 text-[11px] text-muted-foreground tabular-nums">
              <p>
                表 {stats.coin.heads}回（勝率{" "}
                {formatPercent(
                  stats.coin.headsWinLoss.winRate,
                  stats.coin.headsWinLoss.total,
                )}
                ） / 裏 {stats.coin.tails}回（勝率{" "}
                {formatPercent(
                  stats.coin.tailsWinLoss.winRate,
                  stats.coin.tailsWinLoss.total,
                )}
                ）
              </p>
              <p>
                表で先攻選択：
                {formatPercent(stats.coin.firstWhenHeadsRate, stats.coin.heads)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">使用デッキ別の勝率</CardTitle>
            <CardDescription>
              試合数の多い順に表示しています（アーカイブ済みデッキも集計に含みます）。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byPlayerDeck.map((row) => (
              <div
                key={row.id}
                className="space-y-1.5 rounded-md border border-border/70 bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{row.name}</span>
                    {row.archived && (
                      <Badge variant="muted" className="text-[10px]">
                        アーカイブ
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {formatPercent(row.overall.winRate, row.overall.total)}
                  </span>
                </div>
                <WinRateBar
                  rate={row.overall.winRate}
                  total={row.overall.total}
                  tone="primary"
                />
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>{formatRecordCount(row.overall)}</span>
                  <span>
                    先攻 {formatPercent(row.first.winRate, row.first.total)} /
                    後攻 {formatPercent(row.second.winRate, row.second.total)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">対面テーマ別の相性</CardTitle>
            <CardDescription>
              よく当たる相手テーマごとの全体・先攻・後攻勝率です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byOpponent.map((row) => (
              <div
                key={row.opponentDeck}
                className="space-y-1.5 rounded-md border border-border/70 bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {row.opponentDeck}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {formatPercent(row.overall.winRate, row.overall.total)}
                  </span>
                </div>
                <WinRateBar
                  rate={row.overall.winRate}
                  total={row.overall.total}
                  tone={row.overall.winRate >= 0.5 ? "emerald" : "amber"}
                />
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>{formatRecordCount(row.overall)}</span>
                  <span>
                    先攻 {formatPercent(row.first.winRate, row.first.total)} /
                    後攻 {formatPercent(row.second.winRate, row.second.total)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
