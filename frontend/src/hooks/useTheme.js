import { useState, useEffect } from 'react'

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('hl-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('hl-theme', 'light')
  }
}

export default function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('hl-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return stored ? stored === 'dark' : prefersDark
  })

  // Sync on mount in case the inline script and React disagree
  useEffect(() => { applyTheme(dark) }, [dark])

  function toggle() {
    const next = !dark
    applyTheme(next)   // apply immediately — no waiting for useEffect
    setDark(next)
  }

  return { dark, toggle }
}
