import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { AdminUser } from '../../lib/supabase'

interface AuthContextType {
    session: Session | null
    adminUser: AdminUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)

    // レースコンディション防止: 最新のリクエストIDのみ結果を適用
    const fetchIdRef = useRef(0)

    const fetchAdminUser = useCallback(async (email: string) => {
        const currentFetchId = ++fetchIdRef.current
        setLoading(true)
        const { data, error } = await supabase
            .from('admin_users')
            .select('*, company:companies(*)')
            .eq('email', email)

        // 古いリクエストの結果は無視
        if (currentFetchId !== fetchIdRef.current) return

        if (error) {
            console.error('[AuthContext] admin_users fetch error')
            setAdminUser(null)
            setLoading(false)
            return
        }
        // 複数レコードがある場合はmaster優先
        const records = data || []
        const user = records.find(u => u.role === 'master') || records[0] || null
        setAdminUser(user)
        setLoading(false)
    }, [])

    useEffect(() => {
        // getSession() で初期セッションを即時取得（loading を素早く解決）
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user?.email) {
                fetchAdminUser(session.user.email)
            } else {
                setLoading(false)
            }
        })

        // INITIAL_SESSION は getSession() で処理済みのためスキップ
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'INITIAL_SESSION') return
            setSession(session)
            if (session?.user?.email) {
                fetchAdminUser(session.user.email)
            } else {
                setAdminUser(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [fetchAdminUser])

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message }
        return { error: null }
    }

    const signUp = async (email: string, password: string) => {
        // admin_users テーブルに登録されているメールか確認
        const { data: adminRecord } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', email)
            .maybeSingle()
        if (!adminRecord) {
            return { error: 'このメールアドレスは管理者として登録されていません' }
        }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) return { error: error.message }
        // 登録後すぐにサインイン
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) return { error: '登録しました。メール確認後にログインしてください。' }
        return { error: null }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ session, adminUser, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
