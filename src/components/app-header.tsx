import Link from "next/link";
import { signOut } from "@/app/auth-actions";

export function AppHeader({
  displayName,
  children,
}: {
  displayName: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-washi/80 px-4 py-2.5 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="font-mincho text-xl text-sumi">
          棋稿
        </Link>
        {children}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-sumi-soft sm:inline">{displayName}</span>
        <form action={signOut}>
          <button className="rounded border border-line px-2.5 py-1 text-xs text-sumi-soft transition-colors hover:bg-washi-2">
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
