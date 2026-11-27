import {
  ArrowDownWideNarrow,
  BookOpen,
  ExternalLink,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useTransientMessage } from "@/shared/lib/useTransientMessage";
import { CARD_SUGGEST_CATALOG } from "../data/cardSuggestCatalog";
import { HAND_TRAP_CATALOG } from "../data/handTrapCatalog";
import { NEURON_CID_MAP } from "../data/neuronCidMap";
import { buildCardSuggestDictionary } from "../domain/cardSuggest";
import {
  type CardLinkTextSegment,
  createCardLinkTokenizer,
  extractNeuronLinksFromLabel,
  resolveNeuronCardLink,
} from "../domain/neuronLink";
import {
  filterAndSortHandTraps,
  filterCheatSheetByTier,
  parseUniqueListInput,
  searchCheatSheetEntries,
} from "../domain/search";
import {
  CHEAT_SHEET_TIER_LABEL,
  type CheatSheetEntry,
  type CheatSheetTier,
  cheatSheetTierSchema,
  type HandTrapCatalogItem,
  type HandTrapMemo,
  type HandTrapPriority,
  handTrapPrioritySchema,
  type ResolvedCheatSheetEntry,
  type TierFilterValue,
} from "../domain/types";
import { useCheatSheetDictionary } from "../hooks/useCheatSheetDictionary";
import { CardSuggestInput } from "./CardSuggestInput";

const PRIORITY_META: Record<
  HandTrapPriority,
  {
    symbol: string;
    label: string;
    badgeVariant: "default" | "secondary" | "muted";
  }
> = {
  high: { symbol: "◎", label: "優先: 高", badgeVariant: "default" },
  medium: { symbol: "○", label: "優先: 中", badgeVariant: "secondary" },
  low: { symbol: "△", label: "優先: 低", badgeVariant: "muted" },
};

const TIER_FILTER_OPTIONS: readonly {
  value: TierFilterValue;
  label: string;
}[] = [
  { value: "all", label: "すべて" },
  { value: "top", label: "Tier 1-2" },
  { value: "tier3", label: "Tier 3" },
  { value: "tier4", label: "Tier 4" },
  { value: "tier5", label: "Tier 5・他" },
  { value: "custom", label: "編集・自作" },
];

const TIER_BADGE_VARIANT: Record<
  CheatSheetTier,
  "default" | "secondary" | "outline" | "muted"
> = {
  tier1: "default",
  tier2: "default",
  tier3: "secondary",
  tier4: "outline",
  tier5: "muted",
  other: "muted",
};

const MATCH_FIELD_LABEL: Record<string, string | null> = {
  all: null,
  theme: "テーマ名で一致",
  alias: "別名で一致",
  card: "カード名で一致",
  memo: "メモで一致",
};

const SHORT_LABEL_BY_ID = new Map<string, string>(
  HAND_TRAP_CATALOG.map((item) => [item.id, item.shortLabel]),
);

const EXTRA_CATALOG_TRAPS: readonly HandTrapCatalogItem[] =
  HAND_TRAP_CATALOG.filter((item) => !item.isStandard);

interface EditorDraft {
  themeName: string;
  aliasesText: string;
  signatureCardsText: string;
  summary: string;
  tier: CheatSheetTier | "";
  deckType: string;
  handTraps: HandTrapMemo[];
}

function toDraft(entry: ResolvedCheatSheetEntry): EditorDraft {
  return {
    themeName: entry.themeName,
    aliasesText: entry.aliases.join("、"),
    signatureCardsText: entry.signatureCards.join("\n"),
    summary: entry.summary,
    tier: entry.tier ?? "",
    deckType: entry.deckType ?? "",
    handTraps: structuredClone(entry.handTraps),
  };
}

