// Dark and light mode. The first paint is handled by a tiny script in index.html,
// which reads the saved choice before React loads. Dark is the default.
import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const KEY = 'ucf-theme'

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark')
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(KEY, next) } catch { /* private window: the choice lasts for this visit only */ }
    setTheme(next)
  }
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button type="button" onClick={flip} className={className} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <Icon className="h-4 w-4" />
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
