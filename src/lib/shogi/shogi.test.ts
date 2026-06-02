import { describe, it, expect } from "vitest";
import {
  parseSfen,
  toSfen,
  INITIAL_SFEN,
  colToFile,
  fileToCol,
  type BoardState,
} from "./sfen";
import { pieceKanji, fileKanji, rankKanji, turnMark, formatMove } from "./notation";
import { findNifu, findOverCount, validateBoard } from "./validate";

describe("SFEN parse/serialize", () => {
  it("初期局面を往復しても変わらない", () => {
    const state = parseSfen(INITIAL_SFEN);
    expect(toSfen(state)).toBe(INITIAL_SFEN);
  });

  it("手番と手数を読む", () => {
    const state = parseSfen(INITIAL_SFEN);
    expect(state.turn).toBe("b");
    expect(state.moveNumber).toBe(1);
  });

  it("持ち駒（先手 飛、後手 歩2）を往復できる", () => {
    const sfen = "9/9/9/9/9/9/9/9/9 b R2p 1";
    const state = parseSfen(sfen);
    expect(state.hands.b.R).toBe(1);
    expect(state.hands.w.P).toBe(2);
    expect(toSfen(state)).toBe(sfen);
  });

  it("成駒（先手と金・後手龍）を読み書きできる", () => {
    const sfen = "9/9/9/9/4+P4/9/9/9/4+r4 b - 1";
    const state = parseSfen(sfen);
    expect(state.board[4][4]).toMatchObject({ role: "P", promoted: true, color: "b" });
    expect(state.board[8][4]).toMatchObject({ role: "R", promoted: true, color: "w" });
    expect(toSfen(state)).toBe(sfen);
  });

  it("壊れた SFEN（段数不足）は例外", () => {
    expect(() => parseSfen("9/9/9 b - 1")).toThrow();
  });

  it("筋とcolの変換が対応する", () => {
    expect(colToFile(0)).toBe(9);
    expect(colToFile(8)).toBe(1);
    expect(fileToCol(7)).toBe(2);
  });
});

describe("駒の漢字（連盟準拠）", () => {
  it("成駒1文字: と杏圭全馬龍", () => {
    expect(pieceKanji("P", true, "b")).toBe("と");
    expect(pieceKanji("L", true, "b")).toBe("杏");
    expect(pieceKanji("N", true, "b")).toBe("圭");
    expect(pieceKanji("S", true, "b")).toBe("全");
    expect(pieceKanji("B", true, "b")).toBe("馬");
    expect(pieceKanji("R", true, "b")).toBe("龍");
  });

  it("成駒の正式表記: 成香成桂成銀", () => {
    expect(pieceKanji("L", true, "b", { fullPromoted: true })).toBe("成香");
    expect(pieceKanji("N", true, "b", { fullPromoted: true })).toBe("成桂");
    expect(pieceKanji("S", true, "b", { fullPromoted: true })).toBe("成銀");
  });

  it("玉と王を描き分ける（先手玉・後手王）", () => {
    expect(pieceKanji("K", false, "b")).toBe("玉");
    expect(pieceKanji("K", false, "w")).toBe("王");
    expect(pieceKanji("K", false, "w", { distinguishKing: false })).toBe("玉");
  });

  it("通常の駒", () => {
    expect(pieceKanji("R", false, "b")).toBe("飛");
    expect(pieceKanji("B", false, "w")).toBe("角");
    expect(pieceKanji("G", false, "b")).toBe("金");
  });
});

describe("筋段・手番記号", () => {
  it("筋は全角算用数字、段は漢数字", () => {
    expect(fileKanji(7)).toBe("７");
    expect(rankKanji(6)).toBe("六");
  });
  it("先手▲ 後手△", () => {
    expect(turnMark("b")).toBe("▲");
    expect(turnMark("w")).toBe("△");
  });
});

describe("指し手の整形", () => {
  it("▲７六歩", () => {
    expect(
      formatMove({ color: 0, from: { x: 7, y: 7 }, to: { x: 7, y: 6 }, piece: "FU" })
    ).toBe("▲７六歩");
  });
  it("同・成・打・相対表記が崩れない", () => {
    expect(formatMove({ color: 1, from: { x: 3, y: 3 }, to: { x: 8, y: 8 }, piece: "KA", same: true, promote: true }))
      .toBe("△同　角成");
    expect(formatMove({ color: 0, to: { x: 5, y: 5 }, piece: "FU" }))
      .toBe("▲５五歩打");
    expect(formatMove({ color: 0, from: { x: 6, y: 9 }, to: { x: 5, y: 8 }, piece: "GI", relative: "L" }))
      .toBe("▲５八銀左");
  });
});

describe("バリデーション", () => {
  it("二歩を検出する", () => {
    // 5筋（col=4）に先手の歩を2枚
    const state: BoardState = parseSfen("9/9/9/9/4P4/4P4/9/9/9 b - 1");
    const issues = findNifu(state);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("二歩");
  });

  it("正常な初期局面は二歩なし", () => {
    expect(findNifu(parseSfen(INITIAL_SFEN))).toHaveLength(0);
  });

  it("歩が多すぎると検出", () => {
    // 持ち駒に歩19枚（盤上0）→ 上限18超
    const state = parseSfen("9/9/9/9/9/9/9/9/9 b 19P 1");
    const issues = findOverCount(state);
    expect(issues.some((i) => i.message.includes("歩が多すぎ"))).toBe(true);
  });

  it("初期局面は全体検査で問題なし", () => {
    expect(validateBoard(parseSfen(INITIAL_SFEN))).toHaveLength(0);
  });
});
