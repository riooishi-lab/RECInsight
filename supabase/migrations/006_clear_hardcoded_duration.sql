-- 以前のハードコード値 300秒(5分) を NULL にリセット。
-- 新規追加・編集時は YouTube IFrame API で実際の長さが自動設定される。
UPDATE videos SET duration_sec = NULL WHERE duration_sec = 300;
