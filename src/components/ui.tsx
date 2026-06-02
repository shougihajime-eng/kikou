import Link from "next/link";
import { clsx } from "@/lib/clsx";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "subtle";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-ai text-washi shadow-sm hover:bg-ai-soft hover:shadow",
        variant === "ghost" &&
          "border border-line bg-washi/40 text-sumi hover:bg-washi-2",
        variant === "subtle" && "bg-washi-2 text-sumi hover:bg-line/40",
        variant === "danger" &&
          "border border-danger/40 text-danger hover:bg-danger/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-medium transition-all active:translate-y-px",
        variant === "primary" && "bg-ai text-washi shadow-sm hover:bg-ai-soft hover:shadow",
        variant === "ghost" &&
          "border border-line bg-washi/40 text-sumi hover:bg-washi-2",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-sumi-soft">{label}</span>
      {children}
      {hint && <span className="block text-xs text-sumi-soft/70">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded px-3 py-2 text-sm",
        props.className
      )}
    />
  );
}
