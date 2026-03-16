-- 企業テーブル
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 管理者ユーザーテーブル（Supabase Authと連携）
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('master', 'company')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- マスター管理者を初期データとして投入
INSERT INTO public.admin_users (email, role)
VALUES ('rio.oishi@randd-inc.com', 'master')
ON CONFLICT (email) DO NOTHING;

-- ステップ設定をDBに保存するテーブル（StudentPortal参照用）
CREATE TABLE IF NOT EXISTS public.company_step_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{"enabled":true,"steps":[]}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 既存テーブルに company_id カラムを追加
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.brochures
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.watch_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 新テーブルにRLSを設定（アプリレベルのセキュリティ + 全操作許可）
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_step_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.company_step_settings FOR ALL USING (true) WITH CHECK (true);
