import { useEffect, useState } from 'react'
import type { KeyStatus, ModelSettings, PublicSettings } from '@shared/api'

// Plain, grown-up language here — this is for the parent, not the child.
export function ParentPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [models, setModels] = useState<ModelSettings | null>(null)

  useEffect(() => {
    window.musix.settings.get().then((s) => {
      setSettings(s)
      setModels(s.models)
    })
  }, [])

  const test = async (k?: string): Promise<void> => {
    setStatus({ ok: true, message: 'Checking…' })
    setStatus(await window.musix.settings.testKey(k))
  }

  const save = async (): Promise<void> => {
    setSettings(await window.musix.settings.setKey(key))
    setKey('')
    await test()
  }

  if (!settings || !models) return <div className="card">Loading…</div>

  return (
    <div className="card parent-panel">
      <h2>👩‍💻 Grown-up settings</h2>
      <p className="parent-panel__note">
        Musix uses <a href="https://openrouter.ai/keys">OpenRouter</a> for speech-to-text, composing
        and AI music. The key is encrypted on this computer and is never shown to the app&apos;s
        screens.
      </p>
      <div className="parent-panel__row">
        <strong>API key:</strong>{' '}
        {settings.keySource === 'stored'
          ? '✅ saved'
          : settings.keySource === 'env'
            ? '🧪 from environment (dev)'
            : '❌ not set'}
      </div>
      <div className="parent-panel__row">
        <input
          type="password"
          placeholder="sk-or-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button type="button" className="choice" disabled={!key.trim()} onClick={save}>
          Save key
        </button>
        <button
          type="button"
          className="choice"
          disabled={!settings.hasKey && !key.trim()}
          onClick={() => test(key || undefined)}
        >
          Test
        </button>
        {settings.keySource === 'stored' && (
          <button
            type="button"
            className="choice"
            onClick={async () => setSettings(await window.musix.settings.setKey(null))}
          >
            Remove
          </button>
        )}
      </div>
      {status && (
        <div className="parent-panel__row">
          {status.message ??
            (status.ok
              ? `✅ Key works${status.remaining != null ? ` — $${status.remaining.toFixed(2)} credit left` : ''}`
              : '❌')}
        </div>
      )}
      <details>
        <summary>Advanced: AI models</summary>
        {(Object.keys(models) as (keyof ModelSettings)[]).map((name) => (
          <label key={name} className="parent-panel__row">
            <span className="parent-panel__label">{name}</span>
            <input
              type="text"
              value={models[name]}
              onChange={(e) => setModels({ ...models, [name]: e.target.value })}
            />
          </label>
        ))}
        <button
          type="button"
          className="choice"
          onClick={async () => setSettings(await window.musix.settings.setModels(models))}
        >
          Save models
        </button>
      </details>
    </div>
  )
}
