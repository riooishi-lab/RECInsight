-- サーベイ設問テーブル
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  genre TEXT NOT NULL CHECK (genre IN ('目標の魅力', '人材の魅力', '活動の魅力', '条件の魅力')),
  order_no INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- サーベイ回答テーブル（学生が各設問に1〜5点で回答）
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (question_id, student_id)
);

-- RLS設定（アプリレベルのセキュリティ）
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.survey_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.survey_responses FOR ALL USING (true) WITH CHECK (true);
