import {
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Columns2,
  DatabaseBackup,
  Download,
  MonitorSmartphone,
  RefreshCw,
  Trophy,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { DatabaseNoticeType } from "@/shared/db/database";
import { cn } from "@/shared/lib/cn";

export type ToolId =
  | "simulator"
  | "cheat-sheet"
  | "tracker"
  | "screen-capture"
  | "duel-mode";

export interface NavItem {
  id: ToolId;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
}

export const PORTAL_NAV_ITEMS: readonly NavItem[] = [
  {
    id: "simulator",
    label: "初手確率計算",
    shortLabel: "確率計算",
    icon: Calculator,
  },
  {
    id: "cheat-sheet",
    label: "誘発カンペ",
    shortLabel: "誘発カンペ",
    icon: BookOpen,
  },
  {
    id: "tracker",
    label: "戦績記録",
    shortLabel: "戦績",
    icon: Trophy,
  },
  {
    id: "screen-capture",
    label: "画面読み取り",
    shortLabel: "画面読取",
    icon: MonitorSmartphone,
  },
  {
    id: "duel-mode",
    label: "デュエル画面",
    shortLabel: "デュエル",
    icon: Columns2,
  },
];

interface PortalShellProps {
  activeTool: ToolId;
  sidebarCollapsed: boolean;
  dbNotice: DatabaseNoticeType | null;
  canInstallApp: boolean;
  onSelectTool: (toolId: ToolId) => void;
  onToggleSidebar: () => void;
  onOpenBackup: () => void;
  onInstallApp: () => void;
  children: ReactNode;
}

/**
 * 単一ツール表示とデュエルモード（2ペイン同時表示）の双方を受け入れる共通シェル。
 */
export function PortalShell({
  activeTool,
  sidebarCollapsed,
  dbNotice,
  canInstallApp,
  onSelectTool,
  onToggleSidebar,
  onOpenBackup,
  onInstallApp,
  children,
}: PortalShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card/60 transition-[width] duration-200 md:flex",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              MD
            </span>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold tracking-tight">
                  md-oretools
                </h1>
                <p className="truncate text-[11px] text-muted-foreground">
                  マスターデュエル用ツール
                </p>
              </div>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label={
              sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"
            }
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav aria-label="ツールナビゲーション" className="flex-1 space-y-1 p-2">
          {PORTAL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTool(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="flex-1 truncate text-left">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-2.5">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="バックアップ・復元"
                title="バックアップ・復元"
                onClick={onOpenBackup}
              >
                <DatabaseBackup className="h-4 w-4" />
              </Button>
              {canInstallApp && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="アプリとしてインストール"
                  title="アプリとしてインストール"
                  onClick={onInstallApp}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">ブラウザ内保存</p>
                <p className="mt-0.5">
                  入力したデータはこのブラウザだけに保存されます。
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={onOpenBackup}
              >
                <DatabaseBackup className="h-3.5 w-3.5" />
                バックアップ・復元
              </Button>
              {canInstallApp && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start text-xs"
                  onClick={onInstallApp}
                >
                  <Download className="h-3.5 w-3.5" />
                  アプリとしてインストール
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card/60 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                MD
              </span>
              <span className="text-sm font-bold">md-oretools</span>
            </div>
            <div className="flex items-center gap-1.5">
              {canInstallApp && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onInstallApp}
                >
                  <Download className="h-3.5 w-3.5" />
                  インストール
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenBackup}
              >
                <DatabaseBackup className="h-3.5 w-3.5" />
                バックアップ
              </Button>
            </div>
          </div>
          <nav
            aria-label="モバイルナビゲーション"
            className="flex gap-1 overflow-x-auto px-3 pb-2"
          >
            {PORTAL_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTool(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.shortLabel}
                </button>
              );
            })}
          </nav>
        </header>

        {dbNotice && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-foreground"
          >
            <span>
              {dbNotice === "versionchange"
                ? "別のタブでアプリが更新されました。データを保護するため、ページを再読み込みしてください。"
                : "別のタブが開いているため更新できません。他のタブを閉じるか、再読み込みしてください。"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              再読み込み
            </Button>
          </div>
        )}

        <main
          className={cn(
            "mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8",
            activeTool === "duel-mode" ? "max-w-[1600px]" : "max-w-6xl",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
