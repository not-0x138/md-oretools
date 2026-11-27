import { describe, expect, it } from "vitest";
import { clampRoiRect, resolvePixelRect } from "./roi";

describe("roi（読み取り範囲の座標計算）", () => {
  it("0〜1の範囲外の座標を安全な相対座標にクランプする", () => {
    const result = clampRoiRect({
      x: -0.2,
      y: 0.95,
      width: 1.5,
      height: 0.3,
    });

    expect(result.x).toBe(0);
    expect(result.width).toBe(1);
    expect(result.y + result.height).toBeLessThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(0.02);
  });

  it("幅・高さが極小でも最小サイズ（0.02）を下回らない", () => {
    const result = clampRoiRect({
      x: 0.5,
      y: 0.5,
      width: 0.001,
      height: -0.1,
    });

    expect(result.width).toBe(0.02);
    expect(result.height).toBe(0.02);
    expect(result.x).toBe(0.5);
    expect(result.y).toBe(0.5);
  });

  it("1920x1080フレームに対して相対座標を整数ピクセル矩形へ変換する", () => {
    const pixel = resolvePixelRect(
      { x: 0.25, y: 0.5, width: 0.5, height: 0.25 },
      1920,
      1080,
    );

    expect(pixel).toEqual({
      x: 480,
      y: 540,
      width: 960,
      height: 270,
    });
  });

  it("フレームサイズが0以下の場合は幅・高さ0の矩形を返す", () => {
    const pixel = resolvePixelRect(
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      0,
      1080,
    );

    expect(pixel).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
