import {
  CheckCircle2,
  Eye,
  EyeOff,
  MonitorPlay,
  MonitorStop,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CheatSheetView,
  useCheatSheetDictionary,
} from "@/features/cheat-sheet";
import {
  type CoinFlipValue,
  createInitialLiveSession,
  type DuelResultValue,
  type LiveDuelSession,
  type LiveSessionEvent,
  type PendingDuelResult,
  reduceLiveDuelSession,
  type ThemeDictionaryItem,
  type TurnOrderValue,
  useCaptureSettings,
  useScreenCapture,
} from "@/features/screen-capture";
import {
  DEFAULT_SEASON_LABEL,
  RANK_PRESETS,
  SEASON_EVENT_PRESETS,
  useTrackerStore,
} from "@/features/tracker";
import { useTransientMessage } from "@/shared/lib/useTransientMessage";

interface DuelModeViewProps {
  onEditingStateChange?: (isEditing: boolean) => void;
}

export function DuelModeView({ onEditingStateChange }: DuelModeViewProps) {
  const { entries: cheatSheetEntries } = useCheatSheetDictionary();
  const {
    decks,
    records,
    saveRecord,
    addDeck,
    error: trackerError,
  } = useTrackerStore();
  const { settings } = useCaptureSettings();
  const { message: toast, show: showToast } = useTransientMessage();

  const activeDecks = useMemo(
    () => decks.filter((deck) => !deck.archived),
    [decks],
  );

  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [quickDeckName, setQuickDeckName] = useState("");
  const [season, setSeason] = useState(DEFAULT_SEASON_LABEL);
  const [rank, setRank] = useState("");
  const [memo, setMemo] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [linkedThemeId, setLinkedThemeId] = useState<string | null>(null);
  const [session, setSession] = useState<LiveDuelSession>(() =>
    createInitialLiveSession(),
  );
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // 仮確定バナー上でワンクリック修正するための編集値
  const [pendingCoin, setPendingCoin] = useState<CoinFlipValue>("heads");
  const [pendingTurnOrder, setPendingTurnOrder] =
    useState<TurnOrderValue>("first");
  const [pendingResultValue, setPendingResultValue] =
    useState<DuelResultValue>("win");
  const [pendingOpponent, setPendingOpponent] = useState("不明");

  useEffect(() => {
    if (selectedDeckId && activeDecks.some((d) => d.id === selectedDeckId)) {
      return;
    }
    const first = activeDecks[0];
    if (first) {
      setSelectedDeckId(first.id);
    }
  }, [activeDecks, selectedDeckId]);

  useEffect(() => {
    const pending = session.pendingResult;
    if (!pending) {
      return;
    }
    setPendingCoin(pending.coinFlip ?? "heads");
    setPendingTurnOrder(pending.turnOrder ?? "first");
    setPendingResultValue(pending.result);
    setPendingOpponent(pending.opponentDeck || "不明");
  }, [session.pendingResult]);

  const dictionary: ThemeDictionaryItem[] = useMemo(
    () =>
      cheatSheetEntries.map((entry) => ({
        id: entry.id,
        themeName: entry.themeName,
        aliases: entry.aliases,
        signatureCards: entry.signatureCards,
      })),
    [cheatSheetEntries],
  );

  const opponentSuggestions = useMemo(
    () => cheatSheetEntries.map((entry) => entry.themeName),
    [cheatSheetEntries],
  );

  // 自分の使用デッキ名が誘発カンペ辞書に存在する場合は、その固有カードも自動除外リストに追加する
  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  );

  const extraExcludedCards = useMemo(() => {
    if (!selectedDeck) {
      return [];
    }
    const matchedOwnTheme = cheatSheetEntries.find(
      (entry) =>
        entry.themeName === selectedDeck.name ||
        entry.aliases.includes(selectedDeck.name),
    );
    return matchedOwnTheme ? matchedOwnTheme.signatureCards : [];
  }, [cheatSheetEntries, selectedDeck]);

  const commitDuelResult = useCallback(
    async (
      payload: {
        result: DuelResultValue;
        coinFlip: CoinFlipValue;
        turnOrder: TurnOrderValue;
        opponentDeck: string;
        playedAt: string;
      },
      sourceLabel: string,
    ) => {
      if (!selectedDeck) {
        showToast("先に自分の使用デッキを登録・選択してください。");
        return false;
      }
      const saved = await saveRecord({
        playedAt: payload.playedAt,
        season: season.trim() || DEFAULT_SEASON_LABEL,
        rank: rank.trim(),
        playerDeckId: selectedDeck.id,
        playerDeckName: selectedDeck.name,
        opponentDeck: payload.opponentDeck.trim() || "不明",
        coinFlip: payload.coinFlip,
        turnOrder: payload.turnOrder,
        result: payload.result,
        memo: memo.trim(),
      });
      if (saved) {
        setMemo("");
        showToast(
          `${sourceLabel}（vs ${saved.opponentDeck} / ${saved.result === "win" ? "勝ち" : "負け"}）`,
        );
        return true;
      }
      return false;
    },
    [memo, rank, saveRecord, season, selectedDeck, showToast],
  );

  const autoCommitPending = useCallback(
    async (pending: PendingDuelResult) => {
      await commitDuelResult(
        {
          result: pending.result,
          coinFlip: pending.coinFlip ?? "heads",
          turnOrder: pending.turnOrder ?? "first",
          opponentDeck: pending.opponentDeck || "不明",
          playedAt: pending.detectedAt,
        },
        "前戦の結果を自動確定しました",
      );
    },
    [commitDuelResult],
  );

  const dispatchSessionEvent = useCallback(
    (event: LiveSessionEvent, resetInferenceFn?: () => void) => {
      const transition = reduceLiveDuelSession(sessionRef.current, event);
      sessionRef.current = transition.session;
      setSession(transition.session);

      if (transition.autoCommitResult) {
        resetInferenceFn?.();
        void autoCommitPending(transition.autoCommitResult);
      }
    },
    [autoCommitPending],
  );

  const resetInferenceRef = useRef<() => void>(() => {});

  const {
    videoRef,
    isSupported,
    captureState,
    readerStatus,
    readerProgress,
    error: captureError,
    logs,
    startCapture,
    stopCapture,
    togglePause,
    resetInference,
  } = useScreenCapture({
    settings,
    dictionary,
    extraExcludedCards,
    callbacks: {
      onCoinDetected: (coinFlip, at) => {
        dispatchSessionEvent(
          { type: "coin_detected", coinFlip, at },
          resetInferenceRef.current,
        );
      },
      onTurnOrderDetected: (turnOrder, at) => {
        dispatchSessionEvent({ type: "turn_order_detected", turnOrder, at });
      },
      onOpponentInferred: (themeId, themeName, at) => {
        dispatchSessionEvent({
          type: "opponent_inferred",
          themeId,
          themeName,
          at,
        });
        if (settings.autoSwitchCheatSheet) {
          setLinkedThemeId(themeId);
        }
      },
      onResultDetected: (result, at) => {
        dispatchSessionEvent({ type: "result_detected", result, at });
      },
    },
  });

  resetInferenceRef.current = resetInference;

  const handleConfirmPending = async () => {
    const pending = session.pendingResult;
    if (!pending) {
      return;
    }
    const ok = await commitDuelResult(
      {
        result: pendingResultValue,
        coinFlip: pendingCoin,
        turnOrder: pendingTurnOrder,
        opponentDeck: pendingOpponent,
        playedAt: pending.detectedAt,
      },
      "対戦結果を保存しました",
    );
    if (ok) {
      dispatchSessionEvent({ type: "confirm_pending" });
      resetInference();
    }
  };

  const handleDiscardPending = () => {
    dispatchSessionEvent({ type: "discard_pending" });
    resetInference();
    showToast("仮確定の結果を破棄しました。");
  };

  const handleQuickRecord = async (result: DuelResultValue) => {
    const ok = await commitDuelResult(
      {
        result,
        coinFlip: session.coinFlip ?? "heads",
        turnOrder: session.turnOrder ?? "first",
        opponentDeck: session.opponentDeck || "不明",
        playedAt: new Date().toISOString(),
      },
      "対戦結果を保存しました",
    );
    if (ok) {
      dispatchSessionEvent({ type: "reset_session" });
      resetInference();
    }
  };

  const handleQuickAddDeck = async () => {
    const trimmed = quickDeckName.trim();
    if (!trimmed) {
      return;
    }
    const created = await addDeck(trimmed);
    if (created) {
      setSelectedDeckId(created.id);
      setQuickDeckName("");
      showToast(`「${created.name}」を自分のデッキに追加しました。`);
    }
  };

  const handleManualOpponentChange = (value: string) => {
    const matched = cheatSheetEntries.find(
      (entry) => entry.themeName === value,
    );
    dispatchSessionEvent({
      type: "opponent_manual_set",
      opponentDeck: value,
      themeId: matched?.id ?? null,
      at: new Date().toISOString(),
    });
    if (matched) {
      setLinkedThemeId(matched.id);
    }
  };

  const recentRecords = useMemo(() => records.slice(0, 5), [records]);

  return (
    <div className="space-y-4">
      {/* 上部コントロールバー */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Swords className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-bold leading-tight">
              デュエル画面（2ペイン連携）
            </h2>
            <p className="text-xs text-muted-foreground">
              左で画面読み取り・戦績記録、右で相手テーマの誘発カンペを同時確認できます。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              captureState === "capturing"
                ? "default"
                : captureState === "paused"
                  ? "secondary"
                  : "muted"
            }
          >
            {captureState === "capturing"
              ? "読み取り中"
              : captureState === "paused"
                ? "一時停止中"
                : "画面共有オフ"}
          </Badge>
          {readerStatus === "loading" && (
            <Badge variant="secondary" className="tabular-nums">
              準備中 {readerProgress}%
            </Badge>
          )}

          {captureState === "idle" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void startCapture()}
              disabled={!isSupported}
            >
              <MonitorPlay className="h-4 w-4" />
              マスターデュエルの画面を選択
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={togglePause}
              >
                {captureState === "capturing" ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    一時停止
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    再開
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowPreview((prev) => !prev)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    映像を隠す
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    映像を表示
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={stopCapture}
              >
                <MonitorStop className="h-3.5 w-3.5" />
                共有終了
              </Button>
            </>
          )}
        </div>
      </div>

      {(captureError || trackerError) && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive-foreground"
        >
          {captureError ?? trackerError}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-foreground"
        >
          {toast}
        </div>
      )}

      {/* 勝敗の仮確定バナー */}
      {session.pendingResult && (
        <Card className="border-primary/60 bg-primary/10">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">
                  試合結果を検知しました（仮確定）
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                そのまま次の試合のコイントスを検知すると自動で確定されます
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  勝敗
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      pendingResultValue === "win" ? "default" : "outline"
                    }
                    onClick={() => setPendingResultValue("win")}
                  >
                    勝ち
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      pendingResultValue === "lose" ? "destructive" : "outline"
                    }
                    onClick={() => setPendingResultValue("lose")}
                  >
                    負け
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  コイントス
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={pendingCoin === "heads" ? "default" : "outline"}
                    onClick={() => setPendingCoin("heads")}
                  >
                    表
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={pendingCoin === "tails" ? "default" : "outline"}
                    onClick={() => setPendingCoin("tails")}
                  >
                    裏
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  先攻・後攻
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      pendingTurnOrder === "first" ? "default" : "outline"
                    }
                    onClick={() => setPendingTurnOrder("first")}
                  >
                    先攻
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      pendingTurnOrder === "second" ? "default" : "outline"
                    }
                    onClick={() => setPendingTurnOrder("second")}
                  >
                    後攻
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="duel-pending-opponent"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  相手デッキ
                </label>
                <ComboboxInput
                  id="duel-pending-opponent"
                  value={pendingOpponent}
                  onChange={setPendingOpponent}
                  options={opponentSuggestions}
                  placeholder="相手デッキ名"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleDiscardPending}
              >
                <XCircle className="h-4 w-4" />
                破棄
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleConfirmPending()}
              >
                <CheckCircle2 className="h-4 w-4" />
                この内容で戦績を確定
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2ペイン本体 */}
      <div className="grid gap-6 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
        {/* 左ペイン：進行中の試合 & 戦績クイック記録 */}
        <div className="space-y-4">
          {/* video 要素はプレビュー非表示時でもフレーム取得のためにマウント維持する */}
          <div
            className={
              showPreview && captureState !== "idle"
                ? "overflow-hidden rounded-lg border border-border bg-slate-950"
                : "sr-only"
            }
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-contain"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">進行中の対戦</CardTitle>
                  <CardDescription className="text-xs">
                    自動検知された項目はいつでも手動で補正できます。
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dispatchSessionEvent({ type: "reset_session" });
                    resetInference();
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  リセット
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {/* 自分の使用デッキ */}
              <div className="space-y-1.5">
                <label
                  htmlFor="duel-player-deck"
                  className="block text-xs font-medium"
                >
                  自分の使用デッキ
                </label>
                {activeDecks.length > 0 ? (
                  <Select
                    id="duel-player-deck"
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                  >
                    {activeDecks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="flex gap-1.5">
                    <Input
                      id="duel-player-deck"
                      value={quickDeckName}
                      onChange={(e) => setQuickDeckName(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.nativeEvent.isComposing &&
                          e.keyCode !== 229
                        ) {
                          e.preventDefault();
                          void handleQuickAddDeck();
                        }
                      }}
                      placeholder="デッキ名を入力して登録"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleQuickAddDeck()}
                    >
                      登録
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label
                    htmlFor="duel-season"
                    className="block text-xs font-medium"
                  >
                    シーズン / イベント
                  </label>
                  <ComboboxInput
                    id="duel-season"
                    value={season}
                    onChange={setSeason}
                    options={SEASON_EVENT_PRESETS}
                    placeholder="ランク戦"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="duel-rank"
                    className="block text-xs font-medium"
                  >
                    ランク帯
                  </label>
                  <ComboboxInput
                    id="duel-rank"
                    value={rank}
                    onChange={setRank}
                    options={RANK_PRESETS}
                    placeholder="任意"
                  />
                </div>
              </div>

              {/* コイン & 先攻/後攻 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="block text-xs font-medium">コイントス</span>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        session.coinFlip === "heads" ? "default" : "outline"
                      }
                      onClick={() =>
                        dispatchSessionEvent({
                          type: "coin_detected",
                          coinFlip: "heads",
                          at: new Date().toISOString(),
                        })
                      }
                    >
                      表
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        session.coinFlip === "tails" ? "default" : "outline"
                      }
                      onClick={() =>
                        dispatchSessionEvent({
                          type: "coin_detected",
                          coinFlip: "tails",
                          at: new Date().toISOString(),
                        })
                      }
                    >
                      裏
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-xs font-medium">先攻・後攻</span>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        session.turnOrder === "first" ? "default" : "outline"
                      }
                      onClick={() =>
                        dispatchSessionEvent({
                          type: "turn_order_detected",
                          turnOrder: "first",
                          at: new Date().toISOString(),
                        })
                      }
                    >
                      先攻
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        session.turnOrder === "second" ? "default" : "outline"
                      }
                      onClick={() =>
                        dispatchSessionEvent({
                          type: "turn_order_detected",
                          turnOrder: "second",
                          at: new Date().toISOString(),
                        })
                      }
                    >
                      後攻
                    </Button>
                  </div>
                </div>
              </div>

              {/* 相手デッキ */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="duel-opponent-deck"
                    className="block text-xs font-medium"
                  >
                    相手デッキ
                  </label>
                  {session.opponentThemeId && (
                    <Badge variant="secondary" className="text-[10px]">
                      {session.opponentLockedByUser ? "手動指定" : "自動判定"}
                    </Badge>
                  )}
                </div>
                <ComboboxInput
                  id="duel-opponent-deck"
                  value={
                    session.opponentDeck === "不明" ? "" : session.opponentDeck
                  }
                  onChange={handleManualOpponentChange}
                  options={opponentSuggestions}
                  placeholder="自動判定待ち（手動入力も可）"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="duel-memo"
                  className="block text-xs font-medium"
                >
                  ひとことメモ
                </label>
                <Input
                  id="duel-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="うらら刺さった・誘発貫通など"
                />
              </div>

              {/* 手動クイック確定 */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => void handleQuickRecord("win")}
                >
                  勝ちで記録
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleQuickRecord("lose")}
                >
                  負けで記録
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 直近の対戦履歴（コンパクト） */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">直近の対戦（最新5件）</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRecords.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  まだ対戦ログがありません。
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {recentRecords.map((rec) => (
                    <li
                      key={rec.id}
                      className="flex items-center justify-between gap-2 rounded border border-border bg-background/40 px-2.5 py-1.5"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-foreground">
                          vs {rec.opponentDeck}
                        </span>
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {rec.turnOrder === "first" ? "先攻" : "後攻"} /{" "}
                          {rec.coinFlip === "heads" ? "表" : "裏"}
                        </span>
                      </div>
                      <Badge
                        variant={
                          rec.result === "win" ? "default" : "destructive"
                        }
                        className="shrink-0 text-[10px]"
                      >
                        {rec.result === "win" ? "WIN" : "LOSE"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {logs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最新の読み取りログ</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {logs.slice(0, 4).map((entry) => (
                    <li key={entry.id} className="truncate">
                      • {entry.summary}（{entry.rawText}）
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右ペイン：リアルタイム連携 誘発カンペ */}
        <div className="min-w-0">
          <CheatSheetView
            externalSelectedThemeId={linkedThemeId}
            onEditingStateChange={onEditingStateChange}
          />
        </div>
      </div>
    </div>
  );
}
