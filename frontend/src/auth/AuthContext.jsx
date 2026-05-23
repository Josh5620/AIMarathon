import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true) // initial session load
  const [approved, setApproved] = useState(null) // null = unknown/checking, true/false once known

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) setApproved(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const email = session?.user?.email ?? null

  // Check the recruiters allowlist whenever the signed-in email changes.
  // RLS guarantees this query can only ever return the user's own row.
  useEffect(() => {
    if (!email) return
    let cancelled = false
    supabase
      .from('recruiters')
      .select('active')
      .eq('email', email.toLowerCase())
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('recruiters allowlist check failed:', error.message)
        setApproved(Boolean(data?.active))
      })
    return () => {
      cancelled = true
    }
  }, [email])

  const signInWithGoogle = useCallback(
    () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/recruiter` },
      }),
    []
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setApproved(null)
  }, [])

  const value = { session, user: session?.user ?? null, email, loading, approved, signInWithGoogle, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
