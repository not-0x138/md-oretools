import { useCallback, useEffect, useRef, useState } from "react";
import type { Worker as TesseractWorker } from "tesseract.js";
import {
  detectCoinFlipFromText,
  detectDuelResultFromText,
  detectTurnOrderFromText,
} from "../domain/eventDetector";
import {
  accumulateInferenceScore,
  createInitialInferenceState,
  matchCardNameToThemes,
} from "../domain/inference";
import { resolvePixelRect } from "../domain/roi";
import type {
  CaptureSettings,
  CoinFlipValue,
  DuelResultValue,
  InferenceEngineState,
  RoiRect,
  RoiRegionKey,
  ThemeDictionaryItem,
  TurnOrderValue,
} from "../domain/types";

export interface RecognitionLogEntry {
  id: string;
  at: string;
  region: RoiRegionKey;
  rawText: string;
  confidence: number;
  summary: string;
}

export interface ScreenCaptureCallbacks {
  onCoinDetected?: (coinFlip: CoinFlipValue, at: string) => void;
  onTurnOrderDetected?: (turnOrder: TurnOrderValue, at: string) => void;
  onOpponentInferred?: (themeId: string, themeName: string, at: string) => void;
  onResultDetected?: (result: DuelResultValue, at: string) => void;
}

export interface UseScreenCaptureOptions {
  settings: CaptureSettings;
  dictionary: readonly ThemeDictionaryItem[];
  extraExcludedCards?: readonly string[];
  callbacks?: ScreenCaptureCallbacks;
}

export type CaptureState = "idle" | "capturing" | "paused";
export type ReaderStatus = "idle" | "loading" | "ready" | "error";

const MAX_LOG_ENTRIES = 25;
const ROI_UPSCALE_FACTOR = 2;
const OCR_PADDING_PX = 24;
const BRIGHT_TEXT_LO = 165;
const BRIGHT_TEXT_HI = 235;

function isSameRoi(a: RoiRect, b: RoiRect): boolean {
  return (
    Math.abs(a.x - b.x) < 0.0005 &&
    Math.abs(a.y - b.y) < 0.0005 &&
    Math.abs(a.width - b.width) < 0.0005 &&
    Math.abs(a.height - b.height) < 0.0005
  );
}

function cropAndPreprocessRegion(
  source: HTMLVideoElement | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
  roi: RoiRect,
  canvas: HTMLCanvasElement,
): boolean {
  const rect = resolvePixelRect(roi, sourceWidth, sourceHeight);
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const contentWidth = Math.max(1, Math.round(rect.width * ROI_UPSCALE_FACTOR));
  const contentHeight = Math.max(
    1,
    Math.round(rect.height * ROI_UPSCALE_FACTOR),
  );
  const targetWidth = contentWidth + OCR_PADDING_PX * 2;
  const targetHeight = contentHeight + OCR_PADDING_PX * 2;
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return false;
  }

  // Tesseract LSTM は「白背景に黒文字＋十分な余白」で学習されているため、
  // 周囲を白でパディングし、ゲームUIの白〜黄文字を黒・色付き背景やエフェクトを白へ反転抽出する。
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    OCR_PADDING_PX,
    OCR_PADDING_PX,
    contentWidth,
    contentHeight,
  );

  const imageData = ctx.getImageData(
    OCR_PADDING_PX,
    OCR_PADDING_PX,
    contentWidth,
    contentHeight,
  );
  const data = imageData.data;
  const range = BRIGHT_TEXT_HI - BRIGHT_TEXT_LO;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    let inverted: number;
    if (gray <= BRIGHT_TEXT_LO) {
      inverted = 255;
    } else if (gray >= BRIGHT_TEXT_HI) {
      inverted = 0;
    } else {
      inverted = Math.round(((BRIGHT_TEXT_HI - gray) / range) * 255);
    }
    data[i] = inverted;
    data[i + 1] = inverted;
    data[i + 2] = inverted;
  }
  ctx.putImageData(imageData, OCR_PADDING_PX, OCR_PADDING_PX);
  return true;
}

