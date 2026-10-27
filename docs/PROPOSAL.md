# Musix — Architecture Proposal

## Who it's for

An 11-year-old, dyslexic, very creative songwriter (supervised by a parent). That drives everything:

- **Icons and colour first, words second.** Every button has a big icon; text is short.
- **Everything can be read aloud** (speaker button / hover-to-hear) and **everything can be spoken** (mic button wherever there is a text box).
- **Lexend** as the default font (designed to improve reading fluency), with an **OpenDyslexic** option. Cream background, no italics, no ALL CAPS, generous spacing, left-aligned text.
- **Big targets, few choices per screen,** a clear step-by-step journey, and undo everywhere.
- **No "errors"** — friendly, encouraging messages ("Hmm, the music robot needs a moment — try again?").
- Playful: colour, animation, confetti when a song is finished.

## The journey

```
 🏠 My Songs  →  ✏️ Words  →  🎨 Style  →  🎤 Hum (optional)  →  ✨ Make it  →  🎛️ Play & Edit  →  💾 Export MP3
```

1. **My Songs** — a gallery of song cards. Make a new one or open an old one.
2. **Words** — type or dictate lyrics. Lyrics are split into lines and grouped into Verse / Chorus blocks she can drag about.
3. **Style** — pick from picture cards (Pop, Rock, Disco, Lullaby, Hip-hop, Country, Electronic, Fairy-tale…) or describe it in her own words, by voice or typing. Pick a mood (happy, sad, epic, chill) and a speed (🐢 ↔ 🐇).
4. **Hum** — optional: hum or sing a tune; we turn it into notes and use it as the melody.
5. **Make it** — the app generates the song.
6. **Play & Edit** — karaoke-style playback with the words lighting up; she can change the track and sing along.
7. **Export** — an MP3 to play anywhere; save/share the project file.

## Technology

| Area           | Choice                                                                                            | Why                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| App shell      | **Electron** + electron-vite + React + TypeScript                                                 | Mature, best Web Audio support, mac + Windows, easy auto-update. Installer size isn't a concern.            |
| Auto-update    | **electron-updater** + GitHub Releases, built by GitHub Actions on macOS & Windows runners        | Standard, free. See "Things only a human can do".                                                           |
| AI gateway     | **OpenRouter** (parent's key), all calls from the Electron main process                           | One key for every model; the key never reaches the UI; stored encrypted with Electron `safeStorage`.        |
| Speech-to-text | Gemini Flash (audio input) via OpenRouter                                                         | Accurate on kids' voices and song lyrics, no local model download. Can swap to local Whisper later.         |
| Hum → melody   | Spotify **Basic Pitch** (`@spotify/basic-pitch`, runs locally)                                    | Turns a hummed recording into notes; we quantise to the song's tempo and key.                               |
| Song planning  | Gemini Flash with **structured output** → a `SongPlan` JSON                                       | The AI "composer": tempo, key, sections, chords, instruments, drum style and a melody fitted to the lyrics. |
| Editable track | **Tone.js** rendering the `SongPlan` (drums, bass, chords, guide melody) with sampled instruments | Every part is data, so it's fully editable and re-renderable.                                               |
| AI audio track | **Google Lyria 3** via OpenRouter (audio output)                                                  | Studio-quality backing track generated from the same plan (style, tempo, key, structure, lyrics).           |
| Export         | Offline render (Tone.Offline) → WAV → MP3 (lamejs)                                                | No external binaries.                                                                                       |
| Projects       | `.musix` file (zip: `project.json` + audio recordings), autosaved to `Documents/Musix`            | Save, re-open, export/import, back up.                                                                      |

### "A mixture of both" — the two kinds of track

- **Build mode (editable):** the AI writes a `SongPlan`; our engine plays it. She can change instruments, chords, sections, tempo, melody notes, volumes. Everything re-renders instantly.
- **Magic mode (AI audio):** Lyria turns the same plan into a polished recording. It's audio, so editing is coarser: trim, reorder sections, volume, regenerate ("try another version").
- **Layering:** the two mix together — e.g. a Lyria backing track plus the editable guide melody (so she knows what to sing) plus her own recorded vocals. Each layer has a volume slider and a mute button.

### Core data model (sketch)

```ts
Project { id, title, cover, createdAt, updatedAt, lyrics: LyricSection[], style: StyleChoice,
          hum?: HumTake, plan?: SongPlan, aiTracks: AudioLayer[], vocals: AudioLayer[], mix: Mix }
SongPlan { bpm, key, scale, timeSignature, sections: Section[], instruments: InstrumentChoice[], drumStyle }
Section { id, kind: 'intro'|'verse'|'chorus'|'bridge'|'outro', bars, chords: Chord[], lyricLineIds, melody: Note[] }
```

### Process architecture

- **Main process:** OpenRouter client, key storage, file system (projects, export), auto-updater.
- **Preload:** a small typed `window.musix` API (contextIsolation on, no Node in the renderer).
- **Renderer:** React UI, audio engine (Tone.js), recording (MediaRecorder), Basic Pitch.

## Delivery plan (tickets on the project board)

**P0 — the core loop (words → song → MP3)**

1. Scaffold: Electron + Vite + React + TS, lint, tests, CI build
2. Kid-friendly design system & app shell (fonts, colours, read-aloud, step navigation)
3. Parent settings & OpenRouter client (encrypted key)
4. Project data model, autosave & My Songs gallery
5. Words step: type & dictate lyrics
6. Style step: style cards, mood, speed, describe-it
7. AI composer: generate a `SongPlan`
8. Audio engine: play the `SongPlan` with karaoke lyrics
9. Export MP3

**P1 — creativity & polish** 10. Hum a tune → melody 11. Track editor (sections, instruments, tempo, mixer, undo) 12. Magic mode: Lyria AI backing track + layering 13. Record vocals over the track 14. Packaging, releases & auto-update 15. Save/open/import `.musix` project files

**P2 — later** 16. Melody editor (simple piano roll) 17. Lyric helper (rhymes, "what comes next?") & cover art 18. Guided first-run tour with voice 19. Accounts & cloud sync

## Things only a human can do

- **OpenRouter key** — entered in the app's parent settings (never committed).
- **Auto-update + a private repo:** electron-updater can't read releases from a private repo without embedding a token. Options: make `musix` public, or publish releases to a separate public repo (e.g. `unculture/musix-releases`).
- **macOS code signing:** auto-update on macOS requires a signed app (Apple Developer account, $99/yr). Without it the app still runs (right-click → Open) but won't auto-update on Mac. Windows works unsigned (with a SmartScreen warning).
