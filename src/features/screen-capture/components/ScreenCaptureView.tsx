import {
  Image as ImageIcon,
  MonitorPlay,
  MonitorStop,
  Pause,
  Play,
  RotateCcw,
  Save,
  ScanText,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { useTransientMessage } from "@/shared/lib/useTransientMessage";
import {
  type CaptureSettings,
  DEFAULT_16_9_ROIS,
  type RoiRect,
  type RoiRegionKey,
  type ThemeDictionaryItem,
} from "../domain/types";
import { useCaptureSettings } from "../hooks/useCaptureSettings";
import { useScreenCapture } from "../hooks/useScreenCapture";
import { ROI_REGION_META, RoiOverlayPreview } from "./RoiOverlayPreview";

interface ScreenCaptureViewProps {
  dictionary: readonly ThemeDictionaryItem[];
  onOpponentDetected?: (themeId: string, themeName: string) => void;
}

const REGION_LABEL_MAP: Record<RoiRegionKey, string> = {
  cardName: "カード名",
  coin: "コイン",
  turnOrder: "先攻/後攻",
  result: "勝敗",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function ScreenCaptureView({
  dictionary,
  onOpponentDetected,
}: ScreenCaptureViewProps) {
  const {
    settings,
    error: settingsError,
    saveSettings,
    resetSettings,
  } = useCaptureSettings();
  const [draft, setDraft] = useState<CaptureSettings>(settings);
  const [excludedText, setExcludedText] = useState(() =>
    settings.excludedCards.join("\n"),
  );
  const [activeRegion, setActiveRegion] = useState<RoiRegionKey>("cardName");
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const testImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { message: toast, show: showToast } = useTransientMessage();

  useEffect(() => {
    setDraft(settings);
    setExcludedText(settings.excludedCards.join("\n"));
  }, [settings]);

  useEffect(() => {
    return () => {
      if (testImageUrl) {
        URL.revokeObjectURL(testImageUrl);
      }
    };
  }, [testImageUrl]);

  const {
    videoRef,
    isSupported,
    captureState,
    readerStatus,
    readerProgress,
    error: captureError,
    logs,
    inferenceState,
    startCapture,
    stopCapture,
    togglePause,
    analyzeTestImage,
    resetInference,
    clearLogs,
  } = useScreenCapture({
    settings: draft,
    dictionary,
    callbacks: {
      onOpponentInferred: (themeId, themeName) => {
        onOpponentDetected?.(themeId, themeName);
      },
    },
  });

  const handleRoiChange = (region: RoiRegionKey, next: RoiRect) => {
    setDraft((prev) => ({
      ...prev,
      rois: {
        ...prev.rois,
        [region]: next,
      },
    }));
  };

  const handleResetRois = () => {
    if (!window.confirm("読み取り範囲を 16:9 標準プリセットに戻しますか？")) {
      return;
    }
    setDraft((prev) => ({
      ...prev,
      rois: {
        coin: { ...DEFAULT_16_9_ROIS.coin },
        turnOrder: { ...DEFAULT_16_9_ROIS.turnOrder },
        cardName: { ...DEFAULT_16_9_ROIS.cardName },
        result: { ...DEFAULT_16_9_ROIS.result },
      },
    }));
    showToast("読み取り範囲を 16:9 標準に戻しました（保存で確定します）。");
  };

  const handleSaveSettings = async () => {
    const excludedCards = Array.from(
      new Set(
        excludedText
          .split(/\r?\n|、|,/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      ),
    );
    const ok = await saveSettings({
      ...draft,
      excludedCards,
    });
    if (ok) {
      showToast("画面読み取り設定をこのブラウザに保存しました。");
    }
  };

  const handleResetAllSettings = async () => {
    if (
      !window.confirm(
        "読み取り範囲・判定の厳しさ・除外カード設定をすべて初期値に戻しますか？",
      )
    ) {
      return;
    }
    const ok = await resetSettings();
    if (ok) {
      showToast("画面読み取り設定を初期値に戻しました。");
    }
  };

  const handleTestImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (testImageUrl) {
      URL.revokeObjectURL(testImageUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setTestImageUrl(nextUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRunTestImageAnalysis = async () => {
    if (!testImageRef.current) {
      return;
    }
    await analyzeTestImage(testImageRef.current);
    showToast("テスト画像の文字読み取りを実行しました。");
  };

  const topThemeScores = Object.values(inferenceState.scoresByTheme).sort(
    (a, b) => b.score - a.score,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            画面読み取り設定・テスト
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ブラウザの画面共有でマスターデュエルの映像を読み取り、コイン・先攻後攻・相手デッキ・勝敗を自動で検知します。
          </p>
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
                : "停止中"}
          </Badge>
          {readerStatus === "loading" && (
            <Badge variant="secondary" className="tabular-nums">
              文字読み取り準備中 {readerProgress}%
            </Badge>
          )}
          {readerStatus === "ready" && (
            <Badge variant="secondary">文字読み取り準備完了</Badge>
          )}
        </div>
      </div>

      {(settingsError || captureError) && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
        >
          {captureError ?? settingsError}
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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                画面共有と読み取り範囲の位置調整
              </CardTitle>
              <CardDescription>
                マスターデュエルはボーダーレスウィンドウ表示を推奨します（日本語
                UI・16:9 基準）。
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {captureState === "idle" ? (
                <Button
                  type="button"
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
                    variant="secondary"
                    onClick={togglePause}
                  >
                    {captureState === "capturing" ? (
                      <>
                        <Pause className="h-4 w-4" />
                        一時停止
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        再開
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={stopCapture}
                  >
                    <MonitorStop className="h-4 w-4" />
                    共有を終了
                  </Button>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleTestImageSelected}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
                スクショで調整
              </Button>
              {testImageUrl && captureState === "idle" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRunTestImageAnalysis()}
                >
                  <ScanText className="h-4 w-4" />
                  この画像で読み取りテスト
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RoiOverlayPreview
            videoRef={videoRef}
            isCapturing={captureState !== "idle"}
            testImageUrl={testImageUrl}
            testImageRef={testImageRef}
            rois={draft.rois}
            activeRegion={activeRegion}
            onSelectRegion={setActiveRegion}
            onChangeRoi={handleRoiChange}
            onResetRois={handleResetRois}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                読み取り・判定のカスタマイズ
              </CardTitle>
            </div>
            <CardDescription>
              誤認識が多い場合は判定の厳しさを上げ、反応が遅い場合は読み取り間隔を短くしてください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="capture-interval-ms"
                  className="block text-xs font-medium"
                >
                  読み取り間隔（ミリ秒）
                </label>
                <NumberInput
                  id="capture-interval-ms"
                  min={300}
                  max={5000}
                  value={draft.intervalMs}
                  onValueChange={(v) =>
                    setDraft((prev) => ({ ...prev, intervalMs: Math.round(v) }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  推奨: 1000（1秒ごと）
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="capture-min-confidence"
                  className="block text-xs font-medium"
                >
                  文字読み取りの最低精度 (%)
                </label>
                <NumberInput
                  id="capture-min-confidence"
                  min={0}
                  max={100}
                  value={Math.round(draft.minOcrConfidence)}
                  onValueChange={(v) =>
                    setDraft((prev) => ({ ...prev, minOcrConfidence: v }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">推奨: 45%</p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="capture-score-threshold"
                  className="block text-xs font-medium"
                >
                  相手デッキ確定の厳しさ（標準 100）
                </label>
                <NumberInput
                  id="capture-score-threshold"
                  min={30}
                  max={500}
                  value={Math.round(draft.scoreThreshold * 100)}
                  onValueChange={(v) =>
                    setDraft((prev) => ({
                      ...prev,
                      scoreThreshold: Number((v / 100).toFixed(2)),
                    }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  推奨: 100（固有カード1〜2枚で確定）
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={draft.autoSwitchCheatSheet}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    autoSwitchCheatSheet: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-primary"
              />
              <span>相手デッキが判定されたら誘発カンペを自動で切り替える</span>
            </label>

            <div className="space-y-1.5">
              <label
                htmlFor="capture-excluded-cards"
                className="block text-xs font-medium"
              >
                相手デッキ判定から除外するカード（1行につき1枚）
              </label>
              <Textarea
                id="capture-excluded-cards"
                rows={5}
                value={excludedText}
                onChange={(e) => setExcludedText(e.target.value)}
                placeholder="灰流うらら&#10;増殖するG&#10;無限泡影"
              />
              <p className="text-[11px] text-muted-foreground">
                汎用カードや自分のデッキに入っているカードを入れておくと、誤判定を防げます。
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleResetAllSettings()}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                初期値に戻す
              </Button>
              <Button type="button" onClick={() => void handleSaveSettings()}>
                <Save className="h-4 w-4" />
                設定を保存
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  相手デッキの判定状況・読み取りログ
                </CardTitle>
                <CardDescription>
                  読み取ったカード名から最も可能性が高い相手テーマを表示します。
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetInference}
                >
                  判定リセット
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearLogs}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ログ消去
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  現在の相手デッキ判定
                </span>
                <Badge
                  variant={
                    inferenceState.detectedThemeName ? "default" : "muted"
                  }
                >
                  {inferenceState.detectedThemeName ?? "未判定"}
                </Badge>
              </div>

              {topThemeScores.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs">
                  {topThemeScores.slice(0, 4).map((item) => (
                    <li
                      key={item.themeId}
                      className="flex items-center justify-between gap-2 rounded bg-card/80 px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">
                          {item.themeName}
                        </span>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          ({item.matchedCards.join(" / ")})
                        </span>
                      </div>
                      <span className="shrink-0 tabular-nums text-primary">
                        {item.score.toFixed(2)} /{" "}
                        {draft.scoreThreshold.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                直近の読み取りログ（最大25件）
              </p>
              {logs.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  まだ検知ログはありません。画面共有を開始するか、テスト画像で読み取りを実行してください。
                </p>
              ) : (
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
                  {logs.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md border border-border bg-background/40 px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {REGION_LABEL_MAP[entry.region]}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {entry.summary}
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                          {formatTime(entry.at)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        読み取り文字: 「{entry.rawText}」（精度{" "}
                        {entry.confidence}
                        %）
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <p className="font-medium text-foreground">
                読み取り範囲のガイド
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {ROI_REGION_META.map((m) => (
                  <li key={m.key}>
                    <span className="font-medium text-foreground">
                      {m.label}
                    </span>
                    : {m.description}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
