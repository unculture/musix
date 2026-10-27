import { useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { ParentGate } from '@/components/ParentGate'
import { ParentPanel } from '@/components/ParentPanel'
import { Say } from '@/components/Speakable'
import { useNav } from '@/state/nav'
import { usePrefs } from '@/state/prefs'

export function SettingsScreen(): React.JSX.Element {
  const go = useNav((s) => s.go)
  const { font, setFont, readOnHover, setReadOnHover } = usePrefs()
  const [parent, setParent] = useState(false)
  return (
    <div className="settings">
      <h1>⚙️ Settings</h1>
      <div className="card setting-row">
        <Say text="Letters" />
        <div className="choice-group">
          <button
            type="button"
            className={`choice${font === 'lexend' ? ' choice--on' : ''}`}
            style={{ fontFamily: 'Lexend' }}
            onClick={() => setFont('lexend')}
          >
            Aa Bb
          </button>
          <button
            type="button"
            className={`choice${font === 'dyslexic' ? ' choice--on' : ''}`}
            style={{ fontFamily: 'OpenDyslexic' }}
            onClick={() => setFont('dyslexic')}
          >
            Aa Bb
          </button>
        </div>
      </div>
      <div className="card setting-row">
        <Say text="Read out loud when I point at things" />
        <div className="choice-group">
          <button
            type="button"
            className={`choice${readOnHover ? ' choice--on' : ''}`}
            onClick={() => setReadOnHover(true)}
          >
            👍 Yes
          </button>
          <button
            type="button"
            className={`choice${!readOnHover ? ' choice--on' : ''}`}
            onClick={() => setReadOnHover(false)}
          >
            🤫 No
          </button>
        </div>
      </div>
      {parent ? <ParentPanel /> : <ParentGate onPass={() => setParent(true)} />}
      <div>
        <BigButton icon="🏠" label="Done" color="var(--leaf)" onClick={() => go('home')} />
      </div>
    </div>
  )
}
