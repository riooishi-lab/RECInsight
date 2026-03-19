-- ============================================================
-- Migration: 学生トークンに有効期限を追加
-- デフォルト90日（既存レコードも自動適用）
-- ============================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days');

-- 既存の NULL レコードにも有効期限を設定
UPDATE public.students
  SET token_expires_at = created_at + interval '90 days'
  WHERE token_expires_at IS NULL;

-- token_expires_at を NOT NULL に変更
ALTER TABLE public.students
  ALTER COLUMN token_expires_at SET NOT NULL;
