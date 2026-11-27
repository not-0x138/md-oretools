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
  X,
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

interface ConfirmRecordDraft {
  source: "auto" | "manual";
  result: DuelResultValue;
  coinFlip: CoinFlipValue;
  turnOrder: TurnOrderValue;
  opponentDeck: string;
  memo: string;
  playedAt: string;
}

const AUTO_RESULT_COOLDOWN_MS = 15_000;

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

  // 登録前の確認ダイアログ用ドラフト（自動検知・手動ボタンのどちらも必ずここを通す）
  const [confirmDraft, setConfirmDraft] = useState<ConfirmRecordDraft | null>(
    null,
  );
  const confirmDraftRef = useRef(confirmDraft);
  confirmDraftRef.current = confirmDraft;
  const memoRef = useRef(memo);
  memoRef.current = memo;
  const lastAutoPromptAtRef = useRef<number>(0);

  useEffect(() => {
    if (selectedDeckId && activeDecks.some((d) => d.id === selectedDeckId)) {
      return;
    }
    const lastUsedDeckId = records[0]?.playerDeckId;
    const preferred =
      (lastUsedDeckId && activeDecks.find((d) => d.id === lastUsedDeckId)) ||
      activeDecks[0];
    if (preferred) {
      setSelectedDeckId(preferred.id);
    }
  }, [activeDecks, records, selectedDeckId]);

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
        memo: string;
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
        memo: payload.memo.trim(),
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
    [rank, saveRecord, season, selectedDeck, showToast],
  );

  const dispatchSessionEvent = useCallback((event: LiveSessionEvent) => {
    const nextSession = reduceLiveDuelSession(sessionRef.current, event);
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const openConfirmDialog = useCallback(
    (result: DuelResultValue, source: "auto" | "manual", at: string) => {
      const current = sessionRef.current;
      setConfirmDraft({
        source,
        result,
        coinFlip: current.coinFlip ?? "heads",
        turnOrder: current.turnOrder ?? "first",
        opponentDeck: current.opponentDeck || "不明",
        memo: memoRef.current,
        playedAt: at,
      });
    },
    [],
  );

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
        dispatchSessionEvent({ type: "coin_detected", coinFlip, at });
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
        // すでに確認ダイアログ表示中、または直前の自動検知からクールダウン内なら再表示しない
        const now = Date.now();
        if (
          confirmDraftRef.current ||
          now - lastAutoPromptAtRef.current < AUTO_RESULT_COOLDOWN_MS
        ) {
          return;
        }
        lastAutoPromptAtRef.current = now;
        openConfirmDialog(result, "auto", at);
      },
    },
  });

  const handleConfirmRegister = async () => {
    if (!confirmDraft) {
      return;
    }
    const ok = await commitDuelResult(
      {
        result: confirmDraft.result,
        coinFlip: confirmDraft.coinFlip,
        turnOrder: confirmDraft.turnOrder,
        opponentDeck: confirmDraft.opponentDeck,
        memo: confirmDraft.memo,
        playedAt: confirmDraft.playedAt,
      },
      "対戦結果を登録しました",
    );
    if (ok) {
      setConfirmDraft(null);
      dispatchSessionEvent({ type: "reset_session" });
      resetInference();
    }
  };

  const handleDeclineRegister = useCallback(() => {
    if (!confirmDraftRef.current) {
      return;
    }
    // 「いいえ」時は登録せず、確認画面で編集したメモ等を進行中フォームへ引き継いで手動編集へ戻す
    const draft = confirmDraftRef.current;
    setMemo(draft.memo);
    if (
      draft.opponentDeck &&
      draft.opponentDeck !== sessionRef.current.opponentDeck
    ) {
      dispatchSessionEvent({
        type: "opponent_manual_set",
        opponentDeck: draft.opponentDeck,
        themeId: sessionRef.current.opponentThemeId,
        at: new Date().toISOString(),
      });
    }
    setConfirmDraft(null);
    // 同じリザルト画面が映り続けていてもすぐに再ポップアップしないようクールダウンを更新する
    lastAutoPromptAtRef.current = Date.now();
    window.setTimeout(() => {
      document.getElementById("duel-memo")?.focus();
    }, 0);
  }, [dispatchSessionEvent]);

  useEffect(() => {
    if (!confirmDraft) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDeclineRegister();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmDraft, handleDeclineRegister]);

  const handleQuickRecord = (result: DuelResultValue) => {
    openConfirmDialog(result, "manual", new Date().toISOString());
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

      {/* 登録前の確認ダイアログ（画面認識の勝敗検知・手動ボタンの両方で表示） */}
      {confirmDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duel-confirm-dialog-title"
        >
          <Card className="w-full max-w-lg border-primary/50 bg-card shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle
                      id="duel-confirm-dialog-title"
                      className="text-base"
                    >
                      この対戦結果を登録しますか？
                    </CardTitle>
                    {confirmDraft.source === "auto" && (
                      <Badge variant="secondary" className="text-[10px]">
                        自動検知
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    内容を確認して「はい」で登録します。メモを詳しく書きたい場合は「いいえ」で戻って手動編集できます。
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleDeclineRegister}
                  aria-label="閉じる"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">自分のデッキ</span>
                  <span className="font-medium text-foreground">
                    {selectedDeck?.name ?? "未選択（先に登録してください）"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    シーズン / ランク帯
                  </span>
                  <span className="text-foreground">
                    {season.trim() || DEFAULT_SEASON_LABEL}
                    {rank.trim() ? ` / ${rank.trim()}` : ""}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    勝敗
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        confirmDraft.result === "win" ? "default" : "outline"
                      }
                      onClick={() =>
                        setConfirmDraft((prev) =>
                          prev ? { ...prev, result: "win" } : null,
                        )
                      }
                    >
                      勝ち
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        confirmDraft.result === "lose"
                          ? "destructive"
                          : "outline"
                      }
                      onClick={() =>
                        setConfirmDraft((prev) =>
                          prev ? { ...prev, result: "lose" } : null,
                        )
                      }
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
                      variant={
                        confirmDraft.coinFlip === "heads"
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setConfirmDraft((prev) =>
                          prev ? { ...prev, coinFlip: "heads" } : null,
                        )
                      }
                    >
                      表
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        confirmDraft.coinFlip === "tails"
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setConfirmDraft((prev) =>
                          prev ? { ...prev, coinFlip: "tails" } : null,
                        )
                      }
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
                        confirmDraft.turnOrder === "first"
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setConfirmDraft((prev) =>
                          prev ? { ...prev, turnOrder: "first" } : null,
                        )
                      }
                    >
                      先攻
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        confirmDraft.turnOrder === "second"
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setConfirmDraft((prev) =>
                          prev ? { ...prev, turnOrder: "second" } : null,
                        )
                      }
                    >
                      後攻
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="duel-confirm-opponent"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  相手デッキ
                </label>
                <ComboboxInput
                  id="duel-confirm-opponent"
                  value={confirmDraft.opponentDeck}
                  onChange={(value) =>
                    setConfirmDraft((prev) =>
                      prev ? { ...prev, opponentDeck: value } : null,
                    )
                  }
                  options={opponentSuggestions}
                  placeholder="相手デッキ名"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="duel-confirm-memo"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  ひとことメモ（任意）
                </label>
                <Input
                  id="duel-confirm-memo"
                  value={confirmDraft.memo}
                  onChange={(e) =>
                    setConfirmDraft((prev) =>
                      prev ? { ...prev, memo: e.target.value } : null,
                    )
                  }
                  placeholder="うらら刺さった・誘発貫通など"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDeclineRegister}
                >
                  いいえ（手動で編集する）
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedDeck}
                  onClick={() => void handleConfirmRegister()}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  はい、登録する
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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

              {/* 手動クイック確定（確認ダイアログ経由） */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button type="button" onClick={() => handleQuickRecord("win")}>
                  勝ちで記録
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleQuickRecord("lose")}
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
