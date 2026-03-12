-- students テーブルに電話番号カラムを追加
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
