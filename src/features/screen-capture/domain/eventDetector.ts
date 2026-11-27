import type {
  CoinFlipValue,
  DuelResultValue,
  LiveDuelSession,
  LiveSessionEvent,
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
  // 降参確認ダイアログ（「降参しますか？」）は確定前なので除外する
  if (text.includes("降参しますか")) {
    return null;
  }

  const isOpponentSurrender = text.includes("相手") && text.includes("降参");
  const isSelfSurrender =
    !text.includes("相手") &&
    text.includes("降参") &&
    (text.includes("ました") || text.includes("確定"));
  const isOpponentTimeoutOrDisconnect =
    text.includes("相手") &&
    (text.includes("時間切れ") || text.includes("接続"));

  const hasWin =
    text.includes("VICTORY") ||
    text.includes("勝利") ||
    text.includes("WIN") ||
    isOpponentSurrender ||
    isOpponentTimeoutOrDisconnect;
  const hasLose =
    text.includes("DEFEAT") ||
    text.includes("敗北") ||
    text.includes("LOSE") ||
    isSelfSurrender;

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
    lastUpdatedAt: null,
  };
}

/**
 * 進行中の対戦セッション状態遷移（純粋関数）。
 */
export function reduceLiveDuelSession(
  session: LiveDuelSession,
  event: LiveSessionEvent,
): LiveDuelSession {
  switch (event.type) {
    case "coin_detected":
      return {
        ...session,
        coinFlip: event.coinFlip,
        lastUpdatedAt: event.at,
      };

    case "turn_order_detected":
      return {
        ...session,
        turnOrder: event.turnOrder,
        lastUpdatedAt: event.at,
      };

    case "opponent_inferred": {
      if (session.opponentLockedByUser) {
        return session;
      }
      return {
        ...session,
        opponentDeck: event.themeName,
        opponentThemeId: event.themeId,
        lastUpdatedAt: event.at,
      };
    }

    case "opponent_manual_set": {
      const cleaned = event.opponentDeck.trim() || "不明";
      return {
        ...session,
        opponentDeck: cleaned,
        opponentThemeId: event.themeId,
        opponentLockedByUser: true,
        lastUpdatedAt: event.at,
      };
    }

    case "reset_session":
      return createInitialLiveSession();
  }
}
