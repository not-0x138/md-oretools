import { ChevronDown } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";

export interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60),
    )
    .trim();
}

/**
 * ネイティブ <datalist> は一部ブラウザ環境（Webview 等）で白背景化・表示位置ズレが起きるため、
 * ダークテーマに馴染む自前ドロップダウンで自由入力＋候補選択を提供する。
 */
export function ComboboxInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: ComboboxInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const filteredOptions = useMemo(() => {
    const query = normalizeForMatch(value);
    // すでに候補のいずれかと完全一致しているときは、別候補へ切り替えやすいよう全候補を表示する
    const isExactMatch = options.some(
      (option) => normalizeForMatch(option) === query,
    );
    if (!query || isExactMatch) {
      return options;
    }
    return options.filter((option) =>
      normalizeForMatch(option).includes(query),
    );
  }, [options, value]);

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? filteredOptions.length - 1 : prev - 1,
        );
      }
      return;
    }
    if (e.key === "Enter" && isOpen && highlightedIndex >= 0) {
      const target = filteredOptions[highlightedIndex];
      if (target !== undefined) {
        e.preventDefault();
        handleSelectOption(target);
      }
      return;
    }
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen && filteredOptions.length > 0}
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
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background py-1 pl-3 pr-8 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="候補を表示"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((prev) => !prev);
          setHighlightedIndex(-1);
          inputRef.current?.focus();
        }}
        className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && filteredOptions.length > 0 && "rotate-180",
          )}
        />
      </button>

      {isOpen && filteredOptions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-card p-1 text-sm text-foreground shadow-lg"
        >
          {filteredOptions.map((option, index) => {
            const isSelected = option === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={option}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectOption(option)}
                className={cn(
                  "block w-full cursor-pointer rounded-sm px-2.5 py-1.5 text-left transition-colors",
                  isHighlighted
                    ? "bg-accent text-accent-foreground"
                    : isSelected
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
