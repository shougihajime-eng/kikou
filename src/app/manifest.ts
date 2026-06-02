import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "棋稿 — 将棋の本をつくる",
    short_name: "棋稿",
    description:
      "将棋の局面を中心に、著者と編集者がコメントしながら本をつくる編集ツール。",
    start_url: "/projects",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#f6f1e7",
    lang: "ja",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
