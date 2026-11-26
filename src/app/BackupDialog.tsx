import { Download, ShieldCheck, Upload, X } from "lucide-react";
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
import type { StoragePersistenceStatus } from "@/shared/lib/storagePersistence";
import {
  type AppBackup,
  type BackupCounts,
  type BackupImportMode,
  countBackupItems,
  createBackupFilename,
  exportAllAppData,
  importAppData,
  parseAppBackupJson,
} from "./backup";

interface BackupDialogProps {
  open: boolean;
  storageStatus: StoragePersistenceStatus;
  onClose: () => void;
  onRestored: () => void;
}

export function BackupDialog({
  open,
  storageStatus,
  onClose,
  onRestored,
}: BackupDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentCounts, setCurrentCounts] = useState<BackupCounts | null>(null);
  const [pendingBackup, setPendingBackup] = useState<AppBackup | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");
  const [importMode, setImportMode] = useState<BackupImportMode>("merge");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setMessage(null);
    setError(null);
    setPendingBackup(null);
    setPendingFileName("");

    void exportAllAppData()
      .then((backup) => {
        if (!cancelled) {
          setCurrentCounts(countBackupItems(backup.data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("現在のデータ件数を取得できませんでした。");
        }
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleExport = async () => {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const backup = await exportAllAppData();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = createBackupFilename();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setCurrentCounts(countBackupItems(backup.data));
      setMessage("バックアップファイル（JSON）を保存しました。");
    } catch {
      setError("バックアップの作成に失敗しました。もう一度お試しください。");
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = parseAppBackupJson(text);
      if (!parsed.ok) {
        setPendingBackup(null);
        setPendingFileName("");
        setError(parsed.error);
        return;
      }
      setPendingBackup(parsed.backup);
      setPendingFileName(file.name);
    } catch {
      setError("ファイルを読み込めませんでした。");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    if (!pendingBackup) {
      return;
    }
    if (
      importMode === "replace" &&
      !window.confirm(
        "現在このブラウザに保存されているすべてのデータを上書きして復元します。よろしいですか？",
      )
    ) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const imported = await importAppData(pendingBackup, importMode);
      const latest = await exportAllAppData();
      setCurrentCounts(countBackupItems(latest.data));
      setPendingBackup(null);
      setPendingFileName("");
      setMessage(
        `バックアップから復元しました（確率計算 ${imported.simulatorPresets}件 / カンペ ${imported.cheatSheetOverrides}件 / デッキ ${imported.playerDecks}件 / 戦績 ${imported.duelRecords}件 / 読取設定 ${imported.captureSettings}件）。`,
      );
      onRestored();
    } catch {
      setError(
        "バックアップの復元に失敗しました。ファイル内容を確認してください。",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const pendingCounts = pendingBackup
    ? countBackupItems(pendingBackup.data)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-dialog-title"
    >
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle id="backup-dialog-title" className="text-lg">
              データのバックアップ・復元
            </CardTitle>
            <CardDescription>
              確率計算のプリセット・誘発カンペ・自分のデッキ・対戦ログ・画面読み取り設定をまとめて
              1 つのファイル（JSON）に保存・復元できます。
            </CardDescription>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="閉じる"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>このブラウザのデータ保護状態</span>
            </div>
            <Badge
              variant={storageStatus === "persisted" ? "default" : "secondary"}
            >
              {storageStatus === "persisted"
                ? "保護済み"
                : storageStatus === "not-persisted"
                  ? "通常保存（定期バックアップ推奨）"
                  : "標準保存"}
            </Badge>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs text-foreground"
            >
              {message}
            </div>
          )}

          <section className="space-y-2.5 rounded-md border border-border p-4">
            <h3 className="text-sm font-semibold">バックアップを保存</h3>
            {currentCounts && (
              <p className="text-xs text-muted-foreground tabular-nums">
                現在の保存件数：確率計算 {currentCounts.simulatorPresets}件 /
                誘発カンペ {currentCounts.cheatSheetOverrides}件 / デッキ{" "}
                {currentCounts.playerDecks}件 / 戦績 {currentCounts.duelRecords}
                件 / 読取設定 {currentCounts.captureSettings}件
              </p>
            )}
            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={isBusy}
            >
              <Download className="h-4 w-4" />
              バックアップを保存（JSON）
            </Button>
          </section>

          <section className="space-y-3 rounded-md border border-border p-4">
            <div>
              <h3 className="text-sm font-semibold">バックアップから復元</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                保存した JSON
                ファイルを選び、「マージ」または「全置換」を選んで復元します。
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => void handleFileChange(e)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-accent"
            />

            {pendingBackup && pendingCounts && (
              <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-medium">
                  読み込み済み：{pendingFileName}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  含まれるデータ：確率計算 {pendingCounts.simulatorPresets}件 /
                  誘発カンペ {pendingCounts.cheatSheetOverrides}件 / デッキ{" "}
                  {pendingCounts.playerDecks}件 / 戦績{" "}
                  {pendingCounts.duelRecords}件
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("merge")}
                    className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                      importMode === "merge"
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <p className="font-semibold">マージ（おすすめ）</p>
                    <p className="mt-0.5 text-[11px]">
                      今のデータを残したまま、新しいデータを追加・同じ項目を更新します。
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                      importMode === "replace"
                        ? "border-destructive bg-destructive/15 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <p className="font-semibold">全置換（すべて上書き）</p>
                    <p className="mt-0.5 text-[11px]">
                      今のデータをすべて消し、バックアップファイルの内容に置き換えます。
                    </p>
                  </button>
                </div>

                <Button
                  type="button"
                  variant={importMode === "replace" ? "destructive" : "default"}
                  onClick={() => void handleImport()}
                  disabled={isBusy}
                >
                  <Upload className="h-4 w-4" />
                  {importMode === "replace"
                    ? "全置換して復元する"
                    : "マージして復元する"}
                </Button>
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