export function useScreenCapture({
  settings,
  dictionary,
  extraExcludedCards = [],
  callbacks,
}: UseScreenCaptureOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<TesseractWorker | null>(null);
  const workerPromiseRef = useRef<Promise<TesseractWorker> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(false);
  const lastInferredThemeIdRef = useRef<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const dictionaryRef = useRef(dictionary);
  dictionaryRef.current = dictionary;
  const extraExcludedRef = useRef(extraExcludedCards);
  extraExcludedRef.current = extraExcludedCards;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>("idle");
  const [readerProgress, setReaderProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<RecognitionLogEntry[]>([]);
  const [inferenceState, setInferenceState] = useState<InferenceEngineState>(
    () => createInitialInferenceState(),
  );
  const inferenceStateRef = useRef(inferenceState);
  inferenceStateRef.current = inferenceState;

  const isSupported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  const appendLog = useCallback((entry: Omit<RecognitionLogEntry, "id">) => {
    setLogs((prev) => [
      { ...entry, id: crypto.randomUUID() },
      ...prev.slice(0, MAX_LOG_ENTRIES - 1),
    ]);
  }, []);

  const ensureWorker = useCallback(async (): Promise<TesseractWorker> => {
    if (workerRef.current) {
      return workerRef.current;
    }
    if (workerPromiseRef.current) {
      return workerPromiseRef.current;
    }

    setReaderStatus("loading");
    setReaderProgress(0);

    const initPromise = (async () => {
      const { createWorker, OEM, PSM } = await import("tesseract.js");
      const worker = await createWorker("jpn", OEM.LSTM_ONLY, {
        logger: (msg) => {
          if (typeof msg.progress === "number") {
            setReaderProgress(Math.round(msg.progress * 100));
          }
        },
      });
      // 全4領域を単一行テキストに特化して切り出すため、単一行モードを指定して精度と速度を高める
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      workerRef.current = worker;
      setReaderStatus("ready");
      setReaderProgress(100);
      return worker;
    })();

    workerPromiseRef.current = initPromise;

    try {
      return await initPromise;
    } catch (err) {
      workerPromiseRef.current = null;
      setReaderStatus("error");
      throw err;
    }
  }, []);

  const resetInference = useCallback(() => {
    const initial = createInitialInferenceState();
    inferenceStateRef.current = initial;
    lastInferredThemeIdRef.current = null;
    setInferenceState(initial);
  }, []);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCaptureState("idle");
  }, []);

  const startCapture = useCallback(async () => {
    if (!isSupported) {
      setError(
        "このブラウザでは画面共有を利用できません。Chrome または Edge をお試しください。",
      );
      return false;
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          stopCapture();
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          // 自動再生ポリシーで失敗しても映像フレーム取得は継続できる
        });
      }
      setCaptureState("capturing");
      void ensureWorker().catch(() => {
        setError(
          "文字の読み取りデータの準備に失敗しました。ネットワーク接続を確認して再度お試しください。",
        );
      });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("画面の選択がキャンセルされました。");
      } else {
        setError(
          "画面共有を開始できませんでした。マスターデュエルをウィンドウ表示またはボーダーレス表示にしてお試しください。",
        );
      }
      return false;
    }
  }, [ensureWorker, isSupported, stopCapture]);

  const togglePause = useCallback(() => {
    setCaptureState((prev) => {
      if (prev === "capturing") {
        return "paused";
      }
      if (prev === "paused") {
        return "capturing";
      }
      return prev;
    });
  }, []);

  const analyzeSource = useCallback(
    async (
      source: HTMLVideoElement | HTMLImageElement,
      sourceWidth: number,
      sourceHeight: number,
    ) => {
      if (busyRef.current || sourceWidth <= 0 || sourceHeight <= 0) {
        return;
      }
      busyRef.current = true;
      try {
        const worker = await ensureWorker();
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        const currentSettings = settingsRef.current;
        const nowIso = new Date().toISOString();
        const nowMs = Date.now();
        const combinedExcluded = [
          ...currentSettings.excludedCards,
          ...extraExcludedRef.current,
        ];

        const regions: readonly RoiRegionKey[] = [
          "cardName",
          "coin",
          "turnOrder",
          "result",
        ];

        // coin と turnOrder は同じメッセージ帯を共有するため、座標一致時は1回の読み取り結果を再利用する
        let cachedCoinOcr: { rawText: string; confidence: number } | null =
          null;
        const shareCoinAndTurnOrder = isSameRoi(
          currentSettings.rois.coin,
          currentSettings.rois.turnOrder,
        );

        for (const region of regions) {
          let rawText = "";
          let confidence = 0;

          if (
            region === "turnOrder" &&
            shareCoinAndTurnOrder &&
            cachedCoinOcr
          ) {
            rawText = cachedCoinOcr.rawText;
            confidence = cachedCoinOcr.confidence;
          } else {
            const roi = currentSettings.rois[region];
            const cropped = cropAndPreprocessRegion(
              source,
              sourceWidth,
              sourceHeight,
              roi,
              canvas,
            );
            if (!cropped) {
              continue;
            }

            const { data } = await worker.recognize(canvas);
            rawText = data.text.trim();
            confidence = Math.round(data.confidence);
            if (region === "coin" && shareCoinAndTurnOrder) {
              cachedCoinOcr = { rawText, confidence };
            }
          }

          if (!rawText) {
            continue;
          }

          if (region === "coin") {
            const coin = detectCoinFlipFromText(rawText);
            if (coin) {
              callbacksRef.current?.onCoinDetected?.(coin, nowIso);
              appendLog({
                at: nowIso,
                region,
                rawText,
                confidence,
                summary: `コイントス検知: ${coin === "heads" ? "表" : "裏"}`,
              });
            }
            // 実機では降参直後の「降参しました」「対戦相手が降参しました」も同じメッセージ帯に出るため、
            // 追加OCRなしでここから勝敗も検知する。
            const messageResult = detectDuelResultFromText(rawText);
            if (messageResult) {
              callbacksRef.current?.onResultDetected?.(messageResult, nowIso);
              appendLog({
                at: nowIso,
                region: "result",
                rawText,
                confidence,
                summary: `勝敗検知: ${messageResult === "win" ? "勝ち" : "負け"}`,
              });
            }
          } else if (region === "turnOrder") {
            const turnOrder = detectTurnOrderFromText(rawText);
            if (turnOrder) {
              callbacksRef.current?.onTurnOrderDetected?.(turnOrder, nowIso);
              appendLog({
                at: nowIso,
                region,
                rawText,
                confidence,
                summary: `先攻・後攻検知: ${turnOrder === "first" ? "先攻" : "後攻"}`,
              });
            }
          } else if (region === "result") {
            const result = detectDuelResultFromText(rawText);
            if (result) {
              callbacksRef.current?.onResultDetected?.(result, nowIso);
              appendLog({
                at: nowIso,
                region,
                rawText,
                confidence,
                summary: `勝敗検知: ${result === "win" ? "勝ち" : "負け"}`,
              });
            }
          } else if (region === "cardName") {
            const matched = matchCardNameToThemes({
              rawText,
              ocrConfidence: confidence,
              dictionary: dictionaryRef.current,
              excludedCards: combinedExcluded,
              minOcrConfidence: currentSettings.minOcrConfidence,
            });
            if (matched) {
              const nextState = accumulateInferenceScore(
                inferenceStateRef.current,
                matched,
                {
                  nowMs,
                  scoreThreshold: currentSettings.scoreThreshold,
                },
              );
              inferenceStateRef.current = nextState;
              setInferenceState(nextState);

              if (
                nextState.detectedThemeId &&
                nextState.detectedThemeName &&
                nextState.detectedThemeId !== lastInferredThemeIdRef.current
              ) {
                lastInferredThemeIdRef.current = nextState.detectedThemeId;
                callbacksRef.current?.onOpponentInferred?.(
                  nextState.detectedThemeId,
                  nextState.detectedThemeName,
                  nowIso,
                );
              }

              appendLog({
                at: nowIso,
                region,
                rawText,
                confidence,
                summary: `カード一致: ${matched.matchedText} → ${matched.themeName}`,
              });
            }
          }
        }
      } catch {
        setError("画面の文字読み取り中にエラーが発生しました。");
      } finally {
        busyRef.current = false;
      }
    },
    [appendLog, ensureWorker],
  );

  const analyzeTestImage = useCallback(
    async (img: HTMLImageElement) => {
      setError(null);
      await analyzeSource(img, img.naturalWidth, img.naturalHeight);
    },
    [analyzeSource],
  );

  useEffect(() => {
    if (captureState !== "capturing") {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;

    const tick = async () => {
      if (cancelled) {
        return;
      }
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        await analyzeSource(video, video.videoWidth, video.videoHeight);
      }
      if (!cancelled) {
        timerId = window.setTimeout(
          () => void tick(),
          settingsRef.current.intervalMs,
        );
      }
    };

    timerId = window.setTimeout(() => void tick(), 400);

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [analyzeSource, captureState]);

  useEffect(() => {
    return () => {
      stopCapture();
      if (workerRef.current) {
        void workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [stopCapture]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    videoRef,
    isSupported,
    captureState,
    readerStatus,
    readerProgress,
    error,
    logs,
    inferenceState,
    startCapture,
    stopCapture,
    togglePause,
    analyzeTestImage,
    resetInference,
    clearLogs,
  };
}
