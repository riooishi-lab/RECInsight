-- ============================================================
-- Migration: videos テーブルにサムネイルURLカラムを追加
-- ============================================================

-- videos テーブルに thumbnail_url カラムを追加
-- 既存動画は NULL（YouTubeサムネイルへの自動フォールバックを維持）
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
