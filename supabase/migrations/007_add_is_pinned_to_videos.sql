-- videos テーブルに is_pinned カラムを追加する
-- ピン留めされた動画は学生ポータルの各カテゴリ内で上部に表示される

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