function renderCardLinkedText(segments: readonly CardLinkTextSegment[]) {
  return segments.map((seg) => {
    if (seg.type === "text") {
      return <Fragment key={`t-${seg.start}`}>{seg.text}</Fragment>;
    }
    return (
      <a
        key={`c-${seg.start}-${seg.link.keyword}`}
        href={seg.link.url}
        target="_blank"
        rel="noopener noreferrer"
        title={
          seg.link.isDirectDetail
            ? `遊戯王ニューロンで「${seg.link.keyword}」の詳細を開く`
            : `遊戯王ニューロンで「${seg.link.keyword}」を検索`
        }
        className="mx-0.5 inline-flex items-baseline gap-0.5 rounded border border-primary/30 bg-primary/10 px-1 font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/20 hover:text-primary"
      >
        {seg.text}
        <ExternalLink className="h-2.5 w-2.5 shrink-0 self-center opacity-60" />
      </a>
    );
  });
}

interface CheatSheetViewProps {
  onEditingStateChange?: (isEditing: boolean) => void;
  externalSelectedThemeId?: string | null;
}

export function CheatSheetView({
  onEditingStateChange,
  externalSelectedThemeId,
}: CheatSheetViewProps) {
  const {
    entries,
    isLoading,
    corruptedCount,
    error: storageError,
    saveEntry,
    createEntry,
    removeOverride,
  } = useCheatSheetDictionary();

  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [newThemeName, setNewThemeName] = useState("");
  const [newTrapLabel, setNewTrapLabel] = useState("");
  const [newSignatureCard, setNewSignatureCard] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(true);
  const [selectedTrapIds, setSelectedTrapIds] = useState<string[]>([]);
  const { message: statusMessage, show: showToast } = useTransientMessage();

  useEffect(() => {
    onEditingStateChange?.(isEditing);
    return () => {
      onEditingStateChange?.(false);
    };
  }, [isEditing, onEditingStateChange]);

  useEffect(() => {
    if (!externalSelectedThemeId || isEditing) {
      return;
    }
    const exists = entries.some(
      (entry) => entry.id === externalSelectedThemeId,
    );
    if (exists) {
      setSelectedId(externalSelectedThemeId);
      setQuery("");
      setTierFilter("all");
    }
  }, [entries, externalSelectedThemeId, isEditing]);

  const searchResults = useMemo(() => {
    const matched = searchCheatSheetEntries(entries, query);
    return filterCheatSheetByTier(matched, tierFilter);
  }, [entries, query, tierFilter]);

  const selectedEntry = useMemo(
    () =>
      entries.find((e) => e.id === selectedId) ??
      searchResults[0]?.entry ??
      entries[0] ??
      null,
    [entries, searchResults, selectedId],
  );

  const visibleHandTraps = useMemo(() => {
    if (!selectedEntry) {
      return [];
    }
    return filterAndSortHandTraps(selectedEntry.handTraps, {
      highPriorityOnly,
      selectedTrapIds,
      sortByPriority,
    });
  }, [selectedEntry, highPriorityOnly, selectedTrapIds, sortByPriority]);

  const availableCatalogTraps = useMemo(() => {
    if (!draft) {
      return [];
    }
    const existingIds = new Set(draft.handTraps.map((ht) => ht.id));
    const existingLabels = new Set(draft.handTraps.map((ht) => ht.label));
    return EXTRA_CATALOG_TRAPS.filter(
      (item) => !existingIds.has(item.id) && !existingLabels.has(item.label),
    );
  }, [draft]);

  const cardSuggestDictionary = useMemo(
    () => buildCardSuggestDictionary(CARD_SUGGEST_CATALOG, entries),
    [entries],
  );

  const existingTrapLabels = useMemo(
    () => (draft ? draft.handTraps.map((ht) => ht.label) : []),
    [draft],
  );

  const existingSignatureCards = useMemo(
    () => (draft ? parseUniqueListInput(draft.signatureCardsText) : []),
    [draft],
  );

  const tokenizeCardLinks = useMemo(
    () =>
      createCardLinkTokenizer({
        cidMap: NEURON_CID_MAP,
        signatureCards: selectedEntry?.signatureCards ?? [],
      }),
    [selectedEntry?.signatureCards],
  );

  useEffect(() => {
    if (!selectedId && entries[0]) {
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId]);

  const toggleTrapFilter = (trapId: string) => {
    setSelectedTrapIds((prev) =>
      prev.includes(trapId)
        ? prev.filter((id) => id !== trapId)
        : [...prev, trapId],
    );
  };

  const handleSelectEntry = (entry: ResolvedCheatSheetEntry) => {
    if (
      isEditing &&
      entry.id !== selectedEntry?.id &&
      !window.confirm(
        "編集内容が保存されていません。変更を破棄して別のテーマを開きますか？",
      )
    ) {
      return;
    }
    setSelectedId(entry.id);
    setIsEditing(false);
    setDraft(null);
  };

  const handleStartEdit = () => {
    if (!selectedEntry) {
      return;
    }
    setDraft(toDraft(selectedEntry));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraft(null);
    setNewTrapLabel("");
    setNewSignatureCard("");
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry || !draft?.themeName.trim() || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const nextEntry: CheatSheetEntry = {
        id: selectedEntry.id,
        themeName: draft.themeName.trim(),
        aliases: parseUniqueListInput(draft.aliasesText),
        signatureCards: parseUniqueListInput(draft.signatureCardsText),
        summary: draft.summary.trim(),
        handTraps: draft.handTraps,
        tier: draft.tier || undefined,
        deckType: draft.deckType.trim() || undefined,
        summonMethods: selectedEntry.summonMethods,
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveEntry(nextEntry);
      if (saved) {
        setIsEditing(false);
        setDraft(null);
        showToast(`「${saved.themeName}」を保存しました`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetTemplate = async () => {
    if (selectedEntry?.source !== "customized" || isSubmitting) {
      return;
    }
    if (
      !window.confirm(
        `「${selectedEntry.themeName}」の編集内容を破棄して、初期データに戻しますか？`,
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await removeOverride(selectedEntry.id);
      if (ok) {
        setIsEditing(false);
        setDraft(null);
        showToast("初期データに戻しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustom = async () => {
    if (selectedEntry?.source !== "custom" || isSubmitting) {
      return;
    }
    if (
      !window.confirm(
        `「${selectedEntry.themeName}」を削除しますか？この操作は元に戻せません。`,
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const deletedName = selectedEntry.themeName;
      const ok = await removeOverride(selectedEntry.id);
      if (ok) {
        setSelectedId("");
        setIsEditing(false);
        setDraft(null);
        showToast(`「${deletedName}」を削除しました`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTheme = async () => {
    const trimmed = newThemeName.trim();
    if (!trimmed || isSubmitting) {
      return;
    }
    if (
      isEditing &&
      !window.confirm(
        "編集内容が保存されていません。変更を破棄して新しいテーマを追加しますか？",
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createEntry(trimmed);
      if (created) {
        setNewThemeName("");
        setTierFilter("all");
        setSelectedId(created.id);
        setDraft({
          themeName: created.themeName,
          aliasesText: "",
          signatureCardsText: "",
          summary: "",
          tier: "",
          deckType: "",
          handTraps: structuredClone(created.handTraps),
        });
        setIsEditing(true);
        showToast(`「${created.themeName}」を追加しました`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDraftHandTrap = (
    trapId: string,
    patch: Partial<{
      label: string;
      target: string;
      priority: HandTrapPriority;
    }>,
  ) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        handTraps: prev.handTraps.map((ht) =>
          ht.id === trapId ? { ...ht, ...patch } : ht,
        ),
      };
    });
  };

  const addCatalogHandTrap = (item: HandTrapCatalogItem) => {
    if (!draft) {
      return;
    }
    const customTrap: HandTrapMemo = {
      id: item.id,
      label: item.label,
      isStandard: false,
      target: "",
      priority: "high",
    };
    setDraft((prev) =>
      prev ? { ...prev, handTraps: [...prev.handTraps, customTrap] } : prev,
    );
  };

  const addCustomHandTrap = (overrideLabel?: string) => {
    const label = (overrideLabel ?? newTrapLabel).trim();
    if (!label || !draft) {
      return;
    }
    const customTrap: HandTrapMemo = {
      id: `custom-ht-${crypto.randomUUID().slice(0, 8)}`,
      label,
      isStandard: false,
      target: "",
      priority: "medium",
    };
    setDraft((prev) =>
      prev ? { ...prev, handTraps: [...prev.handTraps, customTrap] } : prev,
    );
    setNewTrapLabel("");
  };

  const addSignatureCard = (overrideCardName?: string) => {
    const cardName = (overrideCardName ?? newSignatureCard).trim();
    if (!cardName || !draft) {
      return;
    }
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const existing = parseUniqueListInput(prev.signatureCardsText);
      if (existing.includes(cardName)) {
        return prev;
      }
      return {
        ...prev,
        signatureCardsText: [...existing, cardName].join("\n"),
      };
    });
    setNewSignatureCard("");
  };

  const removeCustomHandTrap = (trapId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            handTraps: prev.handTraps.filter((ht) => ht.id !== trapId),
          }
        : prev,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <BookOpen className="h-5 w-5 text-primary" />
            誘発カンペ
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            テーマ名やカード名から手札誘発の打ちどころをすばやく確認できます。自分用のメモに書き換えて保存も可能です。
          </p>
        </div>
        {statusMessage && (
          <output aria-live="polite">
            <Badge variant="default" className="px-3 py-1">
              {statusMessage}
            </Badge>
          </output>
        )}
      </div>

      {storageError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-xs text-destructive-foreground"
        >
          {storageError}
        </div>
      )}

      {corruptedCount > 0 && (
        <div
          role="alert"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-foreground"
        >
          読み込めないデータが {corruptedCount} 件あったため、除外しました。
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">テーマを探す</CardTitle>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {searchResults.length} / {entries.length} 件
                </span>
              </div>
              <CardDescription className="text-xs">
                ひらがな・カタカナ・中黒（・）の違いを気にせず検索できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例: どらごんている / ファイメナ / 烙印融合"
                  aria-label="テーマ・別名・カード名で検索"
                  className="pl-8"
                />
              </div>

              <div
                className="flex flex-wrap gap-1"
                role="tablist"
                aria-label="環境ランクで絞り込み"
              >
                {TIER_FILTER_OPTIONS.map((opt) => {
                  const active = tierFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTierFilter(opt.value)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
                {isLoading ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    読み込み中…
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    一致するテーマが見つかりません。
                  </p>
                ) : (
                  searchResults.map(({ entry, matchedField }) => {
                    const isActive = selectedEntry?.id === entry.id;
                    const matchLabel = MATCH_FIELD_LABEL[matchedField];
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectEntry(entry)}
                        className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/70 bg-background/40 hover:bg-accent/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-sm">
                            {entry.themeName}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {entry.tier && entry.tier !== "other" && (
                              <Badge
                                variant={TIER_BADGE_VARIANT[entry.tier]}
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {CHEAT_SHEET_TIER_LABEL[entry.tier]}
                              </Badge>
                            )}
                            {entry.source === "customized" && (
                              <Badge variant="outline" className="text-[10px]">
                                編集済み
                              </Badge>
                            )}
                            {entry.source === "custom" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                自作
                              </Badge>
                            )}
                          </div>
                        </div>
                        {entry.aliases.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {entry.aliases.join(" / ")}
                          </p>
                        )}
                        {matchLabel && (
                          <span className="mt-1 inline-block text-[10px] font-medium text-primary">
                            {matchLabel}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  テーマを追加
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="テーマ名（例: 三幻魔）"
                    aria-label="追加するテーマ名"
                    onKeyDown={(e) => {
                      // 日本語 IME の変換確定 Enter で誤って作成されないよう isComposing を除外する
                      if (e.nativeEvent.isComposing || e.keyCode === 229) {
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreateTheme();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCreateTheme()}
                    disabled={!newThemeName.trim() || isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                    追加
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {!selectedEntry ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                一覧からテーマを選んでください。
              </CardContent>
            </Card>
          ) : isEditing && draft ? (
            <Card className="border-primary/40">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">カンペを編集</CardTitle>
                  <CardDescription>
                    保存した内容はこのブラウザに記録されます。
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4" />
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSaveEdit()}
                    disabled={!draft.themeName.trim() || isSubmitting}
                  >
                    <Save className="h-4 w-4" />
                    保存
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="cs-theme-name"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      テーマ名
                    </label>
                    <Input
                      id="cs-theme-name"
                      value={draft.themeName}
                      onChange={(e) =>
                        setDraft({ ...draft, themeName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="cs-aliases"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      別名（読点やカンマで区切る）
                    </label>
                    <Input
                      id="cs-aliases"
                      value={draft.aliasesText}
                      onChange={(e) =>
                        setDraft({ ...draft, aliasesText: e.target.value })
                      }
                      placeholder="例: 星辰、ファイメナ"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="cs-tier"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      環境ランク目安
                    </label>
                    <Select
                      id="cs-tier"
                      value={draft.tier}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setDraft({ ...draft, tier: "" });
                          return;
                        }
                        const parsed = cheatSheetTierSchema.safeParse(val);
                        if (parsed.success) {
                          setDraft({ ...draft, tier: parsed.data });
                        }
                      }}
                    >
                      <option value="">未設定</option>
                      <option value="tier1">Tier 1</option>
                      <option value="tier2">Tier 2</option>
                      <option value="tier3">Tier 3</option>
                      <option value="tier4">Tier 4</option>
                      <option value="tier5">Tier 5</option>
                      <option value="other">その他</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="cs-deck-type"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      デッキタイプ（任意）
                    </label>
                    <Input
                      id="cs-deck-type"
                      value={draft.deckType}
                      onChange={(e) =>
                        setDraft({ ...draft, deckType: e.target.value })
                      }
                      placeholder="例: ミッド型 / 展開型 / 罠ビート"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="cs-summary"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    対策のポイント
                  </label>
                  <Textarea
                    id="cs-summary"
                    value={draft.summary}
                    onChange={(e) =>
                      setDraft({ ...draft, summary: e.target.value })
                    }
                    placeholder="対面で意識したい止めどころや注意点"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-foreground">
                    手札誘発ごとの打ちどころ
                  </p>
                  <div className="space-y-2.5">
                    {draft.handTraps.map((ht) => (
                      <div
                        key={ht.id}
                        className="space-y-2 rounded-md border border-border bg-background/50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {ht.label}
                            </span>
                            {!ht.isStandard && (
                              <Badge variant="outline" className="text-[10px]">
                                追加
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              aria-label={`${ht.label}の優先度`}
                              value={ht.priority}
                              onChange={(e) => {
                                const parsed = handTrapPrioritySchema.safeParse(
                                  e.target.value,
                                );
                                if (parsed.success) {
                                  updateDraftHandTrap(ht.id, {
                                    priority: parsed.data,
                                  });
                                }
                              }}
                              className="h-8 w-28 text-xs"
                            >
                              <option value="high">◎ 優先: 高</option>
                              <option value="medium">○ 優先: 中</option>
                              <option value="low">△ 優先: 低</option>
                            </Select>
                            {!ht.isStandard && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={`${ht.label}を削除`}
                                onClick={() => removeCustomHandTrap(ht.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <Input
                          value={ht.target}
                          onChange={(e) =>
                            updateDraftHandTrap(ht.id, {
                              target: e.target.value,
                            })
                          }
                          placeholder="止めたいカードやタイミングを入力"
                          className="text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  {availableCatalogTraps.length > 0 && (
                    <div className="space-y-1.5 rounded-md border border-dashed border-border/80 bg-background/30 p-3">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        よく使われる誘発・メタカードをワンクリック追加
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCatalogTraps.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => addCatalogHandTrap(item)}
                            title={item.role}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                          >
                            <Plus className="h-3 w-3 text-primary" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <CardSuggestInput
                      value={newTrapLabel}
                      onChange={setNewTrapLabel}
                      onCommit={(cardName) => addCustomHandTrap(cardName)}
                      dictionary={cardSuggestDictionary}
                      preferredCategory="handTrap"
                      excludeNames={existingTrapLabels}
                      placeholder="読みやカード名で追加（例: はるう / いってき / 禁じられた一滴）"
                      aria-label="追加する誘発カード名"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addCustomHandTrap()}
                      disabled={!newTrapLabel.trim()}
                    >
                      <Plus className="h-4 w-4" />
                      カードを追加
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="cs-signature-cards"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    主なカード（1行に1枚・汎用カードは除く）
                  </label>
                  <div className="flex gap-2">
                    <CardSuggestInput
                      value={newSignatureCard}
                      onChange={setNewSignatureCard}
                      onCommit={(cardName) => addSignatureCard(cardName)}
                      dictionary={cardSuggestDictionary}
                      preferredCategory="theme"
                      excludeNames={existingSignatureCards}
                      placeholder="読みやカード名から候補を選んで追加（例: ふぁいめな / らくいん）"
                      aria-label="主なカード名サジェスト入力"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addSignatureCard()}
                      disabled={!newSignatureCard.trim()}
                    >
                      <Plus className="h-4 w-4" />
                      追加
                    </Button>
                  </div>
                  <Textarea
                    id="cs-signature-cards"
                    rows={4}
                    value={draft.signatureCardsText}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        signatureCardsText: e.target.value,
                      })
                    }
                    placeholder={
                      "テーマ固有のカードを1行ずつ入力\n例: 星辰砲手ファイメナ"
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">
                      {selectedEntry.themeName}
                    </CardTitle>
                    {selectedEntry.tier && selectedEntry.tier !== "other" && (
                      <Badge variant={TIER_BADGE_VARIANT[selectedEntry.tier]}>
                        {CHEAT_SHEET_TIER_LABEL[selectedEntry.tier]}
                      </Badge>
                    )}
                    {selectedEntry.deckType && (
                      <Badge variant="outline" className="text-[11px]">
                        {selectedEntry.deckType}
                      </Badge>
                    )}
                    {selectedEntry.summonMethods?.map((method) => (
                      <Badge
                        key={method}
                        variant="muted"
                        className="text-[11px]"
                      >
                        {method}
                      </Badge>
                    ))}
                    {selectedEntry.source === "template" && (
                      <Badge variant="muted">初期データ</Badge>
                    )}
                    {selectedEntry.source === "customized" && (
                      <Badge variant="outline">編集済み</Badge>
                    )}
                    {selectedEntry.source === "custom" && (
                      <Badge variant="secondary">自作</Badge>
                    )}
                  </div>
                  {selectedEntry.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEntry.aliases.map((alias) => (
                        <Badge
                          key={alias}
                          variant="secondary"
                          className="text-[11px] font-normal"
                        >
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    編集
                  </Button>
                  {selectedEntry.source === "customized" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleResetTemplate()}
                      disabled={isSubmitting}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      初期値に戻す
                    </Button>
                  )}
                  {selectedEntry.source === "custom" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDeleteCustom()}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {selectedEntry.summary && (
                  <div className="rounded-md border border-border/80 bg-secondary/40 p-3.5 text-sm leading-relaxed">
                    {renderCardLinkedText(
                      tokenizeCardLinks(selectedEntry.summary),
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      手札誘発の打ちどころ（{visibleHandTraps.length} /{" "}
                      {selectedEntry.handTraps.length}）
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={highPriorityOnly ? "default" : "outline"}
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => setHighPriorityOnly((prev) => !prev)}
                      >
                        <Filter className="h-3 w-3" />◎ 優先: 高のみ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={sortByPriority ? "secondary" : "outline"}
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => setSortByPriority((prev) => !prev)}
                      >
                        <ArrowDownWideNarrow className="h-3 w-3" />
                        優先度順
                      </Button>
                    </div>
                  </div>

                  {/* 手札にある誘発でクイック絞り込み */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedEntry.handTraps.map((ht) => {
                      const active = selectedTrapIds.includes(ht.id);
                      const shortName =
                        SHORT_LABEL_BY_ID.get(ht.id) ?? ht.label;
                      return (
                        <button
                          key={ht.id}
                          type="button"
                          onClick={() => toggleTrapFilter(ht.id)}
                          aria-pressed={active}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 bg-background/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                          }`}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                    {selectedTrapIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTrapIds([])}
                        className="rounded-full px-2 py-0.5 text-[11px] text-primary hover:underline"
                      >
                        絞り込み解除
                      </button>
                    )}
                  </div>

                  {visibleHandTraps.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                      現在の絞り込み条件に一致する手札誘発はありません。
                    </p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {visibleHandTraps.map((ht) => {
                        const meta = PRIORITY_META[ht.priority];
                        const isHigh = ht.priority === "high";
                        return (
                          <div
                            key={ht.id}
                            className={`rounded-md border p-3 ${
                              isHigh
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/80 bg-background/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(() => {
                                  const links = extractNeuronLinksFromLabel(
                                    ht.label,
                                    NEURON_CID_MAP,
                                  );
                                  if (links.length === 0) {
                                    return (
                                      <span className="text-sm font-semibold">
                                        {ht.label}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex flex-wrap items-center gap-1 text-sm font-semibold">
                                      {links.map((link, idx) => (
                                        <Fragment key={link.keyword}>
                                          {idx > 0 && (
                                            <span className="text-muted-foreground">
                                              /
                                            </span>
                                          )}
                                          <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={
                                              link.isDirectDetail
                                                ? `遊戯王ニューロンで「${link.keyword}」の詳細を開く`
                                                : `遊戯王ニューロンで「${link.keyword}」を検索`
                                            }
                                            className="inline-flex items-center gap-1 transition-colors hover:text-primary hover:underline"
                                          >
                                            {link.label}
                                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                                          </a>
                                        </Fragment>
                                      ))}
                                    </span>
                                  );
                                })()}
                                {!ht.isStandard && (
                                  <Badge
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    特効・追加
                                  </Badge>
                                )}
                              </div>
                              <Badge variant={meta.badgeVariant}>
                                {meta.symbol} {meta.label}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                              {ht.target
                                ? renderCardLinkedText(
                                    tokenizeCardLinks(ht.target),
                                  )
                                : "未記入（編集から書けます）"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      主なカード（カード名検索の対象）
                    </h3>
                    {selectedEntry.signatureCards.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        カード名クリックで遊戯王ニューロンを開く
                      </span>
                    )}
                  </div>
                  {selectedEntry.signatureCards.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      未登録（編集から追加できます）
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEntry.signatureCards.map((card) => {
                        const link = resolveNeuronCardLink(
                          card,
                          NEURON_CID_MAP,
                        );
                        if (!link) {
                          return null;
                        }
                        return (
                          <a
                            key={card}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={
                              link.isDirectDetail
                                ? `遊戯王ニューロンで「${link.keyword}」の詳細を開く`
                                : `遊戯王ニューロンで「${link.keyword}」を検索`
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                          >
                            {card}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
