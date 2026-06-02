// 小さな className 結合ヘルパ（依存を増やさないため自前）
export function clsx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
