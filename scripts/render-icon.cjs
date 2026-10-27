// Renders build/icon.svg to build/icon.png (1024×1024) using Electron.
// Run with: npx electron scripts/render-icon.cjs
const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

app.whenReady().then(async () => {
  const svg = readFileSync(join(__dirname, '..', 'build', 'icon.svg'), 'utf8')
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, useContentSize: true })
  await win.loadURL(`data:text/html,<style>html,body{margin:0;background:transparent}svg{display:block}</style>${encodeURIComponent(svg)}`)
  const image = await win.webContents.capturePage()
  writeFileSync(join(__dirname, '..', 'build', 'icon.png'), image.resize({ width: 1024, height: 1024 }).toPNG())
  app.quit()
})
