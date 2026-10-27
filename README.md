# Musix

A fun, kid-friendly desktop app (macOS + Windows) for turning lyrics into songs.

## The idea

1. **Lyrics** – type them, or dictate them with speech-to-text.
2. **Style** – pick a musical style from a list, or just describe it ("happy pop with ukulele").
3. **Melody** – hum a tune and the app uses it as the basis for the song.
4. **Track** – the app generates a backing track to sing along to.
5. **Edit** – tweak the track (sections, instruments, tempo, etc.).
6. **Export** – save as MP3 to play anywhere.

Built for an 11-year-old: simple, friendly UI, no fiddly menus.

## Links

- Project board: https://github.com/users/unculture/projects/2/views/1
- Architecture proposal: [docs/PROPOSAL.md](docs/PROPOSAL.md)

## Development

Requires Node 22 (`nvm use`).

```sh
npm install
npm run dev        # run the app with hot reload
npm test           # unit tests
npm run lint && npm run typecheck
npm run dist:mac   # or dist:win — build installers into dist/
```
