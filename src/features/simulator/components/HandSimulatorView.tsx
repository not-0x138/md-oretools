import {
  BookmarkPlus,
  Calculator,
  FolderOpen,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { useTransientMessage } from "@/shared/lib/useTransientMessage";
import { SAMPLE_SIMULATOR_TEMPLATES } from "../domain/defaultPresets";
import {
  calculateHandProbability,
  createCalculationKey,
  extractSimulatorConfig,
  validateSimulatorConfig,
} from "../domain/probability";
import {
  type ComparisonOperator,
  comparisonOperatorSchema,
  MAX_DECK_SIZE,
  MIN_DECK_SIZE,
  type SimulatorConfig,
} from "../domain/types";
import { useSimulatorPresets } from "../hooks/useSimulatorPresets";

function formatPercent(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`;
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createInitialSimulatorConfig(): SimulatorConfig {
  const firstTemplate = SAMPLE_SIMULATOR_TEMPLATES[0];
  if (!firstTemplate) {
    return {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "starter", name: "1枚初動", count: 12 }],
      conditionSets: [
        {
          id: "set-1",
          name: "初動あり",
          clauses: [
            { id: "c1", groupId: "starter", operator: "gte", count: 1 },
          ],
        },
      ],
    };
  }
  return extractSimulatorConfig(firstTemplate.config);
}

interface HandSimulatorViewProps {
  config: SimulatorConfig;
  onConfigChange: (
    updater: SimulatorConfig | ((prev: SimulatorConfig) => SimulatorConfig),
  ) => void;
}

export function HandSimulatorView({
  config,
  onConfigChange,
}: HandSimulatorViewProps) {
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const { message: saveMessage, show: showSaveMessage } = useTransientMessage();

  const {
    presets,
    isLoading,
    corruptedCount,
    error: storageError,
    savePreset,
    deletePreset,
  } = useSimulatorPresets();

  const validation = useMemo(() => validateSimulatorConfig(config), [config]);

  const calculationKey = useMemo(() => createCalculationKey(config), [config]);
  const latestConfigRef = useRef(config);
  latestConfigRef.current = config;

  // グループ名・パターン名の編集だけで確率計算（特にモンテカルロ）が再実行されないよう、計算キー変化時のみ再計算する
  // biome-ignore lint/correctness/useExhaustiveDependencies: calculationKey が計算に必要な全フィールドを網羅している
  const result = useMemo(
    () => calculateHandProbability(latestConfigRef.current),
    [calculationKey],
  );

  const totalAssigned = useMemo(
    () => config.groups.reduce((sum, g) => sum + g.count, 0),
    [config.groups],
  );
  const remainingCards = config.deckSize - totalAssigned;

  const updateDeckSize = (value: number) => {
    const clamped = Math.min(MAX_DECK_SIZE, Math.max(MIN_DECK_SIZE, value));
    onConfigChange((prev) => ({
      ...prev,
      deckSize: clamped,
      handSize: Math.min(prev.handSize, clamped),
    }));
  };

  const updateHandSize = (value: number) => {
    const clamped = Math.min(config.deckSize, Math.max(1, value));
    onConfigChange((prev) => ({ ...prev, handSize: clamped }));
  };

  const addGroup = () => {
    const newId = createId("grp");
    onConfigChange((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        {
          id: newId,
          name: `種類 ${prev.groups.length + 1}`,
          count: Math.min(3, Math.max(0, remainingCards)),
        },
      ],
    }));
  };

  const updateGroup = (
    id: string,
    patch: Partial<{ name: string; count: number }>,
  ) => {
    onConfigChange((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === id ? { ...group, ...patch } : group,
      ),
    }));
  };

  const removeGroup = (id: string) => {
    const target = config.groups.find((g) => g.id === id);
    const affectedClauseCount = config.conditionSets.reduce(
      (sum, set) =>
        sum + set.clauses.filter((clause) => clause.groupId === id).length,
      0,
    );
    if (
      affectedClauseCount > 0 &&
      !window.confirm(
        `「${target?.name || "この種類"}」を削除すると、使われている ${affectedClauseCount} 件の条件も消えます。削除しますか？`,
      )
    ) {
      return;
    }

    onConfigChange((prev) => ({
      ...prev,
      groups: prev.groups.filter((group) => group.id !== id),
      conditionSets: prev.conditionSets.map((set) => ({
        ...set,
        clauses: set.clauses.filter((clause) => clause.groupId !== id),
      })),
    }));
  };

  const addConditionSet = () => {
    const firstGroupId = config.groups[0]?.id;
    onConfigChange((prev) => ({
      ...prev,
      conditionSets: [
        ...prev.conditionSets,
        {
          id: createId("set"),
          name: `パターン ${prev.conditionSets.length + 1}`,
          clauses: firstGroupId
            ? [
                {
                  id: createId("clause"),
                  groupId: firstGroupId,
                  operator: "gte",
                  count: 1,
                },
              ]
            : [],
        },
      ],
    }));
  };

  const updateConditionSetName = (setId: string, name: string) => {
    onConfigChange((prev) => ({
      ...prev,
      conditionSets: prev.conditionSets.map((set) =>
        set.id === setId ? { ...set, name } : set,
      ),
    }));
  };

  const removeConditionSet = (setId: string) => {
    onConfigChange((prev) => ({
      ...prev,
      conditionSets: prev.conditionSets.filter((set) => set.id !== setId),
    }));
  };

  const addClause = (setId: string) => {
    const firstGroupId = config.groups[0]?.id;
    if (!firstGroupId) {
      return;
    }
    onConfigChange((prev) => ({
      ...prev,
      conditionSets: prev.conditionSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              clauses: [
                ...set.clauses,
                {
                  id: createId("clause"),
                  groupId: firstGroupId,
                  operator: "gte",
                  count: 1,
                },
              ],
            }
          : set,
      ),
    }));
  };

  const updateClause = (
    setId: string,
    clauseId: string,
    patch: Partial<{
      groupId: string;
      operator: ComparisonOperator;
      count: number;
    }>,
  ) => {
    onConfigChange((prev) => ({
      ...prev,
      conditionSets: prev.conditionSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              clauses: set.clauses.map((clause) =>
                clause.id === clauseId ? { ...clause, ...patch } : clause,
              ),
            }
          : set,
      ),
    }));
  };

  const removeClause = (setId: string, clauseId: string) => {
    onConfigChange((prev) => ({
      ...prev,
      conditionSets: prev.conditionSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              clauses: set.clauses.filter((clause) => clause.id !== clauseId),
            }
          : set,
      ),
    }));
  };

  const handleSavePreset = async () => {
    if (!presetName.trim() || !validation.valid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const saved = await savePreset(presetName, config, activePresetId);
      if (saved) {
        setActivePresetId(saved.id);
        showSaveMessage(`「${saved.name}」を保存しました`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadConfig = (
    nextConfig: SimulatorConfig,
    label: string,
    presetId?: string,
  ) => {
    onConfigChange(extractSimulatorConfig(nextConfig));
    setPresetName(presetId ? label : "");
    setActivePresetId(presetId);
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (!window.confirm(`設定「${name}」を削除しますか？`)) {
      return;
    }
    if (activePresetId === id) {
      setActivePresetId(undefined);
    }
    await deletePreset(id);
    showSaveMessage(`「${name}」を削除しました`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Calculator className="h-5 w-5 text-primary" />
            初手確率計算
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            デッキのカード内訳と、初手で引きたい条件を設定して確率を計算します。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_SIMULATOR_TEMPLATES.map((tpl) => (
            <Button
              key={tpl.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleLoadConfig(tpl.config, tpl.label)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {tpl.label}
            </Button>
          ))}
        </div>
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
          読み込めない設定が {corruptedCount} 件あったため、一覧から除きました。
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">デッキと初手の枚数</CardTitle>
              <CardDescription>
                デッキ枚数（40〜60枚）と初手枚数を設定します。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="sim-deck-size"
                  className="text-xs font-medium text-muted-foreground"
                >
                  デッキ枚数
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    id="sim-deck-size"
                    min={MIN_DECK_SIZE}
                    max={MAX_DECK_SIZE}
                    value={config.deckSize}
                    onValueChange={updateDeckSize}
                    className="w-20 text-right"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[40, 42, 45, 60].map((size) => (
                      <Button
                        key={size}
                        type="button"
                        size="sm"
                        variant={
                          config.deckSize === size ? "default" : "secondary"
                        }
                        onClick={() => updateDeckSize(size)}
                        className="px-2.5"
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sim-hand-size"
                  className="text-xs font-medium text-muted-foreground"
                >
                  初手枚数
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    id="sim-hand-size"
                    min={1}
                    max={config.deckSize}
                    value={config.handSize}
                    onValueChange={updateHandSize}
                    className="w-20 text-right"
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={config.handSize === 5 ? "default" : "secondary"}
                      onClick={() => updateHandSize(5)}
                    >
                      先攻 5枚
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={config.handSize === 6 ? "default" : "secondary"}
                      onClick={() => updateHandSize(6)}
                    >
                      後攻 6枚
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">カードの種類と枚数</CardTitle>
                <CardDescription>
                  同じカードは重複させず、どれか1つに数えます。残り{" "}
                  <span
                    className={
                      remainingCards < 0
                        ? "font-semibold text-destructive"
                        : "font-semibold text-foreground"
                    }
                  >
                    {remainingCards} 枚
                  </span>{" "}
                  はその他のカードとして扱います。
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addGroup}
              >
                <Plus className="h-4 w-4" />
                種類を追加
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.groups.map((group, groupIndex) => (
                <div
                  key={group.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-background/50 p-2.5"
                >
                  <Input
                    aria-label={`種類 ${groupIndex + 1} の名前`}
                    value={group.name}
                    onChange={(e) =>
                      updateGroup(group.id, { name: e.target.value })
                    }
                    placeholder="例: 1枚初動"
                    className="min-w-40 flex-1"
                  />
                  <div className="flex items-center gap-1.5">
                    <NumberInput
                      aria-label={`${group.name || `種類 ${groupIndex + 1}`}の枚数`}
                      min={0}
                      max={config.deckSize}
                      value={group.count}
                      onValueChange={(nextCount) =>
                        updateGroup(group.id, { count: nextCount })
                      }
                      className="w-20 text-right"
                    />
                    <span className="text-xs text-muted-foreground">枚</span>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`${group.name || `種類 ${groupIndex + 1}`}を削除`}
                    onClick={() => removeGroup(group.id)}
                    disabled={config.groups.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">引きたい初手の条件</CardTitle>
                <CardDescription>
                  パターン内の条件はすべて満たす必要があります。パターンが複数あるときは、どれか1つを満たせば成功です。
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addConditionSet}
              >
                <Plus className="h-4 w-4" />
                パターンを追加
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.conditionSets.map((set, setIndex) => {
                const setProb = result.conditionSetProbabilities.find(
                  (item) => item.id === set.id,
                )?.probability;
                return (
                  <div key={set.id} className="space-y-3">
                    {setIndex > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <Badge variant="outline">または</Badge>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}

                    <div className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          aria-label={`パターン ${setIndex + 1} の名前`}
                          value={set.name}
                          onChange={(e) =>
                            updateConditionSetName(set.id, e.target.value)
                          }
                          placeholder={`パターン ${setIndex + 1}`}
                          className="h-8 max-w-xs text-xs font-medium"
                        />
                        <div className="flex items-center gap-2">
                          {typeof setProb === "number" && validation.valid && (
                            <Badge variant="secondary">
                              このパターン {formatPercent(setProb)}
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`パターン ${setIndex + 1} を削除`}
                            onClick={() => removeConditionSet(set.id)}
                            disabled={config.conditionSets.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {set.clauses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          条件がありません。「条件を追加」から引きたいカードを設定してください。
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {set.clauses.map((clause, clauseIndex) => (
                            <div
                              key={clause.id}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="w-10 text-center text-xs font-semibold text-muted-foreground">
                                {clauseIndex === 0 ? "条件" : "かつ"}
                              </span>
                              <Select
                                aria-label={`パターン ${setIndex + 1} 条件 ${clauseIndex + 1} のカードの種類`}
                                value={clause.groupId}
                                onChange={(e) =>
                                  updateClause(set.id, clause.id, {
                                    groupId: e.target.value,
                                  })
                                }
                                className="min-w-36 flex-1"
                              >
                                {config.groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.name || "（名前なし）"} (
                                    {group.count}枚)
                                  </option>
                                ))}
                              </Select>
                              <NumberInput
                                aria-label={`パターン ${setIndex + 1} 条件 ${clauseIndex + 1} の必要枚数`}
                                min={0}
                                max={config.handSize}
                                value={clause.count}
                                onValueChange={(nextCount) =>
                                  updateClause(set.id, clause.id, {
                                    count: nextCount,
                                  })
                                }
                                className="w-16 text-right"
                              />
                              <Select
                                aria-label={`パターン ${setIndex + 1} 条件 ${clauseIndex + 1} の比較方法`}
                                value={clause.operator}
                                onChange={(e) => {
                                  const parsed =
                                    comparisonOperatorSchema.safeParse(
                                      e.target.value,
                                    );
                                  if (parsed.success) {
                                    updateClause(set.id, clause.id, {
                                      operator: parsed.data,
                                    });
                                  }
                                }}
                                className="w-28"
                              >
                                <option value="gte">枚以上</option>
                                <option value="lte">枚以下</option>
                                <option value="eq">枚ちょうど</option>
                              </Select>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={`パターン ${setIndex + 1} 条件 ${clauseIndex + 1} を削除`}
                                onClick={() => removeClause(set.id, clause.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => addClause(set.id)}
                        disabled={config.groups.length === 0}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        条件を追加
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card className="border-primary/40">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">計算結果</CardTitle>
                <Badge
                  variant={result.method === "exact" ? "default" : "secondary"}
                >
                  {result.method === "exact"
                    ? "厳密値"
                    : `近似値（${(result.trials ?? 0).toLocaleString()}回 ±${((result.marginOfError ?? 0) * 100).toFixed(2)}%）`}
                </Badge>
              </div>
              <CardDescription>
                デッキ{config.deckSize}枚・初手{config.handSize}枚
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!validation.valid ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive-foreground"
                >
                  <ul className="list-disc space-y-1 pl-4">
                    {validation.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-bold tracking-tight text-primary">
                      {formatPercent(result.probability)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      引けない確率 {formatPercent(1 - result.probability)}
                    </span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, result.probability * 100))}%`,
                      }}
                    />
                  </div>

                  {config.conditionSets.length > 1 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        パターン別の確率（重複を含む）
                      </p>
                      <div className="space-y-1.5">
                        {config.conditionSets.map((set, idx) => {
                          const p =
                            result.conditionSetProbabilities.find(
                              (item) => item.id === set.id,
                            )?.probability ?? 0;
                          return (
                            <div
                              key={set.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="truncate text-muted-foreground">
                                {set.name || `パターン ${idx + 1}`}
                              </span>
                              <span className="font-mono font-semibold">
                                {formatPercent(p)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4 text-primary" />
                保存した設定
              </CardTitle>
              <CardDescription>
                よく使う設定を保存しておくと、いつでも呼び出せます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="設定名（例: 青眼 40枚）"
                  aria-label="設定名"
                />
                <Button
                  type="button"
                  onClick={() => void handleSavePreset()}
                  disabled={!presetName.trim() || !validation.valid || isSaving}
                >
                  <BookmarkPlus className="h-4 w-4" />
                  {activePresetId ? "上書き保存" : "保存"}
                </Button>
              </div>
              {activePresetId && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>保存済みの設定を編集中</span>
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setActivePresetId(undefined)}
                  >
                    別名で新しく保存
                  </button>
                </div>
              )}
              {saveMessage && (
                <output
                  aria-live="polite"
                  className="block text-xs font-medium text-primary"
                >
                  {saveMessage}
                </output>
              )}

              <div className="space-y-2 border-t border-border pt-3">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">読み込み中…</p>
                ) : presets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    保存した設定はまだありません。
                  </p>
                ) : (
                  presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/50 px-3 py-2"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() =>
                          handleLoadConfig(preset, preset.name, preset.id)
                        }
                      >
                        <div className="text-sm font-medium hover:text-primary">
                          {preset.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {preset.deckSize}枚・初手{preset.handSize}枚・
                          {preset.groups.length}種類
                        </div>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`${preset.name}を削除`}
                        onClick={() =>
                          void handleDeletePreset(preset.id, preset.name)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
