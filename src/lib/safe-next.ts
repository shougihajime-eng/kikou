// ログイン後の遷移先を「自サイト内のパス」だけに制限する（外部サイトへの誘導を防ぐ）。
export function safeNext(next?: string | null): string {
  if (!next) return "/projects";
  // 先頭が "/" かつ "//"（プロトコル相対）や "/\" でない内部パスのみ許可
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/projects";
  }
  return next;
}
