import { useEffect } from 'react'
import './styles/theme.css'
import './styles/app.css'
import { IconButton } from './components/BigButton'
import { StepBar } from './components/StepBar'
import { Toasts } from './components/Toasts'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { HumScreen, MakeScreen, PlayScreen, StyleScreen, WordsScreen } from './screens/placeholders'
import { useNav, type Screen } from './state/nav'
import { usePrefs } from './state/prefs'
import { useProject } from './state/project'

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
  const font = usePrefs((s) => s.font)
  const inSong = screen !== 'home' && screen !== 'settings' && project !== null
  // Song steps need an open song; fall back to home if there isn't one.
  const Current = SCREENS[screen !== 'home' && screen !== 'settings' && !project ? 'home' : screen]

  useEffect(() => {
    document.documentElement.dataset.font = font
  }, [font])

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
      <Toasts />
    </div>
  )
}
