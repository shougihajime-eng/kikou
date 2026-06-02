#!/usr/bin/env python3
# kikou スキーマの RLS を実ユーザーJWTで検証する。ローカル専用（鍵を直書き）。
import json, urllib.request, urllib.error, sys

REF = "eqkaaohdbqefuszxwqzr"
BASE = f"https://{REF}.supabase.co"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxa2Fhb2hkYnFlZnVzenh3cXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDg4NjcsImV4cCI6MjA5MzAyNDg2N30.91ypwWiV3jLKh0OL2NOQsRBXf3PfFAiR1kHbHlxYLA8"
SR = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxa2Fhb2hkYnFlZnVzenh3cXpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ0ODg2NywiZXhwIjoyMDkzMDI0ODY3fQ.ucqJdhoFlnD-PiJmX46Gv3EWLQD3GFwE9O0mv1mQ7G0"

def req(method, url, headers, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r)
        txt = resp.read().decode()
        return resp.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: body = json.loads(txt)
        except: body = txt
        return e.code, body

def admin_h():
    return {"apikey": SR, "Authorization": f"Bearer {SR}", "Content-Type": "application/json"}

def user_h(token, write=False):
    h = {"apikey": ANON, "Authorization": f"Bearer {token}", "Content-Type": "application/json",
         "Accept-Profile": "kikou"}
    if write: h["Content-Profile"] = "kikou"
    return h

def sr_db_h(write=False):
    h = {"apikey": SR, "Authorization": f"Bearer {SR}", "Content-Type": "application/json",
         "Accept-Profile": "kikou", "Prefer": "return=representation"}
    if write: h["Content-Profile"] = "kikou"
    return h

PASS, FAIL = 0, 0
def check(name, cond, detail=""):
    global PASS, FAIL
    if cond: PASS += 1; print(f"  ✓ {name}")
    else: FAIL += 1; print(f"  ✗ {name}  {detail}")

# --- テストユーザー準備（既存は削除して作り直す） ---
emails = {"author":"kikou-rls-author@example.com","editor":"kikou-rls-editor@example.com","outsider":"kikou-rls-outsider@example.com"}
st, users = req("GET", f"{BASE}/auth/v1/admin/users?per_page=200", admin_h())
existing = {u["email"]: u["id"] for u in (users.get("users", []) if isinstance(users, dict) else [])}
for e in emails.values():
    if e in existing:
        req("DELETE", f"{BASE}/auth/v1/admin/users/{existing[e]}", admin_h())

ids, tokens = {}, {}
for role, e in emails.items():
    st, u = req("POST", f"{BASE}/auth/v1/admin/users", admin_h(),
                {"email": e, "password": "test-pass-123", "email_confirm": True,
                 "user_metadata": {"display_name": f"テスト{role}"}})
    ids[role] = u["id"]
    st, tok = req("POST", f"{BASE}/auth/v1/token?grant_type=password",
                  {"apikey": ANON, "Content-Type": "application/json"},
                  {"email": e, "password": "test-pass-123"})
    tokens[role] = tok["access_token"]
print("users ready:", list(ids.keys()))

# --- service_role でプロジェクト土台を作る（アプリの作成フローと同じ） ---
st, proj = req("POST", f"{BASE}/rest/v1/projects", sr_db_h(True), {"title":"RLSテスト本","owner_id":ids["author"]})
pid = proj[0]["id"]
req("POST", f"{BASE}/rest/v1/project_members", sr_db_h(True), {"project_id":pid,"user_id":ids["author"],"role":"author"})
req("POST", f"{BASE}/rest/v1/project_members", sr_db_h(True), {"project_id":pid,"user_id":ids["editor"],"role":"editor"})
for r in ("author","editor"):
    req("POST", f"{BASE}/rest/v1/profiles", sr_db_h(True), {"id":ids[r],"display_name":f"テスト{r}"})
st, ch = req("POST", f"{BASE}/rest/v1/chapters", sr_db_h(True), {"project_id":pid,"title":"章","sort_order":0})
cid = ch[0]["id"]
st, pos = req("POST", f"{BASE}/rest/v1/positions", sr_db_h(True), {"chapter_id":cid,"title":"図1","sort_order":0})
posid = pos[0]["id"]
print("project scaffold ready")

print("\n[READ 分離]")
st, d = req("GET", f"{BASE}/rest/v1/projects?select=id&id=eq.{pid}", user_h(tokens["author"]))
check("著者は自分の本を読める", st==200 and len(d)==1, f"{st} {d}")
st, d = req("GET", f"{BASE}/rest/v1/projects?select=id&id=eq.{pid}", user_h(tokens["editor"]))
check("編集者も本を読める", st==200 and len(d)==1, f"{st} {d}")
st, d = req("GET", f"{BASE}/rest/v1/projects?select=id&id=eq.{pid}", user_h(tokens["outsider"]))
check("部外者は本を読めない（0件）", st==200 and len(d)==0, f"{st} {d}")
st, d = req("GET", f"{BASE}/rest/v1/positions?select=id&id=eq.{posid}", user_h(tokens["outsider"]))
check("部外者は局面を読めない（0件）", st==200 and len(d)==0, f"{st} {d}")

