-- マスター管理者レコードを確実に master ロールで設定
-- 009_multi_tenancy.sql の ON CONFLICT DO NOTHING により、
-- 同メールに company ロールのレコードが既存だった場合に master が挿入されなかったことへの修正
INSERT INTO public.admin_users (email, role)
VALUES ('rio.oishi@randd-inc.com', 'master')
ON CONFLICT (email) DO UPDATE SET role = 'master';
