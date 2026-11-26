import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PlayerDeck } from "../domain/types";

interface DeckManagerPanelProps {
  decks: readonly PlayerDeck[];
  onAddDeck: (name: string, memo: string) => Promise<PlayerDeck | null>;
  onUpdateDeck: (deck: PlayerDeck) => Promise<PlayerDeck | null>;
  onToggleArchive: (deck: PlayerDeck) => Promise<PlayerDeck | null>;
  onDeleteDeck: (id: string) => Promise<boolean>;
}

export function DeckManagerPanel({
  decks,
  onAddDeck,
  onUpdateDeck,
  onToggleArchive,
  onDeleteDeck,
}: DeckManagerPanelProps) {
  const [newName, setNewName] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMemo, setEditMemo] = useState("");

  const activeDecks = decks.filter((deck) => !deck.archived);
  const archivedDecks = decks.filter((deck) => deck.archived);
  const visibleDecks = showArchived ? archivedDecks : activeDecks;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    const created = await onAddDeck(trimmed, newMemo);
    if (created) {
      setNewName("");
      setNewMemo("");
    }
  };

  const startEdit = (deck: PlayerDeck) => {
    setEditingId(deck.id);
    setEditName(deck.name);
    setEditMemo(deck.memo);
  };

  const handleSaveEdit = async (deck: PlayerDeck) => {
    if (!editName.trim()) {
      return;
    }
    const updated = await onUpdateDeck({
      ...deck,
      name: editName.trim(),
      memo: editMemo.trim(),
    });
    if (updated) {
      setEditingId(null);
    }
  };

  const handleDelete = async (deck: PlayerDeck) => {
    if (
      !window.confirm(
        `デッキ「${deck.name}」を削除しますか？\n※過去の対戦ログは残りますが、使わなくなっただけのデッキは「アーカイブ」がおすすめです。`,
      )
    ) {
      return;
    }
    await onDeleteDeck(deck.id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">自分のデッキを登録</CardTitle>
          <CardDescription>
            よく使うデッキを登録しておくと、対戦ログ記録時にワンクリックで選べます。使わなくなったデッキは過去の戦績を残したままアーカイブできます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              aria-label="デッキ名"
              placeholder="デッキ名（例: スネークアイ、天盃龍）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <Input
              aria-label="デッキのメモ"
              placeholder="メモ（任意: 誘発枚数や型など）"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!newName.trim()}
            >
              <Plus className="h-4 w-4" />
              登録
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">登録済みデッキ一覧</CardTitle>
            <CardDescription>
              使用中 {activeDecks.length}件 / アーカイブ {archivedDecks.length}
              件
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={!showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(false)}
            >
              使用中 ({activeDecks.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(true)}
            >
              アーカイブ ({archivedDecks.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visibleDecks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {showArchived
                ? "アーカイブ済みのデッキはありません。"
                : "登録されたデッキはまだありません。上のフォームからデッキを登録してください。"}
            </p>
          ) : (
            <div className="space-y-2.5">
              {visibleDecks.map((deck) => {
                const isEditing = editingId === deck.id;
                return (
                  <div
                    key={deck.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-3"
                  >
                    {isEditing ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <Input
                          aria-label="デッキ名を編集"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="min-w-40 flex-1"
                        />
                        <Input
                          aria-label="メモを編集"
                          value={editMemo}
                          onChange={(e) => setEditMemo(e.target.value)}
                          placeholder="メモ（任意）"
                          className="min-w-40 flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleSaveEdit(deck)}
                          disabled={!editName.trim()}
                        >
                          保存
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          キャンセル
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{deck.name}</span>
                            {deck.archived && (
                              <Badge variant="muted" className="text-[10px]">
                                アーカイブ
                              </Badge>
                            )}
                          </div>
                          {deck.memo && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {deck.memo}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(deck)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            編集
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void onToggleArchive(deck)}
                          >
                            {deck.archived ? (
                              <>
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                戻す
                              </>
                            ) : (
                              <>
                                <Archive className="h-3.5 w-3.5" />
                                アーカイブ
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`${deck.name}を削除`}
                            onClick={() => void handleDelete(deck)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
