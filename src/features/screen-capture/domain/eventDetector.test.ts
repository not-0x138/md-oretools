import { describe, expect, it } from "vitest";
import {
  createInitialLiveSession,
  detectCoinFlipFromText,
  detectDuelResultFromText,
  detectTurnOrderFromText,
  reduceLiveDuelSession,
} from "./eventDetector";

describe("eventDetector（コイン・先攻後攻・勝敗判定とセッション遷移）", () => {
  it("テキストからコイントスの表・裏を判定できる", () => {
    expect(detectCoinFlipFromText("先攻・後攻を選択してください")).toBe(
      "heads",
    );
    expect(
      detectCoinFlipFromText("元 攻 ・ 後 攻 を 選択 し て くだ さい"),
    ).toBe("heads");
    expect(detectCoinFlipFromText("対戦相手が先攻・後攻を選択しています")).toBe(
      "tails",
    );
    expect(detectCoinFlipFromText("コイン 表")).toBe("heads");
    expect(detectCoinFlipFromText("HEADS")).toBe("heads");
    expect(detectCoinFlipFromText("裏 が出ました")).toBe("tails");
    expect(detectCoinFlipFromText("TAILS")).toBe("tails");
    expect(detectCoinFlipFromText("ノイズ文字列")).toBeNull();
  });

  it("テキストから先攻・後攻を判定できる", () => {
    expect(detectTurnOrderFromText("あな た が 先攻 で す 。")).toBe("first");
    expect(detectTurnOrderFromText("あなたが後攻です。")).toBe("second");
    expect(detectTurnOrderFromText("先攻")).toBe("first");
    expect(detectTurnOrderFromText("YOU GO FIRST")).toBe("first");
    expect(detectTurnOrderFromText("後攻")).toBe("second");
    expect(detectTurnOrderFromText("SECOND")).toBe("second");
    // 選択中メッセージは片方が文字化けしても確定扱いしない
    expect(detectTurnOrderFromText("元攻・後攻を選択してください")).toBeNull();
    expect(detectTurnOrderFromText("ドローフェイズ")).toBeNull();
  });

  it("テキストから勝敗（VICTORY / DEFEAT / リザルト画面 / 降参メッセージ）を判定できる", () => {
    expect(detectDuelResultFromText("デュ エル 勝利")).toBe("win");
    expect(detectDuelResultFromText("デュエル敗北")).toBe("lose");
    expect(detectDuelResultFromText("降参 し まし た")).toBe("lose");
    expect(detectDuelResultFromText("対戦相手が降参しました")).toBe("win");
    expect(detectDuelResultFromText("降参しますか？")).toBeNull();
    expect(detectDuelResultFromText("VICTORY")).toBe("win");
    expect(detectDuelResultFromText("勝利！")).toBe("win");
    expect(detectDuelResultFromText("DEFEAT")).toBe("lose");
    expect(detectDuelResultFromText("敗北")).toBe("lose");
    expect(detectDuelResultFromText("DRAW")).toBeNull();
  });

  it("コイン→先攻→相手類推→勝敗検知で仮確定バナー状態へ遷移する", () => {
    let session = createInitialLiveSession();

    session = reduceLiveDuelSession(session, {
      type: "coin_detected",
      coinFlip: "heads",
      at: "2026-11-26T12:00:00.000Z",
    }).session;

    session = reduceLiveDuelSession(session, {
      type: "turn_order_detected",
      turnOrder: "first",
      at: "2026-11-26T12:00:05.000Z",
    }).session;

    session = reduceLiveDuelSession(session, {
      type: "opponent_inferred",
      themeId: "tenpai",
      themeName: "天盃龍",
      at: "2026-11-26T12:01:00.000Z",
    }).session;

    const afterWin = reduceLiveDuelSession(session, {
      type: "result_detected",
      result: "win",
      at: "2026-11-26T12:05:00.000Z",
    });

    expect(afterWin.autoCommitResult).toBeNull();
    expect(afterWin.session.pendingResult).toEqual({
      result: "win",
      coinFlip: "heads",
      turnOrder: "first",
      opponentDeck: "天盃龍",
      opponentThemeId: "tenpai",
      detectedAt: "2026-11-26T12:05:00.000Z",
    });
  });

  it("仮確定バナー未操作のまま次戦のコインを検知すると、前戦を自動確定しつつ新セッションを開始する", () => {
    let session = createInitialLiveSession();
    session = reduceLiveDuelSession(session, {
      type: "coin_detected",
      coinFlip: "tails",
      at: "2026-11-26T12:00:00.000Z",
    }).session;
    session = reduceLiveDuelSession(session, {
      type: "turn_order_detected",
      turnOrder: "second",
      at: "2026-11-26T12:00:03.000Z",
    }).session;
    session = reduceLiveDuelSession(session, {
      type: "opponent_inferred",
      themeId: "yubel",
      themeName: "ユベル",
      at: "2026-11-26T12:01:00.000Z",
    }).session;
    session = reduceLiveDuelSession(session, {
      type: "result_detected",
      result: "lose",
      at: "2026-11-26T12:04:00.000Z",
    }).session;

    const nextMatch = reduceLiveDuelSession(session, {
      type: "coin_detected",
      coinFlip: "heads",
      at: "2026-11-26T12:06:00.000Z",
    });

    expect(nextMatch.autoCommitResult).toEqual({
      result: "lose",
      coinFlip: "tails",
      turnOrder: "second",
      opponentDeck: "ユベル",
      opponentThemeId: "yubel",
      detectedAt: "2026-11-26T12:04:00.000Z",
    });
    expect(nextMatch.session.coinFlip).toBe("heads");
    expect(nextMatch.session.turnOrder).toBeNull();
    expect(nextMatch.session.opponentDeck).toBe("不明");
    expect(nextMatch.session.pendingResult).toBeNull();
  });

  it("プレイヤーが手動で相手デッキを変更した後は、自動類推で上書きしない", () => {
    let session = createInitialLiveSession();
    session = reduceLiveDuelSession(session, {
      type: "opponent_manual_set",
      opponentDeck: "ラビュリンス",
      themeId: "labrynth",
      at: "2026-11-26T12:01:00.000Z",
    }).session;

    session = reduceLiveDuelSession(session, {
      type: "opponent_inferred",
      themeId: "tenpai",
      themeName: "天盃龍",
      at: "2026-11-26T12:02:00.000Z",
    }).session;

    expect(session.opponentDeck).toBe("ラビュリンス");
    expect(session.opponentThemeId).toBe("labrynth");
  });
});
