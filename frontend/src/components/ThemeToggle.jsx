import useTheme from '../hooks/useTheme'

export default function ThemeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-surface-container border border-outline-variant shadow-modal flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200 active:scale-90"
    >
      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {dark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
