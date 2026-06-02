// ごく軽量な Markdown もどき → HTML。見出し(# ##)・太字(**)・箇条書き(-)・改行のみ。
// XSS を防ぐため必ず先にエスケープする。

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  // **太字**
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function renderLite(src: string): string {
  const lines = escapeHtml(src).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) {
      closeList();
      out.push(`<h4 class="font-medium mt-3 mb-1">${inline(line.replace(/^##\s+/, ""))}</h4>`);
    } else if (/^#\s+/.test(line)) {
      closeList();
      out.push(`<h3 class="font-mincho text-base mt-3 mb-1">${inline(line.replace(/^#\s+/, ""))}</h3>`);
    } else if (/^[-・]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-0.5">');
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^[-・]\s+/, ""))}</li>`);
    } else if (line === "") {
      closeList();
      out.push("");
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}
