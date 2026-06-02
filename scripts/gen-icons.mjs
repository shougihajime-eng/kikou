// アプリアイコンを生成する。藍地に「棋」（明朝）。
// 実行: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/icons";
await mkdir(OUT, { recursive: true });

function svg(size, { bg = "#1f3a5f", fg = "#f6f1e7", radius = 0 } = {}) {
  const fontSize = Math.round(size * 0.62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <text x="50%" y="50%" dy="0.04em" text-anchor="middle" dominant-baseline="central"
    font-family="'Yu Mincho','Noto Serif JP',serif" font-weight="600"
    font-size="${fontSize}" fill="${fg}">棋</text>
</svg>`;
}

async function png(size, name, opts) {
  await sharp(Buffer.from(svg(size, opts)))
    .png()
    .toFile(`${OUT}/${name}`);
  console.log("wrote", name);
}

// 通常アイコン
await png(192, "icon-192.png");
await png(512, "icon-512.png");
// マスカブル（余白多め=安全領域確保のため背景のみ広く、文字は中央小さめ）
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#1f3a5f"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="'Yu Mincho','Noto Serif JP',serif" font-weight="600" font-size="250" fill="#f6f1e7">棋</text></svg>`
  )
)
  .png()
  .toFile(`${OUT}/maskable-512.png`);
console.log("wrote maskable-512.png");
// Apple touch icon（角丸なし・iOSが角丸化）
await png(180, "apple-touch-icon.png");
// favicon 用
await png(32, "favicon-32.png");
