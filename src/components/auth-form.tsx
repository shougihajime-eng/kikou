"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthResult } from "@/app/auth-actions";
import { Field, Input, Button } from "@/components/ui";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/projects"} />

      {mode === "signup" && (
        <Field label="お名前（表示名）" hint="コメントに表示されます">
          <Input name="display_name" autoComplete="name" placeholder="例：はじめ" />
        </Field>
      )}

      <Field label="メールアドレス">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="合言葉（パスワード）"
        hint={mode === "signup" ? "6文字以上" : undefined}
      >
        <Input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••"
        />
      </Field>

      {state.error && (
        <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "処理中…"
          : mode === "login"
            ? "ログイン"
            : "登録してはじめる"}
      </Button>

      <p className="pt-2 text-center text-sm text-sumi-soft">
        {mode === "login" ? (
          <>
            はじめての方は{" "}
            <Link
              href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-ai underline underline-offset-2"
            >
              新規登録
            </Link>
          </>
        ) : (
          <>
            すでにアカウントがある方は{" "}
            <Link
              href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-ai underline underline-offset-2"
            >
              ログイン
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
