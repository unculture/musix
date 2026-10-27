import { useEffect } from 'react'
import './styles/theme.css'
import './styles/app.css'
import { IconButton } from './components/BigButton'
import { StepBar } from './components/StepBar'
import { Toasts } from './components/Toasts'
import { Tour } from './components/Tour'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { HumScreen } from './screens/HumScreen'
import { PlayScreen } from './screens/PlayScreen'
import { MakeScreen } from './screens/MakeScreen'
import { StyleScreen } from './screens/StyleScreen'
import { WordsScreen } from './screens/WordsScreen'
import { useNav, type Screen } from './state/nav'
import { usePrefs } from './state/prefs'
import { useProject } from './state/project'
import { toast } from './state/toast'

const SCREENS: Record<Screen, () => React.JSX.Element> = {
  home: HomeScreen,
  settings: SettingsScreen,
  words: WordsScreen,
  style: StyleScreen,
  hum: HumScreen,
  make: MakeScreen,
  play: PlayScreen
}

export default function App(): React.JSX.Element {
  const { screen, go } = useNav()
  const project = useProject((s) => s.project)
  const close = useProject((s) => s.close)
  const { undo, redo, past, future } = useProject()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const typing = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement
      if (typing || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])
  const font = usePrefs((s) => s.font)
  const inSong = screen !== 'home' && screen !== 'settings' && project !== null
  // Song steps need an open song; fall back to home if there isn't one.
  const Current = SCREENS[screen !== 'home' && screen !== 'settings' && !project ? 'home' : screen]

  useEffect(() => {
    document.documentElement.dataset.font = font
  }, [font])

  useEffect(
    () =>
      window.musix.updates.onReady(() =>
        toast('Musix has a new surprise! You will see it next time you open the app.', '🎁')
      ),
    []
  )

  return (
    <div className="app">
      <header className="top-bar">
        <button
          type="button"
          className="logo"
          onClick={async () => {
            await close()
            go('home')
          }}
          aria-label="Home"
        >
          <span className="logo__notes" aria-hidden>
            🎵
          </span>
          Musix
        </button>
        <div className="top-bar__spacer" />
        {inSong && <StepBar />}
        <div className="top-bar__spacer" />
        {inSong && (
          <>
            <IconButton icon="↩️" label="Undo" onClick={undo} disabled={!past.length} />
            <IconButton icon="↪️" label="Redo" onClick={redo} disabled={!future.length} />
          </>
        )}
        <IconButton
          icon="⚙️"
          label="Settings"
          onClick={() => go('settings')}
          active={screen === 'settings'}
        />
      </header>
      <main className="main">
        <Current />
      </main>
      <Tour />
      <Toasts />
    </div>
  )
}
