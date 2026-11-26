import { RotateCcw } from "lucide-react";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { clampRoiRect } from "../domain/roi";
import type { CaptureRoiConfig, RoiRect, RoiRegionKey } from "../domain/types";

interface RegionMeta {
  key: RoiRegionKey;
  label: string;
  description: string;
  borderClass: string;
  badgeClass: string;
}

export const ROI_REGION_META: readonly RegionMeta[] = [
  {
    key: "cardName",
    label: "カード名エリア",
    description: "画面左上のカード詳細タイトルなど、カード名が表示される範囲",
    borderClass: "border-sky-400 bg-sky-400/15",
    badgeClass: "bg-sky-500 text-slate-950",
  },
  {
    key: "coin",
    label: "コイントス",
    description: "コイントスの「表 / 裏」が表示される範囲",
    borderClass: "border-amber-400 bg-amber-400/15",
    badgeClass: "bg-amber-500 text-slate-950",
  },
  {
    key: "turnOrder",
    label: "先攻・後攻",
    description: "「先攻 / 後攻」が表示される範囲",
    borderClass: "border-emerald-400 bg-emerald-400/15",
    badgeClass: "bg-emerald-500 text-slate-950",
  },
  {
    key: "result",
    label: "勝敗表示",
    description: "試合終了時の「VICTORY / DEFEAT」が表示される範囲",
    borderClass: "border-rose-400 bg-rose-400/15",
    badgeClass: "bg-rose-500 text-white",
  },
];

interface RoiOverlayPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isCapturing: boolean;
  testImageUrl: string | null;
  testImageRef: RefObject<HTMLImageElement | null>;
  rois: CaptureRoiConfig;
  activeRegion: RoiRegionKey;
  onSelectRegion: (region: RoiRegionKey) => void;
  onChangeRoi: (region: RoiRegionKey, next: RoiRect) => void;
  onResetRois: () => void;
}

function toPercent(value: number): number {
  return Math.round(value * 100);
}

function fromPercent(percent: number): number {
  return percent / 100;
}

export function RoiOverlayPreview({
  videoRef,
  isCapturing,
  testImageUrl,
  testImageRef,
  rois,
  activeRegion,
  onSelectRegion,
  onChangeRoi,
  onResetRois,
}: RoiOverlayPreviewProps) {
  const selectedMeta =
    ROI_REGION_META.find((m) => m.key === activeRegion) ?? ROI_REGION_META[0];
  const currentRect = rois[activeRegion];

  const updateField = (field: keyof RoiRect, percentValue: number) => {
    const next = clampRoiRect({
      ...currentRect,
      [field]: fromPercent(percentValue),
    });
    onChangeRoi(activeRegion, next);
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={
            isCapturing
              ? "h-full w-full object-contain"
              : "pointer-events-none absolute inset-0 h-full w-full opacity-0"
          }
        />

        {!isCapturing && testImageUrl && (
          <img
            ref={testImageRef}
            src={testImageUrl}
            alt="テスト用スクリーンショット"
            className="h-full w-full object-contain"
          />
        )}

        {!isCapturing && !testImageUrl && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              プレビュー待機中（16:9 基準）
            </p>
            <p>
              「マスターデュエルの画面を選択」を押すか、スクリーンショット画像を読み込むと
              読み取り範囲の枠を実際の画面に重ねて微調整できます。
            </p>
          </div>
        )}

        {/* 4つの読み取り範囲オーバーレイ */}
        <div className="pointer-events-none absolute inset-0">
          {ROI_REGION_META.map((meta) => {
            const rect = rois[meta.key];
            const isSelected = meta.key === activeRegion;
            return (
              <div
                key={meta.key}
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                }}
                className={`absolute rounded border-2 transition-opacity ${meta.borderClass} ${
                  isSelected ? "opacity-100 ring-2 ring-white/80" : "opacity-65"
                }`}
              >
                <span
                  className={`inline-block rounded-br px-1.5 py-0.5 text-[10px] font-bold leading-none ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {ROI_REGION_META.map((meta) => (
              <button
                key={meta.key}
                type="button"
                onClick={() => onSelectRegion(meta.key)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeRegion === meta.key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onResetRois}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            16:9 標準に戻す
          </Button>
        </div>

        {selectedMeta && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{selectedMeta.description}</span>
            <Badge variant="secondary" className="tabular-nums">
              左 {toPercent(currentRect.x)}% / 上 {toPercent(currentRect.y)}% /
              幅 {toPercent(currentRect.width)}% / 高さ{" "}
              {toPercent(currentRect.height)}%
            </Badge>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { field: "x", label: "左からの位置 (%)" },
              { field: "y", label: "上からの位置 (%)" },
              { field: "width", label: "横幅 (%)" },
              { field: "height", label: "高さ (%)" },
            ] as const
          ).map(({ field, label }) => {
            const pct = toPercent(currentRect[field]);
            const inputId = `roi-${activeRegion}-${field}`;
            return (
              <div key={field} className="space-y-1.5">
                <label
                  htmlFor={inputId}
                  className="block text-xs font-medium text-foreground"
                >
                  {label}
                </label>
                <input
                  type="range"
                  aria-label={`${label} スライダー`}
                  min={field === "width" || field === "height" ? 2 : 0}
                  max={100}
                  step={1}
                  value={pct}
                  onChange={(e) => updateField(field, Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <NumberInput
                  id={inputId}
                  min={field === "width" || field === "height" ? 2 : 0}
                  max={100}
                  value={pct}
                  onValueChange={(v) => updateField(field, v)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
