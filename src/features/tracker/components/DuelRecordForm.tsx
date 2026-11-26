import { Check, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { isRankRequiredForSeason } from "../domain/stats";
import {
  type CoinFlip,
  DEFAULT_SEASON_LABEL,
  type DuelRecord,
  type DuelResult,
  type PlayerDeck,
  RANK_PRESETS,
  SEASON_EVENT_PRESETS,
  type TurnOrder,
} from "../domain/types";
import type { SaveDuelRecordInput } from "../hooks/useTrackerStore";

function toLocalDateTimeInputValue(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

interface DuelRecordFormProps {
  decks: readonly PlayerDeck[];
  opponentSuggestions: readonly string[];
  editingRecord: DuelRecord | null;
  onSave: (
    input: SaveDuelRecordInput,
    existingId?: string,
  ) => Promise<DuelRecord | null>;
  onCancelEdit: () => void;
  onQuickAddDeck: (name: string) => Promise<PlayerDeck | null>;
}

export function DuelRecordForm({
  decks,
  opponentSuggestions,
  editingRecord,
  onSave,
  onCancelEdit,
  onQuickAddDeck,
}: DuelRecordFormProps) {
  const opponentOptions = useMemo(
    () => ["不明", ...opponentSuggestions],
    [opponentSuggestions],
  );

  const activeDecks = decks.filter((deck) => !deck.archived);
  const selectableDecks =
    editingRecord &&
    !activeDecks.some((deck) => deck.id === editingRecord.playerDeckId)
      ? [
          ...activeDecks,
          ...(decks.find((deck) => deck.id === editingRecord.playerDeckId)
            ? [
                decks.find(
                  (deck) => deck.id === editingRecord.playerDeckId,
                ) as PlayerDeck,
              ]
            : []),
        ]
      : activeDecks;

  const [season, setSeason] = useState(DEFAULT_SEASON_LABEL);
  const [rank, setRank] = useState("");
  const [playerDeckId, setPlayerDeckId] = useState(
    () => activeDecks[0]?.id ?? "",
  );
  const [opponentDeck, setOpponentDeck] = useState("");
  const [coinFlip, setCoinFlip] = useState<CoinFlip>("heads");
  const [turnOrder, setTurnOrder] = useState<TurnOrder>("first");
  const [result, setResult] = useState<DuelResult>("win");
  const [playedAtLocal, setPlayedAtLocal] = useState(() =>
    toLocalDateTimeInputValue(new Date()),
  );
  const [memo, setMemo] = useState("");
  const [quickDeckName, setQuickDeckName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setSeason(editingRecord.season);
      setRank(editingRecord.rank);
      setPlayerDeckId(editingRecord.playerDeckId);
      setOpponentDeck(editingRecord.opponentDeck);
      setCoinFlip(editingRecord.coinFlip);
      setTurnOrder(editingRecord.turnOrder);
      setResult(editingRecord.result);
      setPlayedAtLocal(toLocalDateTimeInputValue(editingRecord.playedAt));
      setMemo(editingRecord.memo);
      return;
    }
    setPlayedAtLocal(toLocalDateTimeInputValue(new Date()));
  }, [editingRecord]);

  useEffect(() => {
    if (!editingRecord && !playerDeckId && activeDecks[0]) {
      setPlayerDeckId(activeDecks[0].id);
    }
  }, [activeDecks, editingRecord, playerDeckId]);

  const rankRequired = isRankRequiredForSeason(season);

  const selectableSeasons = useMemo(
    () =>
      season && !SEASON_EVENT_PRESETS.includes(season)
        ? [season, ...SEASON_EVENT_PRESETS]
        : SEASON_EVENT_PRESETS,
    [season],
  );

  const selectableRanks = useMemo(
    () =>
      rank && !RANK_PRESETS.includes(rank)
        ? [rank, ...RANK_PRESETS]
        : RANK_PRESETS,
    [rank],
  );

  const handleSeasonChange = (nextSeason: string) => {
    setSeason(nextSeason);
    // DC へ切り替えた際、前回のランク帯が誤って残るのを防ぐ
    if (!isRankRequiredForSeason(nextSeason)) {
      setRank("");
    }
  };

  const handleSelectCoin = (nextCoin: CoinFlip) => {
    setCoinFlip(nextCoin);
    if (!editingRecord) {
      setTurnOrder(nextCoin === "heads" ? "first" : "second");
    }
  };

  const handleQuickAddDeck = async () => {
    const trimmed = quickDeckName.trim();
    if (!trimmed) {
      return;
    }
    const created = await onQuickAddDeck(trimmed);
    if (created) {
      setQuickDeckName("");
      setPlayerDeckId(created.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDeck = decks.find((deck) => deck.id === playerDeckId);
    const resolvedDeckName =
      selectedDeck?.name ?? editingRecord?.playerDeckName ?? "";

    if (
      !season.trim() ||
      (rankRequired && !rank.trim()) ||
      !playerDeckId ||
      !resolvedDeckName
    ) {
      return;
    }

    const playedAtDate = playedAtLocal ? new Date(playedAtLocal) : new Date();
    const playedAtIso = Number.isNaN(playedAtDate.getTime())
      ? new Date().toISOString()
      : playedAtDate.toISOString();

    setIsSaving(true);
    try {
      const saved = await onSave(
        {
          playedAt: playedAtIso,
          season: season.trim(),
          rank: rank.trim(),
          playerDeckId,
          playerDeckName: resolvedDeckName,
          opponentDeck: opponentDeck.trim() || "不明",
          coinFlip,
          turnOrder,
          result,
          memo,
        },
        editingRecord?.id,
      );
      if (saved) {
        if (editingRecord) {
          onCancelEdit();
        }
        // 連続記録しやすいよう、シーズン・ランク帯・自分デッキは引き継ぐ
        setOpponentDeck("");
        setMemo("");
        setPlayedAtLocal(toLocalDateTimeInputValue(new Date()));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">
            {editingRecord ? "対戦ログを編集" : "対戦結果を記録"}
          </CardTitle>
          <CardDescription>
            {editingRecord
              ? "選択した対戦ログの内容を修正します。"
              : "モード・ランク帯・自分のデッキは前回の選択を引き継ぎます。"}
          </CardDescription>
        </div>
        {editingRecord && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancelEdit}
          >
            <X className="h-4 w-4" />
            編集をキャンセル
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {selectableDecks.length === 0 ? (
          <div className="space-y-3 rounded-md border border-dashed border-border bg-background/40 p-4">
            <p className="text-sm font-medium">
              まずは自分のデッキを 1 つ登録しましょう
            </p>
            <p className="text-xs text-muted-foreground">
              登録したデッキはこのブラウザに保存され、次からは選ぶだけで記録できます。
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                aria-label="最初のデッキ名"
                placeholder="例: スネークアイ、天盃龍"
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
                className="max-w-xs"
              />
              <Button
                type="button"
                onClick={() => void handleQuickAddDeck()}
                disabled={!quickDeckName.trim()}
              >
                <Plus className="h-4 w-4" />
                デッキを登録
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="tracker-season"
                  className="text-xs font-medium text-muted-foreground"
                >
                  モード / イベント
                </label>
                <Select
                  id="tracker-season"
                  value={season}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                >
                  {selectableSeasons.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tracker-rank"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {rankRequired ? (
                    <>
                      ランク帯 <span className="text-destructive">*</span>
                    </>
                  ) : (
                    "ランク帯（DCは不要）"
                  )}
                </label>
                <Select
                  id="tracker-rank"
                  value={rankRequired ? rank : ""}
                  onChange={(e) => setRank(e.target.value)}
                  disabled={!rankRequired}
                  required={rankRequired}
                >
                  <option value="">
                    {rankRequired ? "ランク帯を選択" : "入力不要"}
                  </option>
                  {selectableRanks.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tracker-player-deck"
                  className="text-xs font-medium text-muted-foreground"
                >
                  自分のデッキ
                </label>
                <Select
                  id="tracker-player-deck"
                  value={playerDeckId}
                  onChange={(e) => setPlayerDeckId(e.target.value)}
                >
                  {selectableDecks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.archived ? `${deck.name}（アーカイブ）` : deck.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tracker-opponent-deck"
                  className="text-xs font-medium text-muted-foreground"
                >
                  相手のデッキ（空欄時は「不明」）
                </label>
                <ComboboxInput
                  id="tracker-opponent-deck"
                  value={opponentDeck}
                  onChange={setOpponentDeck}
                  options={opponentOptions}
                  placeholder="カンペ辞書から選択または自由入力"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground">
                  コイントス
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={coinFlip === "heads" ? "default" : "outline"}
                    onClick={() => handleSelectCoin("heads")}
                  >
                    表
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={coinFlip === "tails" ? "default" : "outline"}
                    onClick={() => handleSelectCoin("tails")}
                  >
                    裏
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground">
                  実際の先攻 / 後攻
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={turnOrder === "first" ? "default" : "outline"}
                    onClick={() => setTurnOrder("first")}
                  >
                    先攻
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={turnOrder === "second" ? "default" : "outline"}
                    onClick={() => setTurnOrder("second")}
                  >
                    後攻
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground">
                  勝敗
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={result === "win" ? "default" : "outline"}
                    className={
                      result === "win"
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : undefined
                    }
                    onClick={() => setResult("win")}
                  >
                    WIN
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={result === "lose" ? "destructive" : "outline"}
                    onClick={() => setResult("lose")}
                  >
                    LOSE
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tracker-played-at"
                  className="text-xs font-medium text-muted-foreground"
                >
                  対戦日時
                </label>
                <Input
                  id="tracker-played-at"
                  type="datetime-local"
                  value={playedAtLocal}
                  onChange={(e) => setPlayedAtLocal(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label
                  htmlFor="tracker-memo"
                  className="text-xs font-medium text-muted-foreground"
                >
                  メモ（任意）
                </label>
                <Textarea
                  id="tracker-memo"
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="誘発の打ちどころ・プレミ反省・相手の構築メモなど"
                />
              </div>
              <Button
                type="submit"
                disabled={
                  isSaving ||
                  !season.trim() ||
                  (rankRequired && !rank.trim()) ||
                  !playerDeckId
                }
                className="sm:min-w-36"
              >
                <Check className="h-4 w-4" />
                {editingRecord ? "変更を保存" : "対戦を記録"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
