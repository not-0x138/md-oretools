import { useCallback, useEffect, useState } from "react";
import {
  CheatSheetView,
  cheatSheetEntrySchema,
  DEFAULT_CHEAT_SHEET_TEMPLATES,
} from "@/features/cheat-sheet";
import {
  ScreenCaptureView,
  type ThemeDictionaryItem,
} from "@/features/screen-capture";
import {
  createInitialSimulatorConfig,
  HandSimulatorView,
  type SimulatorConfig,
} from "@/features/simulator";
import { TrackerView } from "@/features/tracker";
import { type DatabaseNoticeType, db } from "@/shared/db/database";
import { createValidatedRepository } from "@/shared/db/repository";
import {
  requestStoragePersistence,
  type StoragePersistenceStatus,
} from "@/shared/lib/storagePersistence";
import {
  loadUiPreferences,
  saveUiPreferences,
} from "@/shared/lib/uiPreferences";
import { BackupDialog } from "./BackupDialog";
import { DuelModeView } from "./DuelModeView";
import { PORTAL_NAV_ITEMS, PortalShell, type ToolId } from "./PortalShell";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VALID_TOOL_IDS = new Set<string>(PORTAL_NAV_ITEMS.map((item) => item.id));

const cheatSheetOverrideRepo = createValidatedRepository(
  db.cheatSheetOverrides,
  cheatSheetEntrySchema,
);

function resolveToolId(raw: string): ToolId {
  if (VALID_TOOL_IDS.has(raw)) {
    const matched = PORTAL_NAV_ITEMS.find((item) => item.id === raw);
    if (matched) {
      return matched.id;
    }
  }
  return "simulator";
}

function toDefaultDictionary(): ThemeDictionaryItem[] {
  return DEFAULT_CHEAT_SHEET_TEMPLATES.map((entry) => ({
    id: entry.id,
    themeName: entry.themeName,
    aliases: entry.aliases,
    signatureCards: entry.signatureCards,
  }));
}

export function App() {
  const [initialPrefs] = useState(() => loadUiPreferences());
  const [activeTool, setActiveTool] = useState<ToolId>(() =>
    resolveToolId(initialPrefs.activeTool),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    initialPrefs.sidebarCollapsed,
  );
  const [simulatorConfig, setSimulatorConfig] = useState<SimulatorConfig>(() =>
    createInitialSimulatorConfig(),
  );
  const [isCheatSheetEditing, setIsCheatSheetEditing] = useState(false);
  const [dbNotice, setDbNotice] = useState<DatabaseNoticeType | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [storageStatus, setStorageStatus] =
    useState<StoragePersistenceStatus>("unsupported");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [themeDictionary, setThemeDictionary] = useState<ThemeDictionaryItem[]>(
    () => toDefaultDictionary(),
  );

  const opponentThemeSuggestions = themeDictionary.map(
    (entry) => entry.themeName,
  );

  useEffect(() => {
    saveUiPreferences({
      sidebarCollapsed,
      activeTool,
    });
  }, [sidebarCollapsed, activeTool]);

  useEffect(() => db.subscribeNotice(setDbNotice), []);

  useEffect(() => {
    void requestStoragePersistence().then(setStorageStatus);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const refreshThemeDictionary = useCallback(async () => {
    try {
      const res = await cheatSheetOverrideRepo.list();
      const map = new Map<string, ThemeDictionaryItem>();
      for (const entry of DEFAULT_CHEAT_SHEET_TEMPLATES) {
        map.set(entry.id, {
          id: entry.id,
          themeName: entry.themeName,
          aliases: entry.aliases,
          signatureCards: entry.signatureCards,
        });
      }
      for (const item of res.items) {
        map.set(item.id, {
          id: item.id,
          themeName: item.themeName,
          aliases: item.aliases,
          signatureCards: item.signatureCards,
        });
      }
      setThemeDictionary(Array.from(map.values()));
    } catch {
      // 読み込み失敗時はテンプレート候補をそのまま維持する
    }
  }, []);

  // features 間の直接参照を避けるため、誘発カンペのテーマ辞書は app 層で集約して各機能へ渡す
  useEffect(() => {
    if (activeTool !== "tracker" && activeTool !== "screen-capture") {
      return;
    }
    void refreshThemeDictionary();
  }, [activeTool, refreshThemeDictionary]);

  const handleInstallApp = useCallback(async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const handleSelectTool = useCallback(
    (nextTool: ToolId) => {
      if (nextTool === activeTool) {
        return;
      }
      if (
        (activeTool === "cheat-sheet" || activeTool === "duel-mode") &&
        isCheatSheetEditing &&
        !window.confirm(
          "誘発カンペの編集内容が保存されていません。変更を破棄して移動しますか？",
        )
      ) {
        return;
      }
      setActiveTool(nextTool);
    },
    [activeTool, isCheatSheetEditing],
  );

  const renderContent = () => {
    switch (activeTool) {
      case "simulator":
        return (
          <HandSimulatorView
            key={`simulator-${dataVersion}`}
            config={simulatorConfig}
            onConfigChange={setSimulatorConfig}
          />
        );
      case "cheat-sheet":
        return (
          <CheatSheetView
            key={`cheat-sheet-${dataVersion}`}
            onEditingStateChange={setIsCheatSheetEditing}
          />
        );
      case "tracker":
        return (
          <TrackerView
            key={`tracker-${dataVersion}`}
            opponentThemeSuggestions={opponentThemeSuggestions}
          />
        );
      case "screen-capture":
        return (
          <ScreenCaptureView
            key={`screen-capture-${dataVersion}`}
            dictionary={themeDictionary}
          />
        );
      case "duel-mode":
        return (
          <DuelModeView
            key={`duel-mode-${dataVersion}`}
            onEditingStateChange={setIsCheatSheetEditing}
          />
        );
    }
  };

  return (
    <>
      <PortalShell
        activeTool={activeTool}
        sidebarCollapsed={sidebarCollapsed}
        dbNotice={dbNotice}
        canInstallApp={installPrompt !== null}
        onSelectTool={handleSelectTool}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        onOpenBackup={() => setBackupOpen(true)}
        onInstallApp={() => void handleInstallApp()}
      >
        {renderContent()}
      </PortalShell>

      <BackupDialog
        open={backupOpen}
        storageStatus={storageStatus}
        onClose={() => setBackupOpen(false)}
        onRestored={() => {
          setDataVersion((prev) => prev + 1);
          void refreshThemeDictionary();
        }}
      />
    </>
  );
}
