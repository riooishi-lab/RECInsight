import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error(
        '【重要】Supabaseの環境変数が設定されていません。\n' +
        'プロジェクト直下に .env ファイルを作成し、VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。\n' +
        '詳細は walkthrough.md を参照してください。'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = () => {
    return (
        import.meta.env.VITE_SUPABASE_URL &&
        import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
        import.meta.env.VITE_SUPABASE_ANON_KEY &&
        import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder'
    )
}

// ─────────────────────────────────────────────
// データベース型定義
// ─────────────────────────────────────────────

export type Phase = '認知' | '興味' | '応募' | '選定' | '内定' | '承諾'
export type StepId = 'STEP1' | 'STEP2' | 'STEP3'

export interface Company {
    id: string
    name: string
    created_at: string
}

export interface AdminUser {
    id: string
    email: string
    role: 'master' | 'company'
    company_id: string | null
    company?: Company
    created_at: string
}

export interface Student {
    id: string
    name: string
    email: string
    university: string | null
    department: string | null
    phase: Phase
    token: string
    company_id: string | null
    created_at: string
}

export interface Video {
    id: string
    title: string
    description: string | null
    category: string | null
    subcategory: string | null
    duration_sec: number | null
    video_url: string | null
    thumbnail_url: string | null
    available_phases: Phase[] | null
    is_published: boolean
    is_pinned: boolean
    company_id: string | null
    created_at: string
}

export interface Brochure {
    id: string
    title: string
    description: string | null
    category: string | null
    file_url: string | null
    thumbnail_url: string | null
    available_phases: string[] | null
    is_published: boolean
    company_id: string | null
    created_at: string
}

export interface Article {
    id: string
    title: string
    description: string | null
    category: string | null
    content_url: string | null
    thumbnail_url: string | null
    available_phases: string[] | null
    is_published: boolean
    company_id: string | null
    created_at: string
}

export type WatchEventType = 'play' | 'pause' | 'seek' | 'ended' | 'heartbeat'

export interface WatchEvent {
    id: string
    student_id: string
    video_id: string
    event_type: WatchEventType
    position_sec: number | null
    session_id: string | null
    company_id: string | null
    created_at: string
}

export interface PhaseRecord {
    id: string
    name: string
    order_no: number | null
    color: string
}
