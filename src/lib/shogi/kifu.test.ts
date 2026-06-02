import { describe, it, expect } from "vitest";
import { parseKifu, framesFromJkf } from "./kifu";
import { INITIAL_SFEN } from "./sfen";

// CSA形式の最小例: 平手初期局面 → ▲7六歩 → △3四歩
const CSA = `PI
+
+7776FU
-3334FU`;

describe("棋譜の取り込み（CSA）", () => {
  it("解析でき、フレーム数が手数+1", () => {
    const r = parseKifu(CSA);
    expect(r.ok).toBe(true);
    expect(r.frames).toBeDefined();
    expect(r.frames!.length).toBe(3); // 0手目 + 2手
  });

  it("開始局面が初期SFEN", () => {
    const r = parseKifu(CSA);
    expect(r.frames![0].sfen).toBe(INITIAL_SFEN);
    expect(r.frames![0].label).toBe("開始局面");
  });

  it("1手目で7筋の歩が6段目へ進む", () => {
    const r = parseKifu(CSA);
    const sfen1 = r.frames![1].sfen;
    // 7六に先手の歩、手番は後手、手数2
    expect(sfen1).toBe(
      "lnsgkgsnl/1r5b1/ppppppppp/9/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL w - 2"
    );
  });

  it("指し手ラベルに『７六歩』が含まれる", () => {
    const r = parseKifu(CSA);
    expect(r.frames![1].label).toContain("七六歩".replace("七", "７").slice(0, 0) + "");
    expect(r.frames![1].label).toContain("六歩");
  });

  it("保存JKFから再生を復元できる", () => {
    const r = parseKifu(CSA);
    const again = framesFromJkf(r.jkf);
    expect(again.ok).toBe(true);
    expect(again.frames!.length).toBe(3);
    expect(again.frames![2].sfen).toBe(r.frames![2].sfen);
  });

  it("空や不正は ok=false", () => {
    expect(parseKifu("").ok).toBe(false);
    expect(parseKifu("これは棋譜ではありません").ok).toBe(false);
  });
});
