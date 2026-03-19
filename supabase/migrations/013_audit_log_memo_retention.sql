-- ============================================================
-- Migration: 監査ログ / メモDB化 / データ保持期間 / カスケード削除
-- ============================================================

-- ─── 1. 監査ログテーブル ───
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,              -- 'phase_change', 'student_delete', 'bulk_email', etc.
  target_type TEXT NOT NULL,         -- 'student', 'email', etc.
  target_id TEXT,                    -- 対象レコードのID
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',        -- 変更前後の値など
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

-- 監査ログの挿入は認証済みユーザーのみ
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    auth.email() IS NOT NULL
  );

-- 監査ログは削除不可（改ざん防止）
-- DELETE ポリシーなし = 誰も削除できない

-- ─── 2. メモテーブル（localStorage → DB移行） ───
CREATE TABLE IF NOT EXISTS public.student_memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, author_email)
);

ALTER TABLE public.student_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memos_select" ON public.student_memos
  FOR SELECT USING (
    public.is_master()
    OR company_id = public.my_company_id()
  );

CREATE POLICY "memos_insert" ON public.student_memos
  FOR INSERT WITH CHECK (
    author_email = auth.email()
    AND (public.is_master() OR company_id = public.my_company_id())
  );

CREATE POLICY "memos_update" ON public.student_memos
  FOR UPDATE USING (
    author_email = auth.email()
  );

CREATE POLICY "memos_delete" ON public.student_memos
  FOR DELETE USING (
    author_email = auth.email() OR public.is_master()
  );

-- ─── 3. watch_events のカスケード削除を有効化 ───
-- 学生削除時に視聴イベントも自動削除
ALTER TABLE public.watch_events
  DROP CONSTRAINT IF EXISTS watch_events_student_id_fkey;

-- student_id に外部キー制約がない場合に備えて追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'watch_events_student_id_cascade_fkey'
    AND table_name = 'watch_events'
  ) THEN
    ALTER TABLE public.watch_events
      ADD CONSTRAINT watch_events_student_id_cascade_fkey
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 4. データ保持期間の自動クリーンアップ関数 ───
-- 180日以上経過した watch_events を削除
CREATE OR REPLACE FUNCTION public.cleanup_old_watch_events(retention_days INTEGER DEFAULT 180)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.watch_events
  WHERE created_at < now() - (retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 選考終了した候補者の個人データを完全削除する関数
CREATE OR REPLACE FUNCTION public.purge_student_data(student_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- watch_events は CASCADE で自動削除
  -- student_memos も CASCADE で自動削除
  DELETE FROM public.students WHERE id = student_uuid;
END;
$$;
