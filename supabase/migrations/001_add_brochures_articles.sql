-- ============================================================
-- Migration: コンテンツ管理拡張（パンフレット・記事テーブル追加）
-- ============================================================

-- 1. videos テーブルに is_published カラムを追加
--    既存動画はすべて公開中として扱うため DEFAULT true
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- 2. brochures（パンフレット）テーブルを作成
CREATE TABLE IF NOT EXISTS brochures (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  file_url      TEXT,
  thumbnail_url TEXT,
  available_phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. articles（記事）テーブルを作成
CREATE TABLE IF NOT EXISTS articles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  content_url   TEXT,
  thumbnail_url TEXT,
  available_phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS（Row Level Security）を有効化
ALTER TABLE brochures ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles  ENABLE ROW LEVEL SECURITY;

-- 5. RLS ポリシー（全操作を許可）
--    ※ 本番環境では認証済みユーザーのみに制限することを推奨
CREATE POLICY "Allow all on brochures" ON brochures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on articles"  ON articles  FOR ALL USING (true) WITH CHECK (true);
