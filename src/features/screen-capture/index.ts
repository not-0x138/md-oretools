export { RoiOverlayPreview } from "./components/RoiOverlayPreview";
export { ScreenCaptureView } from "./components/ScreenCaptureView";
export {
  createInitialLiveSession,
  detectCoinFlipFromText,
  detectDuelResultFromText,
  detectTurnOrderFromText,
  reduceLiveDuelSession,
} from "./domain/eventDetector";
export {
  accumulateInferenceScore,
  createInitialInferenceState,
  isExcludedCardName,
  matchCardNameToThemes,
  normalizeRecognitionText,
} from "./domain/inference";
export { clampRoiRect, type PixelRect, resolvePixelRect } from "./domain/roi";
export {
  type CaptureRoiConfig,
  type CaptureSettings,
  type CardMatchResult,
  type CoinFlipValue,
  captureRoiConfigSchema,
  captureSettingsSchema,
  createDefaultCaptureSettings,
  DEFAULT_16_9_ROIS,
  DEFAULT_CAPTURE_SETTINGS_ID,
  DEFAULT_EXCLUDED_GENERIC_CARDS,
  type DuelResultValue,
  type InferenceEngineState,
  type LiveDuelSession,
  type LiveSessionEvent,
  type LiveSessionTransition,
  type PendingDuelResult,
  type RoiRect,
  type RoiRegionKey,
  roiRectSchema,
  roiRegionKeySchema,
  type ThemeDictionaryItem,
  type ThemeScoreRecord,
  type TurnOrderValue,
} from "./domain/types";
export { useCaptureSettings } from "./hooks/useCaptureSettings";
export {
  type CaptureState,
  type ReaderStatus,
  type RecognitionLogEntry,
  type ScreenCaptureCallbacks,
  type UseScreenCaptureOptions,
  useScreenCapture,
} from "./hooks/useScreenCapture";
