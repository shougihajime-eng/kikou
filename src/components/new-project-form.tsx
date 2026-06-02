"use client";

import { useState } from "react";
import { createProject } from "@/app/projects/actions";
import { Button, Input } from "@/components/ui";

export function NewProjectForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>＋ 新しい本をつくる</Button>
    );
  }

  return (
    <form
      action={createProject}
      className="flex flex-col gap-3 rounded-lg border border-line bg-washi-2/50 p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="mb-1.5 block text-sm font-medium text-sumi-soft">
          本のタイトル
        </label>
        <Input name="title" autoFocus placeholder="例：角換わりのすべて" />
      </div>
      <div className="flex gap-2">
        <Button type="submit">つくる</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          やめる
        </Button>
      </div>
    </form>
  );
}
