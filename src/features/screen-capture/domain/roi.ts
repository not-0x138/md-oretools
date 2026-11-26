import type { RoiRect } from "./types";

const MIN_ROI_SIZE = 0.02;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * 相対座標（0.0〜1.0）を安全な範囲に丸める。
 * 幅・高さは最小 0.02 を保証しつつ、x + width <= 1 / y + height <= 1 に収める。
 */
export function clampRoiRect(rect: RoiRect): RoiRect {
  const x = clampUnit(rect.x);
  const y = clampUnit(rect.y);
  const rawWidth = Math.max(MIN_ROI_SIZE, clampUnit(rect.width));
  const rawHeight = Math.max(MIN_ROI_SIZE, clampUnit(rect.height));

  const clampedX = Math.min(x, 1 - MIN_ROI_SIZE);
  const clampedY = Math.min(y, 1 - MIN_ROI_SIZE);
  const width = Math.min(rawWidth, 1 - clampedX);
  const height = Math.min(rawHeight, 1 - clampedY);

  return {
    x: Number(clampedX.toFixed(4)),
    y: Number(clampedY.toFixed(4)),
    width: Number(Math.max(MIN_ROI_SIZE, width).toFixed(4)),
    height: Number(Math.max(MIN_ROI_SIZE, height).toFixed(4)),
  };
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 相対座標と映像フレームの解像度から、Canvas 切り出し用の整数ピクセル矩形を計算する。
 */
export function resolvePixelRect(
  rect: RoiRect,
  frameWidth: number,
  frameHeight: number,
): PixelRect {
  if (
    !Number.isFinite(frameWidth) ||
    !Number.isFinite(frameHeight) ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const safe = clampRoiRect(rect);
  const x = Math.round(safe.x * frameWidth);
  const y = Math.round(safe.y * frameHeight);
  const width = Math.max(
    1,
    Math.min(frameWidth - x, Math.round(safe.width * frameWidth)),
  );
  const height = Math.max(
    1,
    Math.min(frameHeight - y, Math.round(safe.height * frameHeight)),
  );

  return { x, y, width, height };
}
