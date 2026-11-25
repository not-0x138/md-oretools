import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 連続表示時のタイマー競合とアンマウント後の state 更新を防ぐ一時メッセージフック。
 */
export function useTransientMessage(durationMs = 2500) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  }, []);

  const show = useCallback(
    (nextMessage: string) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      setMessage(nextMessage);
      timerRef.current = window.setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  useEffect(() => clear, [clear]);

  return { message, show, clear };
}
