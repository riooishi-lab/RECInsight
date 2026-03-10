-- ============================================================
-- Migration 005: videos.available_phases に DEFAULT '{}' を追加
-- ============================================================
-- 背景:
--   available_phases カラムが NOT NULL にも関わらず DEFAULT 値がないため、
--   コード側で値を省略した insert が 400 エラーになっていた。
--   DEFAULT '{}' を設定することで、値を省略した場合も空配列が使われる。

ALTER TABLE videos
  ALTER COLUMN available_phases SET DEFAULT '{}';
