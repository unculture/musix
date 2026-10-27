# Releasing Musix

## Make a release

1. Bump `version` in `package.json` (e.g. `0.2.0`) and merge to `main`.
2. Tag and push:
   ```sh
   git tag v0.2.0 && git push origin v0.2.0
   ```
3. The **Release** workflow builds installers on macOS and Windows and publishes a GitHub release:
   - macOS: `Musix-<version>-universal.dmg` (+ `.zip` used by the updater)
   - Windows: `Musix-Setup-<version>.exe` (x64 + arm64)

## Auto-update

Installed copies check for a new release on start-up and every 4 hours, download it quietly, and
install it the next time Musix is closed. A grown-up can also press _Restart to update_ in
Settings → Grown-up settings.

Two things need a decision before this works everywhere:

### 1. The repository is private

`electron-updater` reads `latest.yml` / `latest-mac.yml` from GitHub Releases. For a private repo
that needs a token baked into the app, which isn't a good idea. Pick one:

- **Make `unculture/musix` public** — simplest; nothing else to change.
- **Publish releases to a separate public repo** (e.g. `unculture/musix-releases`): create it, add a
  repo secret `RELEASES_TOKEN` (a fine-grained PAT with _Contents: read & write_ on that repo), then
  change `publish.repo` in `electron-builder.yml` to `musix-releases` and `GH_TOKEN` in
  `.github/workflows/release.yml` to `${{ secrets.RELEASES_TOKEN }}`.

Until then, installers still appear on the (private) releases page for you to download manually.

### 2. macOS signing

macOS only auto-updates **signed** apps. Without signing the app still runs (first launch:
right-click → _Open_), it just won't update itself. To sign and notarise, join the Apple Developer
Program, export a _Developer ID Application_ certificate as a `.p12`, and add these repo secrets:

| Secret                        | Value                                                 |
| ----------------------------- | ----------------------------------------------------- |
| `MAC_CERTIFICATE`             | base64 of the `.p12` (`base64 -i cert.p12 \| pbcopy`) |
| `MAC_CERTIFICATE_PASSWORD`    | its password                                          |
| `APPLE_ID`                    | Apple ID email                                        |
| `APPLE_APP_SPECIFIC_PASSWORD` | from appleid.apple.com                                |
| `APPLE_TEAM_ID`               | your team id                                          |

Then add `notarize: true` under `mac:` in `electron-builder.yml`.

Windows installers are unsigned; SmartScreen shows a "More info → Run anyway" warning the first time.

## Build locally

```sh
npm run dist:mac   # or dist:win
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dir --arm64   # quick unsigned app in dist/
```
