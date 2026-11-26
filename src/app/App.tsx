import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheatSheetView,
  cheatSheetEntrySchema,
  DEFAULT_CHEAT_SHEET_TEMPLATES,
} from "@/features/cheat-sheet";
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

function UpcomingToolPlaceholder({ toolId }: { toolId: ToolId }) {
  const item = PORTAL_NAV_ITEMS.find((nav) => nav.id === toolId);
  if (!item) {
    return null;
  }
  const Icon = item.icon;
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{item.label}</CardTitle>
          </div>
          <Badge variant="secondary">準備中</Badge>
        </div>
        <CardDescription>この機能は現在準備中です。</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        いまは「初手確率計算」「誘発カンペ」「戦績記録」を利用できます。
      </CardContent>
    </Card>
  );
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
  const [opponentThemeSuggestions, setOpponentThemeSuggestions] = useState<
    string[]
  >(() => DEFAULT_CHEAT_SHEET_TEMPLATES.map((entry) => entry.themeName));

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

  const refreshOpponentThemeSuggestions = useCallback(async () => {
    try {
      const res = await cheatSheetOverrideRepo.list();
      const names = new Set<string>(
        DEFAULT_CHEAT_SHEET_TEMPLATES.map((entry) => entry.themeName),
      );
      for (const item of res.items) {
        names.add(item.themeName);
      }
      setOpponentThemeSuggestions(Array.from(names));
    } catch {
      // 読み込み失敗時はテンプレート候補をそのまま維持する
    }
  }, []);

  // features 間の直接参照を避けるため、誘発カンペのテーマ候補一覧は app 層で集約して戦績記録へ渡す
  useEffect(() => {
    if (activeTool !== "tracker") {
      return;
    }
    void refreshOpponentThemeSuggestions();
  }, [activeTool, refreshOpponentThemeSuggestions]);

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
        activeTool === "cheat-sheet" &&
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
      default:
        return <UpcomingToolPlaceholder toolId={activeTool} />;
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
          void refreshOpponentThemeSuggestions();
        }}
      />
    </>
  );
}
