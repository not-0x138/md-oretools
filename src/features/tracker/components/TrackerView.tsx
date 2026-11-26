import {
  BarChart3,
  ClipboardList,
  Layers,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTransientMessage } from "@/shared/lib/useTransientMessage";
import {
  calculateTrackerStatistics,
  extractMonthOptions,
  extractSeasonOptions,
  filterDuelRecords,
  sortDuelRecordsByPlayedAtDesc,
} from "../domain/stats";
import type { DuelRecord, TrackerFilter } from "../domain/types";
import { useTrackerStore } from "../hooks/useTrackerStore";
import { DeckManagerPanel } from "./DeckManagerPanel";
import { DuelRecordForm } from "./DuelRecordForm";
import { TrackerStatsPanel } from "./TrackerStatsPanel";

type TrackerTab = "log" | "stats" | "decks";

interface TrackerViewProps {
  opponentThemeSuggestions: readonly string[];
}

const DEFAULT_HISTORY_LIMIT = 10;

function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  if (!year || !month) {
    return yearMonth;
  }
  return `${year}年${Number(month)}月`;
}

function formatPlayedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}/${m}/${d} ${hh}:${mm}`;
}

export function TrackerView({ opponentThemeSuggestions }: TrackerViewProps) {
  const {
    decks,
    records,
    isLoading,
    corruptedCount,
    error,
    addDeck,
    updateDeck,
    toggleArchiveDeck,
    deleteDeck,
    saveRecord,
    deleteRecord,
  } = useTrackerStore();

  const [activeTab, setActiveTab] = useState<TrackerTab>("log");
  const [editingRecord, setEditingRecord] = useState<DuelRecord | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [filter, setFilter] = useState<TrackerFilter>({
    month: "all",
    season: "all",
    playerDeckId: "all",
    opponentQuery: "",
  });
  const { message: statusMessage, show: showStatusMessage } =
    useTransientMessage();

  const sortedRecords = useMemo(
    () => sortDuelRecordsByPlayedAtDesc(records),
    [records],
  );

  const monthOptions = useMemo(
    () => extractMonthOptions(sortedRecords),
    [sortedRecords],
  );

  const seasonOptions = useMemo(
    () => extractSeasonOptions(sortedRecords),
    [sortedRecords],
  );

  const opponentSuggestions = useMemo(() => {
    const recordedOpponents = sortedRecords.map((r) => r.opponentDeck);
    return Array.from(
      new Set([...opponentThemeSuggestions, ...recordedOpponents]),
    ).filter((name) => name !== "不明");
  }, [opponentThemeSuggestions, sortedRecords]);

  const filteredRecords = useMemo(
    () => filterDuelRecords(sortedRecords, filter),
    [sortedRecords, filter],
  );

  const visibleHistoryRecords = useMemo(
    () =>
      showAllHistory
        ? filteredRecords
        : filteredRecords.slice(0, DEFAULT_HISTORY_LIMIT),
    [filteredRecords, showAllHistory],
  );
  const hasMoreHistory = filteredRecords.length > DEFAULT_HISTORY_LIMIT;

  const stats = useMemo(
    () => calculateTrackerStatistics(filteredRecords, decks),
    [filteredRecords, decks],
  );

  const deckNameMap = useMemo(
    () => new Map(decks.map((deck) => [deck.id, deck.name])),
    [decks],
  );

  const handleDeleteRecord = async (record: DuelRecord) => {
    if (
      !window.confirm(
        `${formatPlayedAt(record.playedAt)} の対戦ログ（vs ${record.opponentDeck}）を削除しますか？`,
      )
    ) {
      return;
    }
    const ok = await deleteRecord(record.id);
    if (ok) {
      if (editingRecord?.id === record.id) {
        setEditingRecord(null);
      }
      showStatusMessage("対戦ログを削除しました。");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">戦績記録</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ランク戦やイベントの対戦結果を記録し、先攻・後攻別勝率や対面相性を集計します。
          </p>
        </div>

        <div
          role="tablist"
          aria-label="戦績記録の表示切り替え"
          className="inline-flex rounded-lg border border-border bg-card p-1"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "log"}
            size="sm"
            variant={activeTab === "log" ? "default" : "ghost"}
            onClick={() => setActiveTab("log")}
          >
            <ClipboardList className="h-4 w-4" />
            記録・履歴
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "stats"}
            size="sm"
            variant={activeTab === "stats" ? "default" : "ghost"}
            onClick={() => setActiveTab("stats")}
          >
            <BarChart3 className="h-4 w-4" />
            集計・相性
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={activeTab === "decks"}
            size="sm"
            variant={activeTab === "decks" ? "default" : "ghost"}
            onClick={() => setActiveTab("decks")}
          >
            <Layers className="h-4 w-4" />
            自分のデッキ ({decks.filter((d) => !d.archived).length})
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
        >
          {error}
        </div>
      )}

      {corruptedCount > 0 && (
        <div
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-foreground"
        >
          読み込めない形式のデータが {corruptedCount}{" "}
          件見つかったため、正常なデータのみ表示しています。
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs text-foreground"
        >
          {statusMessage}
        </div>
      )}

      {activeTab !== "decks" && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label
                  htmlFor="filter-month"
                  className="text-xs font-medium text-muted-foreground"
                >
                  月で絞り込み
                </label>
                <Select
                  id="filter-month"
                  value={filter.month}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, month: e.target.value }))
                  }
                >
                  <option value="all">すべての月</option>
                  {monthOptions.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatYearMonthLabel(ym)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="filter-season"
                  className="text-xs font-medium text-muted-foreground"
                >
                  モード / イベントで絞り込み
                </label>
                <Select
                  id="filter-season"
                  value={filter.season}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, season: e.target.value }))
                  }
                >
                  <option value="all">すべてのモード</option>
                  {seasonOptions.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="filter-deck"
                  className="text-xs font-medium text-muted-foreground"
                >
                  自分のデッキで絞り込み
                </label>
                <Select
                  id="filter-deck"
                  value={filter.playerDeckId}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      playerDeckId: e.target.value,
                    }))
                  }
                >
                  <option value="all">すべてのデッキ</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.archived ? `${deck.name}（アーカイブ）` : deck.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="filter-opponent"
                  className="text-xs font-medium text-muted-foreground"
                >
                  相手デッキで絞り込み
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="filter-opponent"
                    value={filter.opponentQuery}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        opponentQuery: e.target.value,
                      }))
                    }
                    placeholder="テーマ名で検索..."
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            戦績データを読み込んでいます...
          </CardContent>
        </Card>
      ) : activeTab === "decks" ? (
        <DeckManagerPanel
          decks={decks}
          onAddDeck={async (name, memo) => {
            const created = await addDeck(name, memo);
            if (created) {
              showStatusMessage(`デッキ「${created.name}」を登録しました。`);
            }
            return created;
          }}
          onUpdateDeck={async (deck) => {
            const updated = await updateDeck(deck);
            if (updated) {
              showStatusMessage(`デッキ「${updated.name}」を更新しました。`);
            }
            return updated;
          }}
          onToggleArchive={async (deck) => {
            const updated = await toggleArchiveDeck(deck);
            if (updated) {
              showStatusMessage(
                updated.archived
                  ? `デッキ「${updated.name}」をアーカイブしました。`
                  : `デッキ「${updated.name}」を使用中に戻しました。`,
              );
            }
            return updated;
          }}
          onDeleteDeck={async (id) => {
            const ok = await deleteDeck(id);
            if (ok) {
              showStatusMessage("デッキを削除しました。");
            }
            return ok;
          }}
        />
      ) : activeTab === "stats" ? (
        <TrackerStatsPanel stats={stats} />
      ) : (
        <div className="space-y-6">
          <DuelRecordForm
            decks={decks}
            opponentSuggestions={opponentSuggestions}
            editingRecord={editingRecord}
            onSave={async (input, existingId) => {
              const saved = await saveRecord(input, existingId);
              if (saved) {
                showStatusMessage(
                  existingId
                    ? "対戦ログを更新しました。"
                    : "対戦ログを記録しました。",
                );
              }
              return saved;
            }}
            onCancelEdit={() => setEditingRecord(null)}
            onQuickAddDeck={async (name) => {
              const created = await addDeck(name, "");
              if (created) {
                showStatusMessage(`デッキ「${created.name}」を登録しました。`);
              }
              return created;
            }}
          />

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">
                  {hasMoreHistory && !showAllHistory
                    ? `対戦履歴（最新 ${DEFAULT_HISTORY_LIMIT} 件 / 全 ${filteredRecords.length} 件）`
                    : `対戦履歴（${filteredRecords.length} 件）`}
                </CardTitle>
                <CardDescription>
                  {stats.overall.total > 0
                    ? `表示中の勝率：${(stats.overall.winRate * 100).toFixed(1)}%（${stats.overall.wins}勝 ${stats.overall.losses}敗）`
                    : "まだ対戦ログがありません。"}
                </CardDescription>
              </div>
              {stats.overall.total > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("stats")}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  詳しい集計を見る
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  表示条件に一致する対戦ログはありません。
                </p>
              ) : (
                <div className="space-y-2.5">
                  {visibleHistoryRecords.map((record) => {
                    const displayDeckName =
                      deckNameMap.get(record.playerDeckId) ??
                      record.playerDeckName;
                    return (
                      <div
                        key={record.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-background/40 p-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                record.result === "win"
                                  ? "default"
                                  : "destructive"
                              }
                              className={
                                record.result === "win"
                                  ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                  : undefined
                              }
                            >
                              {record.result === "win" ? "WIN" : "LOSE"}
                            </Badge>
                            <Badge variant="outline">
                              {record.turnOrder === "first" ? "先攻" : "後攻"}
                            </Badge>
                            <Badge variant="secondary">
                              コイン{record.coinFlip === "heads" ? "表" : "裏"}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatPlayedAt(record.playedAt)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {record.season}
                              {record.rank ? ` / ${record.rank}` : ""}
                            </span>
                          </div>

                          <p className="text-sm font-medium">
                            <span>{displayDeckName}</span>
                            <span className="mx-2 text-xs text-muted-foreground">
                              vs
                            </span>
                            <span>{record.opponentDeck}</span>
                          </p>

                          {record.memo && (
                            <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                              {record.memo}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="対戦ログを編集"
                            onClick={() => setEditingRecord(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="対戦ログを削除"
                            onClick={() => void handleDeleteRecord(record)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {hasMoreHistory && (
                    <div className="pt-1 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAllHistory((prev) => !prev)}
                      >
                        {showAllHistory
                          ? `最新 ${DEFAULT_HISTORY_LIMIT} 件のみ表示`
                          : `すべての履歴を表示（全 ${filteredRecords.length} 件）`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
