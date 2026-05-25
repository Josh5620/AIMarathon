import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function Landing() {
  const { session, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const gradientRef = useRef(null)
  const cardRef = useRef(null)

  // Animated radial gradient follows mouse
  useEffect(() => {
    function onMouseMove(e) {
      if (!gradientRef.current) return
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      gradientRef.current.style.background =
        `radial-gradient(circle at ${x}% ${y}%, rgba(116,195,101,0.1) 0%, rgba(246,247,237,0) 60%)`
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Fade-in-up on mount
  useEffect(() => {
    if (!cardRef.current) return
    const els = cardRef.current.querySelectorAll('.animate-fade-up')
    els.forEach((el, i) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(20px)'
      el.style.transition = 'all 0.6s cubic-bezier(0.16,1,0.3,1)'
      setTimeout(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }, 100 + i * 150)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-mirage">
      <span className="text-on-primary opacity-75 text-body-lg">Loading…</span>
    </div>
  )

  if (session) return <Navigate to="/recruiter" replace />

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-praxeti-white dark:bg-surface overflow-hidden">
      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle inline />
      </div>

      {/* Animated gradient overlay */}
      <div
        ref={gradientRef}
        className="pointer-events-none absolute inset-0 transition-[background] duration-300"
        aria-hidden="true"
      />

      {/* Card */}
      <main
        ref={cardRef}
        className="relative z-10 w-full max-w-md px-md flex flex-col items-center text-center"
      >
        {/* Logo */}
        <div className="animate-fade-up mb-lg">
          <img src="/logo.png" alt="HireLite" className="w-20 h-20 object-contain mx-auto mb-md" />
          <h1 className="text-[2.5rem] font-bold text-midnight-mirage dark:text-complement tracking-tight" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
            HireLite
          </h1>
          <p className="text-meta font-mono text-on-surface-variant mt-sm tracking-wide">
            Recruiting, simplified.
          </p>
        </div>

        {/* Glass card */}
        <div className="animate-fade-up w-full bg-white/80 dark:bg-surface-container-lowest/90 backdrop-blur-sm border-t-2 border-primary dark:border-complement rounded-none shadow-card p-card-padding pt-xl flex flex-col gap-lg">
          <p className="text-label-sm text-on-surface-variant">How would you like to continue?</p>

          {/* Primary: Google login */}
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-nuit-blanche dark:bg-complement dark:text-midnight-mirage hover:bg-accent-hover font-semibold text-on-primary text-section-head py-4 px-lg rounded-sm transition-all duration-200 active:scale-95"
          >
            <img src="/google.svg" alt="Google" className="w-5 h-5" onError={e => e.target.style.display='none'} />
            Login with Google (Recruiter)
          </button>

          {/* Ghost: candidate */}
          <button
            type="button"
            onClick={() => navigate('/candidate')}
            className="w-full flex items-center justify-center gap-3 bg-transparent border-2 border-mantis dark:border-complement hover:bg-mantis/10 text-midnight-mirage dark:text-midnight-mirage font-semibold text-section-head py-4 px-lg rounded-sm transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            Continue as Guest (Candidate)
          </button>
        </div>

        <div className="animate-fade-up mt-lg flex items-center gap-md text-meta text-on-surface-variant">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span className="opacity-30">·</span>
          <span className="opacity-50 cursor-default">Terms of Service</span>
          <span className="opacity-30">·</span>
          <span className="opacity-50 cursor-default">Support</span>
        </div>
      </main>
    </div>
  )
}
