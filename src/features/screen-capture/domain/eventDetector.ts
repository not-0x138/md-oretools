import type {
  CoinFlipValue,
  DuelResultValue,
  LiveDuelSession,
  LiveSessionEvent,
  LiveSessionTransition,
  TurnOrderValue,
} from "./types";

function normalizeEventText(raw: string): string {
  return raw.normalize("NFKC").toUpperCase().replace(/\s+/g, "");
}

export function detectCoinFlipFromText(raw: string): CoinFlipValue | null {
  const text = normalizeEventText(raw);
  if (!text) {
    return null;
  }
  // 実機UIではコインの表裏テキスト自体は表示されず、表なら「先攻・後攻を選択してください」、
  // 裏なら「対戦相手が先攻・後攻を選択しています」のメッセージ帯が表示される。
  const hasHeads =
    text.includes("選択してください") ||
    text.includes("表") ||
    text.includes("HEADS");
  const hasTails =
    (text.includes("対戦相手") && text.includes("選択")) ||
    text.includes("選択中") ||
    text.includes("選択しています") ||
    text.includes("裏") ||
    text.includes("TAILS");

  if (hasHeads && !hasTails) {
    return "heads";
  }
  if (hasTails && !hasHeads) {
    return "tails";
  }
  return null;
}

export function detectTurnOrderFromText(raw: string): TurnOrderValue | null {
  const text = normalizeEventText(raw);
  if (!text) {
    return null;
  }
  // コイントス直後の「先攻・後攻を選択してください」画面は、片方の文字が読み取り欠損しても
  // 先攻・後攻の確定と誤認しないよう除外する。
  if (
    text.includes("選択してください") ||
    text.includes("選択しています") ||
    text.includes("選択中")
  ) {
    return null;
  }

  const hasFirst =
    text.includes("先攻") || text.includes("先行") || text.includes("FIRST");
  const hasSecond = text.includes("後攻") || text.includes("SECOND");

  if (hasFirst && !hasSecond) {
    return "first";
  }
  if (hasSecond && !hasFirst) {
    return "second";
  }
  return null;
}

export function detectDuelResultFromText(raw: string): DuelResultValue | null {
  const text = normalizeEventText(raw);
  if (!text) {
    return null;
  }
  const hasWin =
    text.includes("VICTORY") || text.includes("勝利") || text.includes("WIN");
  const hasLose =
    text.includes("DEFEAT") || text.includes("敗北") || text.includes("LOSE");

  if (hasWin && !hasLose) {
    return "win";
  }
  if (hasLose && !hasWin) {
    return "lose";
  }
  return null;
}

export function createInitialLiveSession(): LiveDuelSession {
  return {
    coinFlip: null,
    turnOrder: null,
    opponentDeck: "不明",
    opponentThemeId: null,
    opponentLockedByUser: false,
    pendingResult: null,
    lastUpdatedAt: null,
  };
}

/**
 * 進行中の対戦セッション状態遷移（純粋関数）。
 * 仮確定バナーが未操作のまま次戦のコイントスを検知した場合は、
 * 前戦の結果を autoCommitResult として返し、新しい対戦セッションを開始する。
 */
export function reduceLiveDuelSession(
  session: LiveDuelSession,
  event: LiveSessionEvent,
): LiveSessionTransition {
  switch (event.type) {
    case "coin_detected": {
      if (session.pendingResult) {
        return {
          autoCommitResult: session.pendingResult,
          session: {
            ...createInitialLiveSession(),
            coinFlip: event.coinFlip,
            lastUpdatedAt: event.at,
          },
        };
      }
      return {
        autoCommitResult: null,
        session: {
          ...session,
          coinFlip: event.coinFlip,
          lastUpdatedAt: event.at,
        },
      };
    }

    case "turn_order_detected":
      return {
        autoCommitResult: null,
        session: {
          ...session,
          turnOrder: event.turnOrder,
          lastUpdatedAt: event.at,
        },
      };

    case "opponent_inferred": {
      if (session.opponentLockedByUser) {
        return { autoCommitResult: null, session };
      }
      return {
        autoCommitResult: null,
        session: {
          ...session,
          opponentDeck: event.themeName,
          opponentThemeId: event.themeId,
          lastUpdatedAt: event.at,
          pendingResult: session.pendingResult
            ? {
                ...session.pendingResult,
                opponentDeck: event.themeName,
                opponentThemeId: event.themeId,
              }
            : null,
        },
      };
    }

    case "opponent_manual_set": {
      const cleaned = event.opponentDeck.trim() || "不明";
      return {
        autoCommitResult: null,
        session: {
          ...session,
          opponentDeck: cleaned,
          opponentThemeId: event.themeId,
          opponentLockedByUser: true,
          lastUpdatedAt: event.at,
          pendingResult: session.pendingResult
            ? {
                ...session.pendingResult,
                opponentDeck: cleaned,
                opponentThemeId: event.themeId,
              }
            : null,
        },
      };
    }

    case "result_detected": {
      if (session.pendingResult) {
        return { autoCommitResult: null, session };
      }
      return {
        autoCommitResult: null,
        session: {
          ...session,
          pendingResult: {
            result: event.result,
            coinFlip: session.coinFlip,
            turnOrder: session.turnOrder,
            opponentDeck: session.opponentDeck,
            opponentThemeId: session.opponentThemeId,
            detectedAt: event.at,
          },
          lastUpdatedAt: event.at,
        },
      };
    }

    case "confirm_pending":
    case "discard_pending":
    case "reset_session":
      return {
        autoCommitResult: null,
        session: createInitialLiveSession(),
      };
  }
}
