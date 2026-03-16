import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { AdminUser } from '../../lib/supabase'

interface AuthContextType {
    session: Session | null
    adminUser: AdminUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchAdminUser = async (email: string) => {
        const { data } = await supabase
            .from('admin_users')
            .select('*, company:companies(*)')
            .eq('email', email)
            .single()
        setAdminUser(data || null)
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

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ session, adminUser, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
