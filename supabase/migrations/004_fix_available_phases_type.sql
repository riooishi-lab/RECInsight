-- ============================================================
-- Migration 004: brochures/articles の available_phases を
--               JSONB → text[] 型に変更（videos テーブルと統一）
-- ============================================================
-- 背景:
--   001 マイグレーションで JSONB 型として作成された available_phases が
--   PostgREST の配列フィルタ構文（cs.{STEP2}）と非互換で 400 エラーが発生。
--   videos テーブルと同じ text[] 型に揃えることで解消する。

ALTER TABLE brochures
  ALTER COLUMN available_phases
  TYPE text[]
  USING ARRAY(SELECT jsonb_array_elements_text(available_phases));

ALTER TABLE brochures
  ALTER COLUMN available_phases SET DEFAULT '{}';

ALTER TABLE articles
  ALTER COLUMN available_phases
  TYPE text[]
  USING ARRAY(SELECT jsonb_array_elements_text(available_phases));

ALTER TABLE articles
  ALTER COLUMN available_phases SET DEFAULT '{}';
