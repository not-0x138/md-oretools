import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import {
  type CardSuggestCategory,
  type CardSuggestItem,
  suggestCardNames,
} from "../domain/cardSuggest";

export interface CardSuggestInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** 候補の選択、または自由入力での Enter 確定時に呼ばれる */
  onCommit: (cardName: string) => void;
  dictionary: readonly CardSuggestItem[];
  preferredCategory?: CardSuggestCategory;
  excludeNames?: readonly string[];
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * ひらがな読み・カタカナ・カード名の一部からカード候補をサジェストする入力欄。
 * ネイティブ <datalist> は読み仮名補完やダークテーマ表示が環境依存になるため自前ドロップダウンで実装する。
 */
export function CardSuggestInput({
  id,
  value,
  onChange,
  onCommit,
  dictionary,
  preferredCategory,
  excludeNames,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: CardSuggestInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const suggestions = useMemo(
    () =>
      suggestCardNames(value, dictionary, {
        preferredCategory,
        excludeNames,
        limit: 8,
      }),
    [dictionary, excludeNames, preferredCategory, value],
  );

  const showDropdown = isOpen && suggestions.length > 0;

  const commitName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onCommit(trimmed);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 日本語 IME の変換確定 Enter で誤確定しないよう isComposing を除外する
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev < 0 ? 0 : (prev + 1) % suggestions.length,
        );
      }
      return;
    }
    if (e.key === "ArrowUp") {
      if (showDropdown) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev <= 0 ? suggestions.length - 1 : prev - 1,
        );
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (showDropdown && highlightedIndex >= 0) {
        const picked = suggestions[highlightedIndex];
        if (picked) {
          commitName(picked.name);
          return;
        }
      }
      commitName(value);
      return;
    }
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (
      containerRef.current &&
      e.relatedTarget instanceof Node &&
      containerRef.current.contains(e.relatedTarget)
    ) {
      return;
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 text-xs text-foreground shadow-lg"
        >
          {suggestions.map((item, index) => {
            const isHighlighted = index === highlightedIndex;
            const primaryReading = item.readings[0];
            return (
              <button
                key={item.name}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={isHighlighted}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => commitName(item.name)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-1.5 text-left transition-colors",
                  isHighlighted
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className="truncate font-medium">{item.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                  {primaryReading && (
                    <span className="hidden sm:inline">{primaryReading}</span>
                  )}
                  {item.hint && (
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                      {item.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