print("\n[WRITE 著者のみ]")
st, d = req("POST", f"{BASE}/rest/v1/chapters", user_h(tokens["author"], True), {"project_id":pid,"title":"著者の章","sort_order":1})
check("著者は章を追加できる", st in (200,201), f"{st} {d}")
st, d = req("PATCH", f"{BASE}/rest/v1/positions?id=eq.{posid}", user_h(tokens["author"], True), {"description":"著者の解説"})
check("著者は局面(解説)を更新できる", st in (200,204), f"{st} {d}")

st, d = req("POST", f"{BASE}/rest/v1/chapters", user_h(tokens["editor"], True), {"project_id":pid,"title":"編集者の章","sort_order":2})
ed_blocked = (st in (401,403)) or (st in (200,201) and (d==[] or d is None))
check("編集者は章を追加できない（RLS拒否）", ed_blocked, f"{st} {d}")
st, d = req("PATCH", f"{BASE}/rest/v1/positions?id=eq.{posid}", user_h(tokens["editor"], True), {"description":"編集者が改ざん"})
# 確認: 実際に書き換わっていないこと
st2, after = req("GET", f"{BASE}/rest/v1/positions?select=description&id=eq.{posid}", sr_db_h())
check("編集者は局面を編集できない（中身が変わらない）", after[0]["description"]=="著者の解説", f"patch:{st} now:{after}")

print("\n[COMMENT 双方可]")
st, d = req("POST", f"{BASE}/rest/v1/comments", user_h(tokens["editor"], True),
            {"position_id":posid,"author_id":ids["editor"],"body":"編集者コメント"})
check("編集者はコメントできる", st in (200,201), f"{st} {d}")
st, d = req("POST", f"{BASE}/rest/v1/comments", user_h(tokens["author"], True),
            {"position_id":posid,"author_id":ids["author"],"body":"著者の返信"})
check("著者もコメントできる", st in (200,201), f"{st} {d}")
st, d = req("GET", f"{BASE}/rest/v1/comments?select=body&position_id=eq.{posid}", user_h(tokens["author"]))
check("著者は編集者のコメントが読める", st==200 and any(c["body"]=="編集者コメント" for c in d), f"{st} {d}")
st, d = req("POST", f"{BASE}/rest/v1/comments", user_h(tokens["outsider"], True),
            {"position_id":posid,"author_id":ids["outsider"],"body":"部外者"})
out_blocked = (st in (401,403)) or (st in (200,201) and (d==[] or d is None))
check("部外者はコメントできない", out_blocked, f"{st} {d}")

print("\n[改ざん防止（強化）]")
st, cs = req("GET", f"{BASE}/rest/v1/comments?select=id,body,resolved&position_id=eq.{posid}", sr_db_h())
edc = next((c for c in cs if c["body"] == "編集者コメント"), None)
if edc:
    # 著者が編集者コメントの本文を書き換え → 不変であること
    req("PATCH", f"{BASE}/rest/v1/comments?id=eq.{edc['id']}", user_h(tokens["author"], True), {"body":"著者が改ざん"})
    st, after = req("GET", f"{BASE}/rest/v1/comments?select=body&id=eq.{edc['id']}", sr_db_h())
    check("著者は編集者コメントの本文を変えられない", after[0]["body"]=="編集者コメント", f"{after}")
    # 著者が編集者コメントを解決 → 成功
    req("PATCH", f"{BASE}/rest/v1/comments?id=eq.{edc['id']}", user_h(tokens["author"], True), {"resolved":True})
    st, after = req("GET", f"{BASE}/rest/v1/comments?select=resolved&id=eq.{edc['id']}", sr_db_h())
    check("著者は編集者コメントを『解決』にできる", after[0]["resolved"] is True, f"{after}")
# owner_id 改ざん → 不変であること
req("PATCH", f"{BASE}/rest/v1/projects?id=eq.{pid}", user_h(tokens["author"], True), {"owner_id":ids["editor"]})
st, after = req("GET", f"{BASE}/rest/v1/projects?select=owner_id&id=eq.{pid}", sr_db_h())
check("プロジェクトの owner_id は変更できない", after[0]["owner_id"]==ids["author"], f"{after}")

# --- 後片付け ---
req("DELETE", f"{BASE}/rest/v1/projects?id=eq.{pid}", sr_db_h(True))
for role in ids:
    req("DELETE", f"{BASE}/rest/v1/profiles?id=eq.{ids[role]}", sr_db_h(True))
    req("DELETE", f"{BASE}/auth/v1/admin/users/{ids[role]}", admin_h())

print(f"\n=== {PASS} passed / {FAIL} failed ===")
sys.exit(1 if FAIL else 0)
