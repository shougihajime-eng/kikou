// json-kifu-format は型定義を同梱していないため、利用範囲だけ宣言する。
declare module "json-kifu-format" {
  export class JKFPlayer {
    constructor(jkf: unknown);
    static parse(kifu: string, filename?: string): JKFPlayer;
    static parseKIF(kifu: string): JKFPlayer;
    static parseKI2(kifu: string): JKFPlayer;
    static parseCSA(kifu: string): JKFPlayer;
    static parseJKF(kifu: string): JKFPlayer;
    kifu: unknown;
    tesuu: number;
    goto(tesuu: number): void;
    forward(): boolean;
    backward(): boolean;
    getMaxTesuu(): number;
    getState(): unknown;
    getReadableKifu(tesuu?: number): string;
    getReadableKifuState(): Array<{ kifu: string; comments?: string[] }>;
  }
}
