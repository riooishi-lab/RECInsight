import { createContext, useContext, useEffect, useState } from 'react'
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

    const fetchAdminUser = async (email: string) => {
        setLoading(true)
        const { data } = await supabase
            .from('admin_users')
            .select('*, company:companies(*)')
            .eq('email', email)
        // 複数レコードがある場合はmaster優先
        const records = data || []
        const user = records.find(u => u.role === 'master') || records[0] || null
        setAdminUser(user)
        setLoading(false)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user?.email) {
                fetchAdminUser(session.user.email)
            } else {
                setLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session?.user?.email) {
                fetchAdminUser(session.user.email)
            } else {
                setAdminUser(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

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
            .single()
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
