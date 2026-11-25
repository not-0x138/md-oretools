import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheatSheetView } from "@/features/cheat-sheet";
import {
  createInitialSimulatorConfig,
  HandSimulatorView,
  type SimulatorConfig,
} from "@/features/simulator";
import { type DatabaseNoticeType, db } from "@/shared/db/database";
import {
  loadUiPreferences,
  saveUiPreferences,
} from "@/shared/lib/uiPreferences";
import { PORTAL_NAV_ITEMS, PortalShell, type ToolId } from "./PortalShell";

const VALID_TOOL_IDS = new Set<string>(PORTAL_NAV_ITEMS.map((item) => item.id));

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
        いまは「初手確率計算」と「誘発カンペ」を利用できます。
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

  useEffect(() => {
    saveUiPreferences({
      sidebarCollapsed,
      activeTool,
    });
  }, [sidebarCollapsed, activeTool]);

  useEffect(() => db.subscribeNotice(setDbNotice), []);

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
            config={simulatorConfig}
            onConfigChange={setSimulatorConfig}
          />
        );
      case "cheat-sheet":
        return <CheatSheetView onEditingStateChange={setIsCheatSheetEditing} />;
      default:
        return <UpcomingToolPlaceholder toolId={activeTool} />;
    }
  };

  return (
    <PortalShell
      activeTool={activeTool}
      sidebarCollapsed={sidebarCollapsed}
      dbNotice={dbNotice}
      onSelectTool={handleSelectTool}
      onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
    >
      {renderContent()}
    </PortalShell>
  );
}
