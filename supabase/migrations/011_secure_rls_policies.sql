-- ============================================================
-- Migration: RLS ポリシーをセキュアに修正
-- 全テーブルの allow_all ポリシーを削除し、
-- 認証済みユーザー + company_id ベースのポリシーに置き換える
-- ============================================================

-- ─── 既存の allow_all ポリシーを削除 ───
DROP POLICY IF EXISTS "allow_all" ON public.companies;
DROP POLICY IF EXISTS "allow_all" ON public.admin_users;
DROP POLICY IF EXISTS "allow_all" ON public.company_step_settings;
DROP POLICY IF EXISTS "Allow all on brochures" ON public.brochures;
DROP POLICY IF EXISTS "Allow all on articles" ON public.articles;

-- ─── RLS を全テーブルで有効化（未有効の場合） ───
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ヘルパー関数: 現在ログイン中ユーザーの admin_users レコードを取得
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_admin_user()
RETURNS SETOF public.admin_users
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT * FROM public.admin_users
  WHERE email = auth.email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.email() AND role = 'master'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT company_id FROM public.admin_users
  WHERE email = auth.email()
  LIMIT 1;
$$;

-- ============================================================
-- companies テーブル
-- master: 全操作可  |  company: 自社のみ参照
-- ============================================================
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT USING (
    public.is_master()
    OR id = public.my_company_id()
  );

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT WITH CHECK (
    public.is_master()
  );

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE USING (
    public.is_master()
  );

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE USING (
    public.is_master()
  );

-- ============================================================
-- admin_users テーブル
-- master: 全操作可  |  company: 自分のレコードのみ参照
-- ============================================================
CREATE POLICY "admin_users_select" ON public.admin_users
  FOR SELECT USING (
    public.is_master()
    OR email = auth.email()
  );

CREATE POLICY "admin_users_insert" ON public.admin_users
  FOR INSERT WITH CHECK (
    public.is_master()
  );

CREATE POLICY "admin_users_update" ON public.admin_users
  FOR UPDATE USING (
    public.is_master()
  );

CREATE POLICY "admin_users_delete" ON public.admin_users
  FOR DELETE USING (
    public.is_master()
  );

-- ============================================================
-- students テーブル
-- master: 全操作可  |  company: 自社のみ
-- anon: トークンによる自分のレコード参照のみ（StudentPortal用）
-- ============================================================
CREATE POLICY "students_auth_select" ON public.students
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "students_anon_select" ON public.students
  FOR SELECT TO anon USING (true);
  -- トークンベースのフィルタはアプリ層で .eq('token', token) により制御
  -- anon は SELECT のみ許可（INSERT/UPDATE/DELETE 不可）

CREATE POLICY "students_insert" ON public.students
  FOR INSERT WITH CHECK (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "students_update" ON public.students
  FOR UPDATE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "students_delete" ON public.students
  FOR DELETE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

-- ============================================================
-- videos テーブル
-- master: 全操作可  |  company: 自社のみ
-- anon: 公開中のみ参照（StudentPortal用）
-- ============================================================
CREATE POLICY "videos_auth_select" ON public.videos
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "videos_anon_select" ON public.videos
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "videos_insert" ON public.videos
  FOR INSERT WITH CHECK (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "videos_update" ON public.videos
  FOR UPDATE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "videos_delete" ON public.videos
  FOR DELETE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

-- ============================================================
-- brochures テーブル
-- ============================================================
CREATE POLICY "brochures_auth_select" ON public.brochures
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "brochures_anon_select" ON public.brochures
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "brochures_insert" ON public.brochures
  FOR INSERT WITH CHECK (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "brochures_update" ON public.brochures
  FOR UPDATE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "brochures_delete" ON public.brochures
  FOR DELETE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

-- ============================================================
-- articles テーブル
-- ============================================================
CREATE POLICY "articles_auth_select" ON public.articles
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "articles_anon_select" ON public.articles
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "articles_insert" ON public.articles
  FOR INSERT WITH CHECK (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "articles_update" ON public.articles
  FOR UPDATE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "articles_delete" ON public.articles
  FOR DELETE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

-- ============================================================
-- watch_events テーブル
-- master: 全操作可  |  company: 自社のみ
-- anon: INSERT のみ（StudentPortal からの記録用）+ 自社の SELECT
-- ============================================================
CREATE POLICY "watch_events_auth_select" ON public.watch_events
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "watch_events_anon_insert" ON public.watch_events
  FOR INSERT TO anon WITH CHECK (true);
  -- anon は視聴イベントの記録のみ許可

CREATE POLICY "watch_events_insert" ON public.watch_events
  FOR INSERT WITH CHECK (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "watch_events_delete" ON public.watch_events
  FOR DELETE USING (
    public.is_master()
  );

-- ============================================================
-- company_step_settings テーブル
-- master: 全操作可  |  company: 自社のみ
-- anon: 参照のみ（StudentPortal用）
-- ============================================================
CREATE POLICY "step_settings_auth_select" ON public.company_step_settings
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "step_settings_anon_select" ON public.company_step_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "step_settings_insert" ON public.company_step_settings
  FOR INSERT WITH CHECK (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "step_settings_update" ON public.company_step_settings
  FOR UPDATE USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "step_settings_delete" ON public.company_step_settings
  FOR DELETE USING (
    public.is_master()
  );
