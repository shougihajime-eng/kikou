@AGENTS.md

# 棋稿（Kikō）— プロジェクト案内

将棋の本を書く著者と編集者が、「将棋の局面」を中心にやり取り・解説・コメントできる編集コラボツール。

## 進捗（いまここ）
- ✅ 直近で済んだこと：MVP一式を実装し本番公開。ログイン（合言葉）・本/章/局面・盤面エディタ（SFEN保存・連盟準拠の漢字）・解説の自動保存・コメント（スレッド/リアルタイム/解決/未解決フィルタ）・編集者の招待リンク・画像添付・PWA。将棋表記テスト18件、RLS安全テスト12件すべて合格。
- 🟡 進行中：実機（iPhone/PC）での目視確認はユーザー側でこれから。
- 🔜 次の一歩：本人が本番でログイン→本を作成→盤面/解説/コメントを試す。必要なら棋譜インポート（KIF/KI2/CSA）等のフェーズ1へ。

## 本番URL・リポジトリ
- 本番URL：https://kikou-ecru.vercel.app
- GitHub：https://github.com/shougihajime-eng/kikou （main へ push で Vercel 自動公開）
- Vercel プロジェクト：`shougihajime-3368s-projects/kikou`

## ログイン
- 方式：メール＋合言葉（パスワード）。各自が自分のアカウント。
- 著者＝本を作った人（オーナー）。編集者＝招待リンクから参加した人。
- 編集者の招待：本の画面右上「＋編集者を招待」→ リンクをコピーして相手に渡す（14日間有効）。

## 技術構成
- Next.js（App Router）＋ TypeScript ＋ Tailwind CSS / Vercel / 共有 Supabase
- DB：共有 Supabase / スキーマ `kikou`（Project `shougihajime-3368s-projects` 配下の共有 `eqkaaohdbqefuszxwqzr`）
- 認証：共有 `auth.users`（他アプリと共通）。所属は `kikou.project_members` のみで判定。RLSで本のメンバー外は読めない。
- Storage：非公開バケット `kikou`（画像は署名URL経由・メンバーのみ）。
- 盤面：自前のSVG/文字描画（`src/lib/shogi/*`）。漢字（と/杏/圭/全/龍/馬・玉/王）と二歩などの検査を自前TSで保証。
- 環境変数：`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`（Vercel に登録済・`.env.local` はgitignore）。

## 主要ファイル
- `supabase/migrations/0001_init.sql` … スキーマ＋RLS（適用済み・公開スキーマにも `kikou` 追加済み）
- `src/lib/shogi/sfen.ts` `notation.ts` `validate.ts` … 将棋表記の核（必須要件）
- `src/components/board/Board.tsx` `BoardEditor.tsx` … 盤面
- `src/components/workspace/*` … 章・局面ツリー、中央ペイン、画像添付
- `src/components/comments/CommentsPanel.tsx` … コメント（リアルタイム）
- `src/lib/supabase/{client,server,admin,middleware}.ts` … 接続（すべて schema:'kikou'）

## 検証コマンド
- 単体テスト（将棋表記）：`npm test`（= `vitest run`）
- 型チェック：`npx tsc --noEmit`
- ビルド：`npm run build`
- RLS安全テスト：`PYTHONUTF8=1 python scripts/verify-rls.py`
- ローカル起動：`npm run dev` → http://localhost:3000
- 再公開：`git push`（自動）または `vercel deploy --prod --yes`

## リアルタイムの要点（はまりどころ）
- `db:{schema:'kikou'}` は PostgREST 用。Realtime は別物なので `.on('postgres_changes', { schema:'kikou', table:'comments', ... })` で**スキーマ名を明示**する（実装済み）。
- DB側は `grant select` ＋ `alter publication supabase_realtime add table kikou.comments`（適用済み）。

## フェーズ（残り）
- Phase 1：棋譜インポート（KIF/KI2/CSA・`json-kifu-format` 導入済み）／手順再生／画像注釈／盤バリデーション強化
- Phase 2：閲覧専用リンク／コメント通知（メール・プッシュ）／編集履歴（版差分）／全文検索
